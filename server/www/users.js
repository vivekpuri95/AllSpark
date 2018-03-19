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

		return await this.mysql.query(`insert into tb_users set ?`, result, 'write');

	}

};

exports.delete = class extends API {

	async delete() {

		return await this.mysql.query(`update tb_users set status = 0 where user_id = ?`, [this.request.body.user_id], 'write');

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

		return await this.mysql.query(`update tb_users set ? where user_id = ?`, values, 'write');

	}

}

exports.list = class extends API {

	async list() {

		let results, roles = {}, privileges = {};
		if (this.request.body.user_id) {
			results = await Promise.all([
				this.mysql.query(`SELECT * FROM tb_users WHERE user_id = ? AND account_id = ? `, [this.request.body.user_id, this.account.account_id]),
				this.mysql.query(`SELECT id, user_id, category_id, role_id FROM tb_user_roles WHERE user_id = ? `, [this.request.body.user_id]),
				this.mysql.query(`SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege WHERE user_id = ? `, [this.request.body.user_id])
			]);

		}
		else {
			results = await Promise.all([
				this.mysql.query(`SELECT * FROM tb_users WHERE account_id = ?`, [this.account.account_id]),
				this.mysql.query(`SELECT id, user_id, category_id, role_id FROM tb_user_roles`),
				this.mysql.query(`SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege`)
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
			row.roles = roles[row.user_id];
			row.privileges = privileges[row.user_id];
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
		else
			throw("Password does not match!");
	}
}