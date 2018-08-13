const API = require("../utils/api");
const commonFun = require("../utils/commonFunctions");
const constants = require('../utils/constants');
const getRole = (require('./object_roles')).get

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('user', this.user.privileges[0] && this.user.privileges[0].category_id);

		var result = {};

		for (var key in this.request.body) {
			result[key] = this.request.body[key]
		}

		if (result.password) {
			result.password = await commonFun.makeBcryptHash(result.password);
		}

		delete result.token;

		result.account_id = this.account.account_id;

		return await this.mysql.query(`INSERT INTO tb_users SET ?`, result, 'write');
	}

};

exports.delete = class extends API {

	async delete() {

		return await this.mysql.query(`UPDATE tb_users SET status = 0 WHERE user_id = ?`, [this.request.body.user_id], 'write');

	}
}

exports.update = class extends API {

	async update() {
		const objRole = new getRole();

		const requiredCategories = (await objRole.get(this.account.account_id, 'user', 'role', this.request.body.user_id)).map(x => x.category_id);

		this.assert(requiredCategories.some(x => this.user.privilege.has('user', x)), 'User does not have enough privileges');

		this.user.privilege.needs('user', this.user.privileges[0] && this.user.privileges[0].category_id);

		var keys = Object.keys(this.request.body);

		const params = this.request.body,
			user_id = params.user_id,
			setParams = {};

		for (const key in params) {
			if (keys.includes(key) && key != 'user_id')
				setParams[key] = params[key] || null;
		}

		delete setParams['token'];

		if (setParams.password)
			setParams.password = await commonFun.makeBcryptHash(setParams.password);

		const values = [setParams, user_id];

		return await this.mysql.query(`UPDATE tb_users SET ? WHERE user_id = ?`, values, 'write');

	}

}

exports.list = class extends API {

	async list() {

		if (!this.request.body.user_id) {

			this.assert(
				((this.user.privilege.has('user', this.user.privileges[0] && this.user.privileges[0].category_id)) || (this.user.privilege.has('report', this.user.privileges[0] && this.user.privileges[0].category_id))),
				{
					message: "User does not have privilege to view user list.",
					status: 401,
				}
			);
		}

		let
			results,
			roles = {},
			privileges = {},
			last_login = {},
			user_query = `
				SELECT
					*
				FROM
					tb_users
				WHERE
					account_id = ?
					AND status = 1
			`,
			role_query = `
				SELECT
					id,
					owner_id as user_id,
					category_id,
					target_id as role_id
				FROM
					tb_object_roles
				WHERE
					owner = "user"
					and target = "role"
					and account_id = ?
				`,
			prv_query = `SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege`,
			last_login_query = `
				SELECT 
					user_id, 
					max(created_at + INTERVAL 330 MINUTE) AS last_login 
				FROM 
					allspark_logs.tb_sessions 
				WHERE 
					type = 'login'
			`
		;

		if (this.request.body.user_id && !this.request.body.search) {

			user_query = user_query.concat(` AND user_id = ?`);
			role_query = role_query.concat(` AND owner_id = ?`);
			prv_query = prv_query.concat(` WHERE user_id = ?`);
			last_login_query = last_login_query.concat(` AND user_id = ?`);

			results = await Promise.all([
				this.mysql.query(user_query, [this.account.account_id, this.request.body.user_id]),
				this.mysql.query(role_query, [this.account.account_id, this.request.body.user_id]),
				this.mysql.query(prv_query, [this.request.body.user_id]),
				this.mysql.query(last_login_query, [this.request.body.user_id]),
			]);
		}

		else {

			let queryParams = [];

			if (this.request.body.search) {

				if(this.request.body.user_id) {

					user_query = user_query.concat(` AND user_id LIKE ?`);
					queryParams.push(`%${this.request.body.user_id}%`);
				}

				if(this.request.body.email) {

					user_query = user_query.concat(` AND email LIKE ?`);
					queryParams.push(`%${this.request.body.email}%`);
				}

				if(this.request.body.name) {

					user_query = user_query.concat(` AND CONCAT(first_name, ' ', IFNULL(middle_name, ' '),' ', IFNULL(last_name, ' ')) LIKE ?`);
					queryParams.push(`%${this.request.body.name}%`);
				}


				if(this.request.query.text) {

					user_query = user_query.concat(`
						AND  (
							user_id LIKE ?
							OR phone LIKE ?
							OR email LIKE ?
							OR first_name LIKE ?
							OR middle_name LIKE ?
							OR last_name LIKE ?
						)
						LIMIT 10
					`);

					for(let i = 1; i <= 6; i++) {
						queryParams.push(`%${this.request.body.text}%`);
					}
				}

			}

			last_login_query = last_login_query.concat(' GROUP BY user_id');

			results = await Promise.all([
				this.mysql.query(user_query, [this.account.account_id, ...queryParams]),
				this.mysql.query(role_query, [this.account.account_id]),
				this.mysql.query(prv_query),
				this.mysql.query(last_login_query),
			]);
		}

		let userList = [];

		for (const role of results[1]) {

			if(this.request.body.category_id || this.request.body.role_id) {

				this.request.body.category_id = typeof this.request.body.category_id == 'string' ? [this.request.body.category_id] : this.request.body.category_id;
				this.request.body.role_id = typeof this.request.body.role_id == 'string' ? [this.request.body.role_id] : this.request.body.role_id;

				if(this.request.body.category_id) {

					const categoryCheck = this.request.body.category_id.includes(role.category_id.toString());

					if(!categoryCheck) {

						continue;
					}

					if(categoryCheck && this.request.body.search_by == 'privilege') {

						continue;
					}

				}

				if(this.request.body.role_id && !this.request.body.role_id.includes(role.role_id.toString())) {

					continue;
				}
			}

			if (!roles[role.user_id]) {

				roles[role.user_id] = [];
			}

			roles[role.user_id].push(role);
		}

		for (const privilege of results[2]) {

			if(this.request.body.category_id || this.request.body.privilege_id) {

				this.request.body.category_id = typeof this.request.body.category_id == 'string' ? [this.request.body.category_id] : this.request.body.category_id;
				this.request.body.privilege_id = typeof this.request.body.privilege_id == 'string' ? [this.request.body.privilege_id] : this.request.body.privilege_id;

				if(this.request.body.category_id) {

					const categoryCheck = this.request.body.category_id.includes(privilege.category_id.toString());

					if(!categoryCheck) {

						continue;
					}

					if(categoryCheck && this.request.body.search_by == 'role') {

						continue;
					}

				}

				if(this.request.body.privilege_id && !this.request.body.privilege_id.includes(privilege.privilege_id.toString())) {

					continue;
				}
			}

			if (!privileges[privilege.user_id]) {

				privileges[privilege.user_id] = [];
			}

			privileges[privilege.user_id].push(privilege);
		}

		for(const user of results[3]) {

			last_login[user.user_id] = user.last_login;
		}

		for (const row of results[0]) {

			row.roles = roles[row.user_id] ? roles[row.user_id] : [];
			row.privileges = privileges[row.user_id] ? privileges[row.user_id] : [];
			row.href = `/user/profile/${row.user_id}`;
			row.superset = 'Users';
			row.name = [row.first_name, row.middle_name, row.last_name].filter(u => u).join(' ');
			row.last_login = last_login[row.user_id] ? last_login[row.user_id] : '';

			if(this.request.query.search) {

				if (this.request.body.role_id && !roles[row.user_id]) {

					continue;
				}
				else if(this.request.body.privilege_id && !privileges[row.user_id]) {

					continue;
				}
				else if(this.request.body.category_id && !(roles[row.user_id] || privileges[row.user_id])) {

					continue;
				}
			}

			userList.push(row);
		}

		const userCategories = this.user.roles.map(x => parseInt(x.category_id));

		if(!constants.adminCategory.some(x => userCategories.includes(x))) {

			userList = userList.filter(x => x.roles.some(x => userCategories.includes(parseInt(x.category_id))));
		}

		return userList;
	}

};

