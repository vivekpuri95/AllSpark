const API = require('../utils/api');
const auth = require('../utils/auth');
const getRole = (require('./object_roles')).get;
const report = require("./reports/report").list;
const constants = require("../utils/constants");

class Dashboard extends API {

	async list() {

		this.user.privilege.needs("dashboard.list", "ignore");

		const possiblePrivileges = [constants.privilege["dashboard.list"], constants.privilege["dashboard"], constants.privilege["administrator"]];

		let query = `SELECT * FROM tb_dashboards WHERE status = 1 AND account_id = ${this.account.account_id}`;

		if (this.request.body.search) {
			query = query.concat(`
				AND (
					id LIKE ?
					OR name LIKE ?
				)
				LIMIT 10
			`);
		}

		let dashboards = this.mysql.query(query, [`%${this.request.body.text}%`, `%${this.request.body.text}%`]);

		const reportList = new report();

		Object.assign(reportList, this);

		let dashboardQueryList = this.mysql.query(`
			SELECT
				dashboard_id,
				query_id
			from
				tb_query q
			join
				tb_query_visualizations qv
				using(query_id)
			join
				tb_visualization_dashboard vd
				using(visualization_id)
			join
				tb_dashboards d
			on
				d.id = vd.dashboard_id
			where
				d.status = 1
				and q.is_enabled = 1 
				and q.is_deleted = 0
				and q.account_id = ?
			group by 
				dashboard_id,
				query_id
		`,
			[this.account.account_id]);

		let visualizationDashboards = this.mysql.query(`
			SELECT
				vd.*,
				query_id
			FROM
				tb_visualization_dashboard vd
			JOIN
				tb_query_visualizations qv USING(visualization_id)
			JOIN
				tb_dashboards d ON d.id = vd.dashboard_id
			JOIN
				tb_query q USING(query_id)
			WHERE
				d.status = 1 AND
				d.account_id = ? AND
				q.is_enabled = 1 AND
				q.is_deleted = 0
			`,
			[this.account.account_id]
		);

		const dashboardDetails = await Promise.all([
			dashboards,
			visualizationDashboards,
			reportList.list(),
			dashboardQueryList
		]);

		dashboards = dashboardDetails[0];
		visualizationDashboards = dashboardDetails[1];
		const visibleQueryList = new Set(dashboardDetails[2].map(x => x.query_id));
		dashboardQueryList = dashboardDetails[3];

		const objRole = new getRole();

		const dashboardsRolesList = await objRole.get(this.account.account_id, "dashboard", "role", dashboards.length ? dashboards.map(x => x.id) : 0);
		const dashboardUserList = await objRole.get(this.account.account_id, "dashboard", "user", dashboards.length ? dashboards.map(x => x.id) : 0, this.user.user_id);

		const dashboardRolesMapping = {}, dashboardUsersMapping = {};

		for (const dashboardRole of dashboardsRolesList) {

			if (!dashboardRolesMapping[dashboardRole.owner_id]) {

				dashboardRolesMapping[dashboardRole.owner_id] = [];
			}

			dashboardRolesMapping[dashboardRole.owner_id].push([dashboardRole.account_id, dashboardRole.category_id, dashboardRole.target_id]);
		}

		for (const dashboardUser of dashboardUserList) {

			if (!dashboardUsersMapping[dashboardUser.owner_id]) {

				dashboardUsersMapping[dashboardUser.owner_id] = [];
			}

			dashboardUsersMapping[dashboardUser.owner_id].push(dashboardUser);
		}

		const dashboardQueryMapping = {};

		for (const dashboardQuery of dashboardQueryList) {

			if (!dashboardQueryMapping.hasOwnProperty(dashboardQuery.dashboard_id)) {

				dashboardQueryMapping[dashboardQuery.dashboard_id] = new Set;
			}

			dashboardQueryMapping[dashboardQuery.dashboard_id].add(dashboardQuery.query_id);
		}

		const dashboardObject = {}; //{dashboard_id : dashboard}

		for (const dashboard of dashboards) {

			try {
				dashboard.format = JSON.parse(dashboard.format);
			}

			catch (e) {
				dashboard.format = [];
			}

			dashboardObject[dashboard.id] = {...dashboard, visualizations: []}
		}

		for (const queryDashboard of visualizationDashboards) {

			if (!dashboardObject[queryDashboard.dashboard_id]) {

				continue;
			}

			try {
				queryDashboard.format = JSON.parse(queryDashboard.format);
			}

			catch (e) {
				queryDashboard.format = [];
			}

			dashboardObject[queryDashboard.dashboard_id].visualizations.push(queryDashboard);
		}

		for (const d in dashboardObject) {

			dashboardObject[d].href = `/dashboard/${dashboardObject[d].id}`;
			dashboardObject[d].superset = 'Dashboards';
		}

		const result = [];

		const userCategories = this.user.privileges.filter(x => possiblePrivileges.includes(x.privilege_name)).map(x => x.category_id);
		const dashboardUpdateCategories = this.user.privileges.filter(x => [constants.privilege["dashboard.update"], "dashboard", constants.privilege["administrator"]].includes(x.privilege_name)).map(x => x.category_id);
		const dashboardDeleteCategories = this.user.privileges.filter(x => [constants.privilege["dashboard.delete"], "dashboard", constants.privilege["administrator"]].includes(x.privilege_name)).map(x => x.category_id);

		for (const dashboard of Object.values(dashboardObject)) {

			const authResponse = await auth.dashboard({
				userObj: this.user,
				dashboard: dashboard,
				dashboardRoles: dashboardRolesMapping[dashboard.id] || [],
				dashboardUserPrivileges: dashboardUsersMapping[dashboard.id],
				dashboardQueryList: dashboardQueryMapping[dashboard.id] || new Set,
				visibleQueryList: visibleQueryList
			});

			if (authResponse.error) {

				continue;
			}

			dashboard.visibilityReason = authResponse.message;

			const dashboardCategories = (dashboardRolesMapping[dashboard.id] || []).map(x => x[1]);

			for(const categories of dashboardCategories) {

				const updateFlag = dashboardUpdateCategories.some(cat => categories.includes(parseInt(cat))) || this.user.privilege.has('superadmin');
				const deleteFlag = dashboardDeleteCategories.some(cat => categories.includes(parseInt(cat))) || this.user.privilege.has('superadmin');

				dashboard.editable = dashboard.editable || constants.adminCategory.some(x => userCategories.includes(x)) || updateFlag;
				dashboard.deletable = dashboard.deletable || constants.adminCategory.some(x => userCategories.includes(x)) || deleteFlag;
			}

			dashboard.editable = dashboard.editable || dashboard.added_by == this.user.user_id || this.user.privilege.has('superadmin');
			dashboard.deletable = dashboard.deletable || dashboard.added_by == this.user.user_id || this.user.privilege.has('superadmin');

			result.push(dashboard);
		}

		return result.sort((x, y) => x.parent - y.parent || x.order - y.order);
	}

