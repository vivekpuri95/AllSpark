const API = require('../utils/api');

exports.insert = class extends API {

	async insert() {

		const expectedFields = ["owner", "owner_id", "target", "target_id", "category_id"];

		this.assert(expectedFields.every(x => this.request.body[x]), "Required data is missing.");

		let multipleTargets = false;
		if (Array.isArray(this.request.body.target_id)) {

			this.request.body.target_id = this.request.body.target_id.map(x => parseInt(x));
			multipleTargets = true;
		}

		this.assert(
			(multipleTargets && this.request.body.target_id.length) ||
			this.request.body.target_id == parseInt(this.request.body.target_id),
			`${this.request.body.target} id is not found.`
		);

		this.assert(this.request.body.category_id == parseInt(this.request.body.category_id), "Category Id is not found.");

		const categories = Array.isArray(this.request.body.category_id) ? this.request.body.category_id : [this.request.body.category_id];

		expectedFields.splice(expectedFields.indexOf("category_id"), 1);

		if (categories.map(x => expectedFields.map(x => this.request.body[x])).length !== categories.map(x => expectedFields.map(x => this.request.body[x]).filter(x => x)).length) {

			return "Some values are missing";
		}

		const insertDetails = await this.mysql.query(
			"insert ignore into tb_object_roles (owner, owner_id, target, target_id, category_id, account_id, added_by) values ?",
			[categories.map(x => expectedFields.map(x => this.request.body[x]).concat([x, this.account.account_id, this.user.user_id]))],
			"write"
		);

		if (insertDetails.insertId) {

			return await this.mysql.query(
				"update tb_object_roles set group_id = ? where id between ? and ?",
				[insertDetails.insertId, insertDetails.insertId, insertDetails.insertId + insertDetails.affectedRows - 1],
				"write",
			)
		}

		else {

			return insertDetails
		}
	}
};


exports.update = class extends API {

	async update() {

		const expectedFields = ["group_id", "category_id"];

		const filteredRequest = expectedFields.reduce((obj, key) => (this.request.body[key] ? {
			...obj,
			[key]: this.request.body[key]
		} : obj), {});

		this.assert(Object.keys(filteredRequest).length, "required data category_id, group id some are missing");

		let categoryIds = this.request.body.category_id;

		if (!Array.isArray(categoryIds)) {

			categoryIds = [categoryIds]
		}

		categoryIds = categoryIds.map(x => parseInt(x));

		const rows = await this.mysql.query(
			"select * from tb_object_roles where group_id = ? and account_id = ?",
			[this.request.body.group_id, this.account.account_id]
		);

		if (!rows.length) {

			return 'done'
		}

		if ((rows.filter(x => !categoryIds.includes(x.category_id)).length)) {

			await this.mysql.query(
				"DELETE FROM tb_object_roles WHERE group_id = ? AND category_id IN (?) AND account_id = ?",
				[this.request.body.group_id, rows.filter(x => !categoryIds.includes(x.category_id)).map(x => x.category_id), this.account.account_id],
				"write"
			);
		}

		categoryIds = categoryIds.filter(x => x);

		if (!categoryIds.length) {

			return "Done";
		}

		return await this.mysql.query(
			"INSERT IGNORE INTO tb_object_roles (owner, owner_id, target, target_id, category_id, account_id, added_by, group_id) VALUES ?",
			[categoryIds.map(x => [rows[0].owner, rows[0].owner_id, rows[0].target, rows[0].target_id, x, this.account.account_id, this.user.user_id, rows[0].group_id])],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete() {

		return await this.mysql.query(
			"DELETE FROM tb_object_roles WHERE group_id = ? AND account_id = ?",
			[this.request.body.group_id, this.account.account_id],
			"write"
		)
	}
};

exports.list = class extends API {

	async list() {

		let result;

		if (this.request.query.owner && this.request.query.target) {

			return await (new exports.get).get(this.account.account_id, this.request.query.owner, this.request.query.target, this.request.query.owner_id || 0, this.request.query.target_id || 0);
		}

		else {

			result = await this.mysql.query(
				"SELECT * FROM tb_object_roles WHERE account_id = ? and group_id is not null",
				[this.account.account_id]
			)
		}

		const groupIdObject = {};

		for (const row of result) {

			if (!groupIdObject.hasOwnProperty(row.group_id)) {

				groupIdObject[row.group_id] = {...row, category_id: [row.category_id]};
			}

			else {

				groupIdObject[row.group_id].category_id.push(row.category_id);
			}
		}

		return Object.values(groupIdObject);
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

		const result = await this.mysql.query(`
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
				and group_id is not null
				and group_id > 0
			`,
			[owner, ownerId, ownerId, target, targetId, targetId, accountId, accountId, categoryId, categoryId],
		);

		const groupIdObject = {};

		for (const row of result) {

			if (!groupIdObject.hasOwnProperty(row.group_id)) {

				groupIdObject[row.group_id] = {...row, category_id: [row.category_id]};
			}

			else {

				groupIdObject[row.group_id].category_id.push(row.category_id);
			}
		}

		return Object.values(groupIdObject);
	}
};