exports.changePassword = class extends API {

	async changePassword() {

		const dbPass = await this.mysql.query(
			`SELECT password FROM tb_users WHERE user_id = ? and account_id = ?`,
			[this.user.user_id, this.account.account_id]
		);

		const check = await commonFun.verifyBcryptHash(this.request.body.old_password, dbPass[0].password);

		if (check) {

			const new_password = await commonFun.makeBcryptHash(this.request.body.new_password);

			return await this.mysql.query(
				`UPDATE tb_users SET password = ? WHERE user_id = ? and account_id = ?`,
				[new_password, this.user.user_id, this.account.account_id],
				'write'
			);

		}

		throw new API.Exception(400, 'Old Password does not match! :(');
	}
}

exports.metadata = class extends API {
	async metadata() {

		const user_id = this.user.user_id;

		const categoriesPrivilegesRoles = await this.mysql.query(`
                SELECT
                    'categories' AS 'type',
                    category_id as owner_id,
                    \`name\`,
                    is_admin
                FROM
                    tb_categories
                WHERE
                    account_id = ?

                UNION ALL

                SELECT
                    'privileges' AS 'type',
                    privilege_id,
                    \`name\`,
                    ifnull(is_admin, 0) AS is_admin
                FROM
                    tb_privileges

                UNION ALL

                SELECT
                    'roles',
                    role_id,
                    \`name\`,
                    ifnull(is_admin, 0) AS is_admin
                FROM
                    tb_roles
                WHERE
                    account_id = ?
            `,
			[this.account.account_id, this.account.account_id]
		);

		const metadata = {};

		for (const row of categoriesPrivilegesRoles) {

			if (!metadata[row.type]) {

				metadata[row.type] = [];
			}

			metadata[row.type].push(row);
		}

		metadata.visualizations = await this.mysql.query(`
			SELECT
				v.*
			FROM
				tb_features f
			JOIN
				tb_account_features af
			ON
				f.feature_id = af.feature_id
				AND af.status = 1
				AND af.account_id = ?
				AND f.type = 'visualization'
			JOIN
				tb_visualizations v
			ON
				f.slug = v.slug
			`,
			[this.account.account_id]
		);

		metadata.globalFilters = await this.mysql.query(
			'SELECT * FROM tb_global_filters WHERE account_id = ? AND is_enabled = 1',
			[this.account.account_id]
		);

		for (const data of metadata.globalFilters) {
			data.placeholder = data.placeholder.split(',');
		}

		metadata.filterTypes = constants.filterTypes;

		metadata.sourceTypes = await this.mysql.query(`
			SELECT
				f.slug
			FROM
				tb_features f
			JOIN
				tb_account_features af
			ON
				f.feature_id = af.feature_id
				AND af.status = 1
				AND f.type = 'source'
				AND af.account_id = ?
			`,
			[this.account.account_id]
		);

		metadata.features = await this.mysql.query('SELECT * from tb_features');

		metadata.spatialMapThemes = await this.mysql.query('select * from tb_spatial_map_themes');

		return metadata;
	}
};