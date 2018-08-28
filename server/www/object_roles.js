const API = require('../utils/api');

exports.insert = class extends API {

	async insert() {

		//this.user.privilege.needs("administrator");

		const expectedFields = ["owner", "owner_id", "target", "target_id", "category_id"];

		this.assert(expectedFields.every(x => this.request.body[x]), "required data owner, ownerId, target, category_id, targetId, some are missing");

		return await this.mysql.query(
			"insert ignore into tb_object_roles (owner, owner_id, target, target_id, category_id, account_id, added_by) values (?)",
			[expectedFields.map(x => this.request.body[x]).concat([this.account.account_id, this.user.user_id])],
			"write"
		);
	}
};


exports.update = class extends API {

	async update() {

		//this.user.privilege.needs("administrator");

		const expectedFields = ["owner", "owner_id", "target", "target_id"];

		const filteredRequest = expectedFields.reduce((obj, key) => (this.request.body[key] ? {
			...obj,
			[key]: this.request.body[key]
		} : obj), {});

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

		//this.user.privilege.needs("administrator");

		return await this.mysql.query(
			"delete from tb_object_roles where id = ? and account_id = ?",
			[this.request.body.id, this.account.account_id],
			"write"
		)
	}
};

exports.list = class extends API {

	async list() {

		if (this.request.query.owner && this.request.query.target) {

			return await (new exports.get).get(this.account.account_id, this.request.query.owner, this.request.query.target, this.request.query.owner_id || 0, this.request.query.target_id || 0);
		}

		return await this.mysql.query(
			"select * from tb_object_roles where account_id = ?",
			[this.account.account_id]
		)
	}
};

exports.get = class extends API {

	async get(accountId, owner, target, ownerId = 0, targetId = 0, categoryId = 0) {

		if (Object.keys(this.request || []).length) {

			return "not authorized";
		}

		if (accountId !== 0 && !accountId) {

			return "account Id not found";
		}

		if (!Array.isArray(target)) {

			target = [target]
		}

		if (!Array.isArray(categoryId)) {

			categoryId = [categoryId]
		}

		this.assert(target.length, "Target not found for object roles");

		return await this.mysql.query(`
			SELECT
				*
			FROM
				tb_object_roles
			where
				owner = ?
				and (owner_id in (?) or (0) in (?))
				and target in (?)
				and (target_id in (?) or (0) in (?))
				and (account_id = ? or ? = 0)
				and (category_id in (?) or 0 in (?))
			`,
			[owner, ownerId, ownerId, target, targetId, targetId, accountId, accountId, categoryId, categoryId],
		);
	}
};

