const API = require('../utils/api');
const auth = require('../utils/auth');

class Dashboard extends API {

	async list() {

		let query = `select * from tb_dashboards where status = 1 and account_id = ${this.account.account_id}`;

		if(this.request.body.search) {
			query = query.concat(`
				AND (
					id LIKE '%${this.request.body.text}%'
					OR name LIKE '%${this.request.body.text}%'
				)
				LIMIT 10
			`);
		}

		let dashboards = this.mysql.query(query);

		let visualizationDashboards = this.mysql.query(
			"select vd.*, query_id from tb_visualization_dashboard vd join tb_query_visualizations qv using(visualization_id) join tb_dashboards d on d.id = vd.dashboard_id join tb_query q  using(query_id) where d.status = 1 and d.account_id = ? and q.is_enabled = 1 and q.is_deleted = 0",
			[this.account.account_id]
		);

		const dashboardDetails = await Promise.all([dashboards, visualizationDashboards]);

		dashboards = dashboardDetails[0];
		visualizationDashboards = dashboardDetails[1];

		const dashboardObject = {};

		for(const dashboard of dashboards) {

			try {
				dashboard.format = JSON.parse(dashboard.format);
			}

			catch(e) {
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

			catch(e) {
				queryDashboard.format = [];
			}

			dashboardObject[queryDashboard.dashboard_id].visualizations.push(queryDashboard);
		}

		for(const d in dashboardObject) {

			dashboardObject[d].href = `/dashboard/${dashboardObject[d].id}`;
			dashboardObject[d].superset = 'Dashboards';
		}

		return Object.values(dashboardObject).sort((x, y) => x.order - y.order);
	}

	async insert() {

		this.user.privilege.needs('dashboard');

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

		this.user.privilege.needs('dashboard');

		const authResponse = auth.dashboard(this.request.body.dashboard_id, this.user);

		this.assert(!authResponse.error, authResponse.message);

		const
			values = {},
			columns = ['name', 'parent', 'icon', 'roles', 'type', 'order', 'format'];

		for(const key in this.request.body) {

			if(columns.includes(key))
				values[key] = this.request.body[key] || null;
		}

		try {
			JSON.parse(values.format);
		}
		catch(e) {
			this.assert(false, 'Invalid format! :(');
		}

		return await this.mysql.query(
			'UPDATE tb_dashboards SET ? WHERE id = ? AND account_id = ?',
			[values, this.request.body.id, this.account.account_id],
			'write'
		);
	}

	async delete() {

		this.user.privilege.needs('dashboard');

		const mandatoryData = ["id"];

		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = auth.dashboard(this.request.body.id, this.user);

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