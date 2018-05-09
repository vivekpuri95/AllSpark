"use strict";

const API = require('../../utils/api');
const auth = require('../../utils/auth');
const User = require('../../utils/User');
const redis = require('../../utils/redis').Redis;

exports.list = class extends API {

	async list() {

		let query = `
			SELECT
				q.*,
				CONCAT(u.first_name, ' ', u.last_name) AS added_by_name
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

		if(this.request.body.search){
			query = query.concat(`
				AND (
					query_id LIKE '%${this.request.body.search}%'
					OR name LIKE '%${this.request.body.search}%'
				)
			`);
		}

		const results = await Promise.all([
			this.mysql.query(query),
			this.mysql.query('SELECT * FROM tb_query_filters'),
			this.mysql.query('SELECT * FROM tb_query_visualizations'),
		]);

		const response = [];

		for (const row of results[0]) {

			if ((await auth.report(row, this.user)).error)
				continue;

			row.filters = results[1].filter(filter => filter.query_id == row.query_id);
			row.visualizations = results[2].filter(visualization => visualization.query_id == row.query_id);
			row.href = `/report/${row.query_id}`;
			row.superset = 'Reports';
			response.push(row);

			try {
				row.format = row.format ? JSON.parse(row.format) : null;
			} catch (e) {
				row.format = null;
			}
		}

		return response;
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs('report');

		let
			values = {},
			query_cols = [
				'name',
				'source',
				'query',
				'url',
				'url_options',
				'category_id',
				'description',
				'added_by',
				'requested_by',
				'tags',
				'is_enabled',
				'is_deleted',
				'is_redis',
				'refresh_rate',
				'roles',
				'format',
				'connection_name'
			];

		for (const key in this.request.body) {

			if (query_cols.includes(key)) {

				values[key] = this.request.body[key];
			}

		}

		values.refresh_rate = parseInt(values.refresh_rate) || null;

		try {

			values.format = values.format ? JSON.stringify(JSON.parse(values.format)) : null;
		}
		catch (e) {

			values.format = JSON.stringify({});
		}

		return await this.mysql.query('UPDATE tb_query SET ? WHERE query_id = ? and account_id = ?', [values, this.request.body.query_id, this.account.account_id], 'write');

	}
};

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('report');

		let
			values = {}, query_cols = [
				'account_id',
				'name',
				'source',
				'query',
				'url',
				'url_options',
				'category_id',
				'description',
				'added_by',
				'requested_by',
				'tags',
				'is_enabled',
				'is_deleted',
				'is_redis',
				'refresh_rate',
				'roles',
				'format',
				'connection_name'
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

		return await this.mysql.query('INSERT INTO tb_query SET  ?', [values], 'write');
	}
};

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

                UNION ALL

               SELECT
                    'roles' AS 'owner',
                    u.user_id,
                    concat_ws(" ",first_name, middle_name, last_name) AS \`name\`,
                    email,
                    IF(r.is_admin = 1, 0, ur.role_id) AS owner_id,
                    r.name AS role_name,
                    IF(c.is_admin = 1, 0, ur.category_id) AS category_id,
                    c.name AS category_name
               FROM
                    tb_user_roles ur
               JOIN
                    tb_users u
                    USING(user_id)
               JOIN
                    tb_categories c
                    USING(category_id)
               JOIN
                    tb_roles r
                    USING(role_id)
               WHERE
                    u.account_id = ?
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
			[this.account.account_id, this.account.account_id, reportId, reportId]);



		const userObj = {};

		for(const row of users) {

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


			for(const user in userObj) {

				const authResponse = await auth.report({...reportDetails[0], flag: userObj[user].flag}, userObj[user]);
				if(!authResponse.error) {

					delete userObj[user].roles;
					delete userObj[user].privileges;
					privilegedUsers.push({...userObj[user], reason: authResponse.message});
				}
			}
		return privilegedUsers;

	}


};
