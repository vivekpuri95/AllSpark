const API = require("../utils/api");
const commonFun = require("../utils/commonFunctions");

exports.insert = class extends API {

	async insert() {

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

		var keys = Object.keys(this.request.body);

		const params = this.request.body,
			user_id = params.user_id,
			setParams = {};

		for (const key in params) {
			if (~keys.indexOf(key) && key != 'user_id')
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

		if(!this.request.body.user_id) {
			this.user.privilege.needs('user');
		}

		let
			results,
			roles = {},
			privileges = {},
			user_query = `
				SELECT 
					* 
				FROM 
					tb_users 
				WHERE
					account_id = ${this.account.account_id} 
					AND status = 1
			`,
			role_query = `SELECT id, user_id, category_id, role_id FROM tb_user_roles`,
			prv_query = `SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege`;
		if (this.request.body.user_id) {

			user_query = user_query.concat(` AND user_id = ${this.request.body.user_id}`);
			role_query = role_query.concat(` WHERE user_id = ${this.request.body.user_id}`);
			prv_query = prv_query.concat(` WHERE user_id = ${this.request.body.user_id}`);

			results = await Promise.all([
				this.mysql.query(user_query),
				this.mysql.query(role_query),
				this.mysql.query(prv_query)
			]);

		}
		else {

			if(this.request.body.search) {
				user_query = user_query.concat(`
					AND  (
						user_id LIKE '%${this.request.body.search}%'
						OR phone LIKE '%${this.request.body.search}%'
						OR email LIKE '%${this.request.body.search}%'
						OR first_name LIKE '%${this.request.body.search}%'
						OR middle_name LIKE '%${this.request.body.search}%'
						OR last_name LIKE '%${this.request.body.search}%'
					)
					LIMIT 10				
				`);
			}

			results = await Promise.all([
				this.mysql.query(user_query),
				this.mysql.query(role_query),
				this.mysql.query(prv_query)
			]);
		}

		for (const role of results[1]) {
			if (!roles[role.user_id]) {
				roles[role.user_id] = [];
			}
			roles[role.user_id].push(role);
		}

		for (const privilege of results[2]) {
			if (!privileges[privilege.user_id]) {
				privileges[privilege.user_id] = [];
			}
			privileges[privilege.user_id].push(privilege);
		}

		for (const row of results[0]) {
			row.roles = roles[row.user_id] ? roles[row.user_id] : [];
			row.privileges = privileges[row.user_id] ? privileges[row.user_id] : [];
			row.href = `/user/profile/${row.user_id}`;
			row.superset = 'Users'
			row.name = [row.first_name, row.middle_name, row.last_name].filter(u => u).join(' ');
		}

		return results[0];
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

		metadata.visualizations = await this.mysql.query('SELECT * FROM tb_visualizations');

		metadata.datasets = await this.mysql.query(
			'SELECT * FROM tb_datasets WHERE account_id = ?',
			[this.account.account_id]
		);

		let filterTypes = await this.mysql.query('SHOW COLUMNS FROM `tb_query_filters` where Field = \'type\'');
		if (filterTypes.length) {
			filterTypes = filterTypes[0].Type;
			filterTypes = filterTypes.substring(5, filterTypes.length - 1);
			filterTypes = filterTypes.replace(/\'/g, '');
			filterTypes = filterTypes.split(',');
		}

		metadata.filters = {};
		metadata.filters.types = filterTypes.length ? filterTypes : [];

		return metadata;
	}
};