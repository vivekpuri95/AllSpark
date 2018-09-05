"use strict";

const API = require('../../utils/api');
const auth = require('../../utils/auth');
const role = new (require("../object_roles")).get();
const reportHistory = require('../../utils/reportLogs');
const constants = require("../../utils/constants");
const dbConfig = require('config').get("sql_db");

exports.list = class extends API {

	async list() {

		let query = `
			SELECT
				q.*,
				CONCAT_WS(' ', u.first_name, u.last_name) AS added_by_name
			FROM
				tb_query q
			LEFT JOIN
				tb_users u
			ON
				q.added_by = u.user_id
			WHERE
				is_deleted = 0
				and q.account_id = ${this.account.account_id}
        `;

		const dashboardRoleQuery = `
			SELECT
				q.query_id,
				o.*
			FROM
				tb_query q
			JOIN
				tb_query_visualizations qv
				USING(query_id)
			JOIN
				tb_visualization_dashboard vd
				USING(visualization_id)
			JOIN
				tb_object_roles o
				ON o.owner_id = vd.dashboard_id

			WHERE
				o.owner = "dashboard"
				AND o.target = "role"
				AND q.is_enabled = 1
				AND q.is_deleted = 0
		`;

		const dashboardToReportAccessQuery = `
			SELECT
                query_id
            FROM
                tb_query q
            JOIN
                tb_query_visualizations qv
                USING(query_id)
            JOIN
                tb_visualization_dashboard vd
                USING(visualization_id)
            JOIN
                tb_object_roles o
            ON
                o.owner_id = vd.dashboard_id
            WHERE
                 OWNER = "dashboard"
                 AND target = "user"
                 AND target_id = ?
            GROUP BY query_id
        `;

		if (this.request.body.search) {
			query = query.concat(`
				AND (
					query_id LIKE ?
					OR name LIKE ?
					OR tags LIKE ?
				)
				LIMIT 10
			`);
		}

		let userCategories = new Set(this.user.privileges.filter(x => x.privilege_name === constants.privilege.administrator || x.privilege_name === constants.privilege.report).map(x => x.category_id));
		let isAdmin = false;

		if(constants.adminPrivilege.some(x => userCategories.has(x))) {

			userCategories = new Set([0]);
			isAdmin = true;
		}


		const results = await Promise.all([
			this.mysql.query(query, [`%${this.request.body.text}%`, `%${this.request.body.text}%`, `%${this.request.body.text}%`]),
			this.mysql.query('SELECT * FROM tb_query_filters'),
			this.mysql.query('SELECT * FROM tb_query_visualizations'),
			this.mysql.query(dashboardRoleQuery),
			this.mysql.query(dashboardToReportAccessQuery, [this.user.user_id])
		]);

		const reportRoles = await role.get(this.account.account_id, "query", "role", results[0].length ? results[0].map(x => x.query_id) : [-1],);

		const userSharedQueries = new Set((await role.get(this.account.account_id, "query", "user", results[0].length ? results[0].map(x => x.query_id) : [-1], this.user.user_id)).map(x => x.owner_id));
		const dashboardSharedQueries = new Set(results[4].map(x => parseInt(x.query_id)));

		const reportRoleMapping = {};

		for (const row of reportRoles) {

			if (!reportRoleMapping[row.owner_id]) {

				reportRoleMapping[row.owner_id] = {
					roles: [],
					category_id: [],
					dashboard_roles: [],
				};

				reportRoleMapping[row.owner_id].roles.push(row.target_id);
				reportRoleMapping[row.owner_id].category_id.push(row.category_id);
			}
		}

		for(const queryDashboardRole of results[3]) {

			if(!reportRoleMapping[queryDashboardRole.query_id]) {

				reportRoleMapping[queryDashboardRole.query_id] = {
					roles: null,
					category_id: null,
					dashboard_roles: [],
				};
			}

			reportRoleMapping[queryDashboardRole.query_id].dashboard_roles.push(queryDashboardRole);
		}

		const response = [];

		for (const row of results[0]) {

			row.roles = (reportRoleMapping[row.query_id] || {}).roles || [];
			row.category_id = (reportRoleMapping[row.query_id] || {}).category_id || [];

			row.flag = userSharedQueries.has(row.query_id) || dashboardSharedQueries.has(row.query_id);

			if ((await auth.report(row, this.user, (reportRoleMapping[row.query_id] || {}).dashboard_roles || [])).error) {
				continue;
			}

			if(isAdmin || row.category_id.every(x => userCategories.has(x))) {

				row.editable = true;
			}

			else {

				delete row.query;
			}

			row.filters = results[1].filter(filter => filter.query_id === row.query_id);
			row.visualizations = results[2].filter(visualization => visualization.query_id === row.query_id);
			row.href = `/report/${row.query_id}`;
			row.superset = 'Reports';

			try {
				row.definition = JSON.parse(row.definition);
			} catch(e) {
				row.definition = {};
			}

			response.push(row);

			try {

				row.format = row.format ? JSON.parse(row.format) : null;
			}

			catch (e) {

				row.format = null;
			}
		}

		return response;
	}
};

