const API = require('../utils/api');

exports.list = class extends API {

	async list() {

		const privilegesList = await this.mysql.query(`
			SELECT
				*
			FROM
				tb_privileges
			WHERE
				status = 1 and account_id in (0, ?)
		`, [this.account.account_id]);

		this.assert(privilegesList.length, "No privilege found");

		return privilegesList;
	}
}

exports.insert = class extends API {

	async insert() {

		if(!this.account.account_id)
			this.user.privilege.needs('superadmin')

		this.user.privilege.needs('administrator');

		const result = await this.mysql.query(`
			INSERT into
				tb_privileges (account_id, name, is_admin, added_by)
			VALUES
				(?, ?, ?, ?)
		`, [this.account.account_id, this.request.body.name, this.request.body.is_admin, this.user.user_id], `write`)

		return result;
	};
}

exports.update = class extends API {

	async update() {

		this.assert(this.request.body.privilege_id, 'Privilege Id not found');

		const [account_id] = await this.mysql.query(`SELECT account_id FROM tb_privileges WHERE privilege_id = ?
				AND status = 1
			`, [this.request.body.privilege_id]
		);

		if(!account_id.account_id) {
			this.user.privilege.needs('superadmin');
		}

		return await this.mysql.query(`
			UPDATE
				tb_privileges
			SET
				name = ?, is_admin = ?
			WHERE
				privilege_id = ? AND account_id = ?

			`, [this.request.body.name, this.request.body.is_admin, this.request.body.privilege_id, this.account.account_id],
			'write'
		);
	}
}

exports.delete = class extends API {

	async delete() {

		this.assert(this.request.body.privilege_id, 'Privilege Id not found');

		const account_id = await this.mysql.query(`SELECT account_id FROM tb_privileges WHERE privilege_id = ?
				AND status = 1
			`, [this.request.body.privilege_id]
		);

		if(!account_id.account_id) {
			this.user.privilege.needs('superadmin');
		}

		const result = await this.mysql.query(
			`UPDATE
				tb_privileges
			SET
				status = 0
			WHERE
				account_id = ? AND privilege_id = ?`,
			[this.account.account_id, this.request.body,privilege_id],
			'write'
		);

		return result;
	}
}