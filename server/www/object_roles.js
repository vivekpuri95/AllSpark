const API = require('../utils/api');

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("administrator");

		const expectedFields = ["owner", "owner_id", "target", "target_id"];

		this.assert(expectedFields.every(x => this.request.body[x]), "required data owner, ownerId, target, targetId, some are missing");

		return await this.mysql.query(
			"insert ignore into tb_object_roles (owner, owner_id, target, target_id, account_id, added_by) values (?)",
			[expectedFields.map(x => this.request.body[x]).concat([this.account.account_id, this.user.user_id])],
			"write"
		);
	}
};


exports.update = class extends API {

	async update() {

		this.user.privilege.needs("administrator");

		const expectedFields = ["owner", "owner_id", "target", "target_id"];

		const filteredRequest = expectedFields.reduce((obj, key) => (this.request.body[key]? {...obj, [key]: this.request.body[key]} : obj), {});

		this.assert(Object.keys(filteredRequest).length, "required data owner, ownerId, target, targetId, some are missing");

		return await this.mysql.query(
			"update tb_object_roles set ? where account_id = ? and id = ?",
			[filteredRequest, this.account.account_id, this.request.body.id],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(
			"delete from tb_object_roles where id = ? and account_id = ?",
			[this.request.body.id, this.account.account_id],
			"write"
		)
	}
};

exports.list = class extends API {

	async list() {

		return await this.mysql.query(
			"select * from tb_object_roles where account_id = ?",
			[this.account.account_id]
		)
	}
};