exports.update = class extends API {

	async update() {

		const
			categories = (await role.get(this.account.account_id, 'query', 'role', this.request.body.query_id)).map(x => x.category_id),
			[updatedRow] = await this.mysql.query(`SELECT * FROM tb_query WHERE query_id = ?`, [this.request.body.query_id]);

		for(const category of categories || [0]) {

			this.user.privilege.needs('report.update', category);
		}

		this.assert(updatedRow, 'Invalid query id');

		let
			values = {},
			compareJson = {},
			query_cols = [
				'name',
				'source',
				'query',
				'definition',
				'subtitle',
				'description',
				'added_by',
				'tags',
				'is_enabled',
				'is_deleted',
				'is_redis',
				'load_saved',
				'refresh_rate',
				'format',
				'connection_name',
			];

		for (const key in this.request.body) {

			if (query_cols.includes(key)) {

				values[key] = this.request.body[key] || null;
				compareJson[key] = updatedRow[key] == null || updatedRow[key] === '' ? null : updatedRow[key].toString();
				updatedRow[key] = this.request.body[key];
			}
		}

		if(JSON.stringify(compareJson) == JSON.stringify(values)) {

			return "0 rows affected";
		}

		values.refresh_rate = parseInt(values.refresh_rate) || null;

		if (values.hasOwnProperty("format")) {

			try {

				values.format = values.format ? JSON.stringify(JSON.parse(values.format)) : null;
			}
			catch (e) {

				values.format = JSON.stringify({});
			}

		}

		const
			updateResponse =  await this.mysql.query('UPDATE tb_query SET ? WHERE query_id = ? and account_id = ?', [values, this.request.body.query_id, this.account.account_id], 'write'),
			logs = {
				owner: 'query',
				owner_id: this.request.body.query_id,
				state: JSON.stringify(updatedRow),
				operation:'update',
			};

		reportHistory.insert(this, logs);

		return updateResponse;

	}
};

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('report.insert', parseInt(this.request.body.subtitle));

		let
			values = {}, query_cols = [
				'account_id',
				'name',
				'source',
				'query',
				'definition',
				'subtitle',
				'description',
				'added_by',
				'tags',
				'is_enabled',
				'is_deleted',
				'is_redis',
				'load_saved',
				'refresh_rate',
				'format',
				'connection_name',
			];

		for (const key in this.request.body) {
			if (query_cols.includes(key))
				values[key] = this.request.body[key];
		}

		values["account_id"] = this.account.account_id;
		values.added_by = this.user.user_id;
		values.refresh_rate = parseInt(values.refresh_rate) || null;

		try {
			values.format = JSON.stringify(JSON.parse(values.format))
		} catch (e) {
			values.format = JSON.stringify({});
		}

		const
			insertResponse = await this.mysql.query('INSERT INTO tb_query SET  ?', [values], 'write'),
			[loggedRow] = await this.mysql.query(
				'SELECT * FROM tb_query WHERE query_id = ?',
				[insertResponse.insertId]
			),
			logs = {
				owner: 'query',
				owner_id: insertResponse.insertId,
				state: JSON.stringify(loggedRow),
				operation:'insert',
			};

		reportHistory.insert(this, logs);

		return insertResponse;
	}
};

exports.logs = class extends API {

	async logs() {

		const db = dbConfig.write.database.concat('_logs');

		this.request.query.offset = this.request.query.offset ? parseInt(this.request.query.offset) : 0;

		return await this.mysql.query(`
			SELECT
				h.*,
				CONCAT_WS(' ', first_name, middle_name, last_name) AS user_name
			FROM 
				${db}.tb_history h
			LEFT JOIN
				tb_users u
			ON
				h.updated_by = u.user_id
			WHERE
				owner = ?
				AND h.account_id = ?
				AND owner_id = ?
			ORDER BY
				h.id DESC
			LIMIT 10 OFFSET ?`,
			[this.request.query.owner, this.account.account_id, this.request.query.owner_id, this.request.query.offset]
		);
	}
}