	async insert() {

		this.user.privilege.needs('dashboard.insert', "ignore");

		let
			values = {},
			columns = ['name', 'parent', 'icon', 'roles', 'order', 'format'];

		for (const key in this.request.body) {

			if (columns.includes(key)) {

				values[key] = this.request.body[key] || null;
			}
		}

		values.added_by = this.user.user_id;

		values.account_id = this.account.account_id;

		return await this.mysql.query('INSERT INTO tb_dashboards SET ? ', [values], 'write');
	}

	async update() {

		const objRole = new getRole();

		const categories = (await objRole.get(this.account.account_id, "dashboard", "role", this.request.body.id)).map(x => parseInt(x.category_id));

		let flag = true;

		for (const category of (categories.length ? categories : [0])) {

			flag = flag || this.user.privilege.has('dashboard.update', category);
		}

		this.assert(flag, "user does not have access to update this dashboard");

		const authResponse = await auth.dashboard({dashboard: this.request.body.id, userObj: this.user});

		this.assert(!authResponse.error, authResponse.message);

		const
			values = {},
			columns = ['name', 'parent', 'icon', 'roles', 'type', 'order', 'format'];

		for (const key in this.request.body) {

			if (columns.includes(key))
				values[key] = this.request.body[key] || null;
		}

		try {
			JSON.parse(values.format);
		}
		catch (e) {
			this.assert(false, 'Invalid format!');
		}

		return await this.mysql.query(
			'UPDATE tb_dashboards SET ? WHERE id = ? AND account_id = ?',
			[values, this.request.body.id, this.account.account_id],
			'write'
		);
	}

	async delete() {

		const objRole = new getRole();

		const categories = (await objRole.get(this.account.account_id, "dashboard", "role", this.request.body.id)).map(x => parseInt(x.category_id));

		let flag = true;

		for (const category of (categories.length ? categories : [0])) {

			flag = flag || this.user.privilege.has('dashboard.delete', category);
		}

		this.assert(flag, "user does not have access to update this dashboard");

		const mandatoryData = ["id"];

		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = await auth.dashboard({dashboard: this.request.body.id, userObj: this.user});

		this.assert(!authResponse.error, authResponse.message);

		return await this.mysql.query(
			'UPDATE tb_dashboards SET status = 0 WHERE id = ? AND account_id = ?',
			[this.request.body.id, this.account.account_id],
			'write'
		);
	}
}

exports.list = Dashboard;
exports.insert = Dashboard;
exports.delete = Dashboard;
exports.update = Dashboard;