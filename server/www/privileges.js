const API = require('../utils/api');

exports.list = class extends API {

	async list() {
		return await this.mysql.query(`
			SELECT
				*
			FROM
				tb_privileges
			WHERE
				account_id = ? AND status=1`,
			[this.account.account_id],
		);
	}
};

exports.insert = class extends API {
	async insert() {
		this.user.privilege.needs('administrator');

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			is_admin: this.request.body.is_admin
		};
		return await this.mysql.query(
			`INSERT INTO tb_privileges SET ?`,
			[params],
			'write'
		);
	}
}

exports.update = class extends API {
	async update() {
		this.user.privilege.needs('administrator');

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			is_admin: this.request.body.is_admin
		};
		return await this.mysql.query(
			`UPDATE tb_privileges SET ? WHERE account_id = ? AND privilege_id = ?`,
			[params, this.account.account_id, this.request.body.privilege_id],
			'write'
		);
	}
}

exports.delete = class extends API {
	async delete() {
		this.user.privilege.needs('administrator');
		console.log(this.request.body.privilege_id)
		return await this.mysql.query(
			`UPDATE	tb_privileges SET status = 0 WHERE account_id = ? AND privilege_id = ?`,
			[this.account.account_id, this.request.body.privilege_id],
			'write'
		);
	}
}