exports.userPrvList = class extends API {

	async userPrvList() {

		this.user.privilege.needs("administrator");

		const reportId = this.request.query.report_id;
		const privilegedUsers = [];

		const users = await this.mysql.query(`
			SELECT

				user.*,
				IF(dashboard_user.query_id_from_dashboards IS NULL AND user_query.query_id_from_user_query IS NULL, 0, 1) AS flag
			FROM
               (SELECT
                    'privileges' AS 'owner',
                    user_id,
                    concat_ws(" ",first_name, middle_name, last_name) AS \`name\`,
                    email,
                    IF(p.is_admin = 1, 0, privilege_id) owner_id,
                    p.name AS owner_name,
                    IF(c.is_admin = 1, 0, category_id) AS category_id,
                    c.name AS category_name
               FROM
                    tb_user_privilege up
               JOIN tb_privileges p
                    USING(privilege_id)
               JOIN tb_users u
                    USING(user_id)
               JOIN tb_categories c
                    USING(category_id)
               WHERE
                    u.account_id = ?
                    AND u.status = 1
                UNION ALL

               SELECT
                    'roles' AS 'owner',
                    u.user_id,
                    concat_ws(" ",first_name, middle_name, last_name) AS \`name\`,
                    email,
                    IF(r.is_admin = 1, 0, r.role_id) AS owner_id,
                    r.name AS role_name,
                    IF(c.is_admin = 1, 0, c.category_id) AS category_id,
                    c.name AS category_name
               FROM
                    tb_object_roles o
               JOIN
                    tb_users u
                    ON u.user_id = o.owner_id
               JOIN
                    tb_categories c
                    USING(category_id)
               JOIN
                    tb_roles r
                    ON r.role_id = o.target_id
               WHERE
                    u.account_id = ?
                    AND o.account_id = ?
                    AND o.owner = "user"
                    AND o.target = "role"
                    AND u.status = 1
               ) user
               LEFT  JOIN
                    (
                		SELECT
                			query_id AS query_id_from_dashboards,
                			user_id
                		FROM
                			tb_visualization_dashboard vd
                		JOIN
                			tb_user_dashboard ud
                			USING(dashboard_id)
                		JOIN
                			tb_query_visualizations qv
                			USING(visualization_id)
                		WHERE
                			 query_id = ?
                	) dashboard_user
               USING(user_id)
                	LEFT JOIN
                   	(
                   		SELECT
                   			query_id AS query_id_from_user_query,
                   			user_id
                   		FROM
                   			tb_user_query
                   		WHERE
                   			query_id = ?
                   ) user_query
               USING(user_id)
		`,
			[this.account.account_id, this.account.account_id, this.account.account_id, reportId, reportId]);


		const userObj = {};

		for (const row of users) {

			if (!userObj[row.user_id]) {

				userObj[row.user_id] = {

					name: row.name,
					email: row.email,
					user_id: row.user_id,
					account_id: this.account.account_id,
					roles: [],
					privileges: [],
					flag: row.flag,
				}
			}

			if (row.owner === "privileges") {

				userObj[row.user_id].privileges.push({
					category_id: row.category_id,
					privilege_id: row.owner_id,
					privilege_name: row.owner_name
				})
			}

			else if (row.owner === "roles") {

				userObj[row.user_id].roles.push({
					category_id: row.category_id,
					role: row.owner_id,
					role_name: row.owner_name
				})
			}
		}// User Details


			const reportDetails = await this.mysql.query(`
				SELECT
                  q.*
                FROM
                    tb_query q
                WHERE
                    q.query_id = ?
                    AND is_enabled = 1
                    AND is_deleted = 0
                    AND account_id = ?`,
			[reportId, this.account.account_id]
		);

		//queryDetails


		for (const user in userObj) {

			const authResponse = await auth.report({...reportDetails[0], flag: userObj[user].flag}, userObj[user]);
			if (!authResponse.error) {

				delete userObj[user].roles;
				delete userObj[user].privileges;
				privilegedUsers.push({...userObj[user], reason: authResponse.message});
			}
		}
		return privilegedUsers;

	}
};