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
};

exports.insertNewPrivileges = class extends API {

	async insertNewPrivileges() {

		const privilegeTable = 'tb_privileges';
		const privilegeTreeTable = 'tb_privileges_tree';

		let privileges = await this.mysql.query("select * from ?? where account_id = 0 and status = 1", [privilegeTable]);

		const privilegeNameIdMapping = {};

		const newPrivileges = [
			"user", "user.insert", "user.update", "user.delete", "user.list",
			"connection.insert", "connection.update", "connection.delete", "connection.list", "connection",
			"dashboard.insert", "dashboard.update", "dashboard.list", "dashboard.delete", "dashboard",
			"report", "report.insert", "report.update",
			"visualization", "visualization.insert", "visualization.update", "visualization.delete", "visualization.list",
			"category", "category.insert", "category.update", "category.list", "category.delete",
		];

		const notInTable = [];

		for (const privilege of privileges) {

			privilegeNameIdMapping[privilege.name] = privilege.privilege_id;
		}

		for (const privilege of newPrivileges) {

			if (!privilegeNameIdMapping.hasOwnProperty(privilege)) {

				notInTable.push(privilege)
			}
		}

		if(notInTable.length) {

			await this.mysql.query('insert into ?? (name, account_id, is_admin, status) values ?', [privilegeTable, notInTable.map(x => [x, 0, 0, 1])], "write");

			privileges = await this.mysql.query("select * from ?? where account_id = 0 and status = 1", [privilegeTable]);
		}

		let insertObj = [];

		for (const privilege of privileges) {

			privilegeNameIdMapping[privilege.name] = privilege.privilege_id;
		}

		const privTreeMap = {};

		for (const privilege in privilegeNameIdMapping) {

			if (!privTreeMap.hasOwnProperty(privilegeNameIdMapping[privilege.split(".")[0]])) {

				privTreeMap[privilegeNameIdMapping[privilege.split(".")[0]]] = new Set;
			}

			if (privilege.split(".").length > 1) {

				privTreeMap[privilegeNameIdMapping[privilege.split(".")[0]]].add(privilegeNameIdMapping[privilege]);
			}
		}

		for (const privilege in privTreeMap) {

			if(privTreeMap[parseInt(privilege)].size) {

				insertObj = [...([...privTreeMap[parseInt(privilege)]]).map(x => [privilege, x]), ...insertObj];
			}

			insertObj = [...([...privTreeMap[parseInt(privilege)]]).map(x => [x, 0]), ...insertObj];
		}

		return await this.mysql.query("insert ignore into ?? (privilege_id, parent) values ?", [privilegeTreeTable, insertObj], "write");
	}
}