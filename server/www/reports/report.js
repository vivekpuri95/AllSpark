"use strict";

const API = require('../../utils/api');
const auth = require('../../utils/auth');
const User = require('../../utils/User');
const redis = require('../../utils/redis').Redis;

exports.list = class extends API {

	async list() {

		const results = await Promise.all([
			this.mysql.query(`
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
                    and q.account_id = ?
            `, [this.account.account_id]),
			this.mysql.query('SELECT * FROM tb_query_filters'),
			this.mysql.query('SELECT * FROM tb_query_visualizations'),
		]);

		const response = [];

		for (const row of results[0]) {

			if ((await auth.report(row, this.user)).error)
				continue;

			row.filters = results[1].filter(filter => filter.query_id == row.query_id);
			row.visualizations = results[2].filter(visualization => visualization.query_id == row.query_id);
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
				values[key] = this.request.body[key] || null;
		}

		values["account_id"] = this.account.account_id;
		values.added_by = this.user.user_id;

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

		const [reportDetails] = await this.mysql.query(`
			select
				*
			from
				tb_query
			where
				query_id = ?
				and is_deleted = 0
				and is_enabled = 1
		`,
			[reportId]);

		this.assert(reportDetails, `report ${reportId} not found`);

		const userRoles = await this.mysql.query(`

                SELECT
                	ur.user_id,
                	email,
                	first_name,
					middle_name,
					last_name,
                    IF(r.is_admin = 1, 0, ur.role_id) AS role_id,
                    IF(c.is_admin = 1, 0, ur.category_id) AS category_id,
                    CASE WHEN uq.id IS NULL THEN 0 ELSE 1 END AS user_query_flag
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
                LEFT JOIN
                	tb_user_query uq
                	ON uq.user_id = ur.user_id
                	AND query_id = ?
                WHERE
                     u.account_id = ?
		`,
			[reportId, this.account.account_id]);

		const userObj = {};

		for (const role of userRoles) {

			if (!userObj[role.user_id]) {

				userObj[role.user_id] = {
					user_id: role.user_id,
					account_id: this.account.account_id,
					name: [role.first_name, role.middle_name, role.last_name].filter(x => x).join(" "),
					email: role.email,
					privileges: [],
					roles: [],
					user_query: role.user_query_flag,
				};

				userObj[role.user_id].roles.push({
					category_id: role.category_id,
					role: role.role_id,
				})
			}
		}
		const finalList = [];

		for (const userId in userObj) {


			const user = new User(userObj[userId]);

			const authResponse = await auth.report({...reportDetails, flag: userObj[userId].user_query}, user);

			if (authResponse.error) {

				continue;
			}
			const reason = [];

			if (userObj[userId].user_query) {

				reason.push('User Query');

			}
			if (authResponse.message === 'privileged user!') {

				reason.push('User Role');
			}

			finalList.push({
				user_id: userId,
				name: userObj[userId].name,
				email: userObj[userId].email,
				reason: reason,
			})
		}

		return finalList;
	}
};