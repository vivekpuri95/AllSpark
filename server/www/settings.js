const API = require("../utils/api");
const account = require('../onServerStart');
const commonFun = require("../utils/commonFunctions");

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.profile, "profile not found");
		this.assert(this.request.body.owner, "owner not found");
		this.assert(this.request.body.account_id, "account id not found");
		this.assert(commonFun.isJson(this.request.body.value), "Please send valid JSON");

		return await this.mysql.query(`
				INSERT INTO
					tb_settings
					(
						account_id,
						profile,
						owner,
						value
					)
				VALUES
					(?, ?, ?, ?)
				`,
			[this.request.body.account_id, this.request.body.profile, this.request.body.owner, this.request.body.value],
			"write");
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.id, "no id found to update");
		this.assert(commonFun.isJson(this.request.body.value), "Please send valid JSON");

		await account.loadAccounts();

		return await this.mysql.query("UPDATE tb_settings SET profile = ?, value = ? WHERE id = ?", [this.request.body.profile, this.request.body.value, this.request.body.id], "write");
	}
};


exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.id, "no id found to delete");

		await account.loadAccounts();

		return await this.mysql.query("DELETE FROM tb_settings WHERE id = ?", [this.request.body.id], "write");
	}
};

exports.list = class extends API {

	async list() {

		this.user.privilege.needs("administrator");

		const settingsList = await this.mysql.query("select * from tb_settings where account_id = ?", [this.request.query.account_id]);

		for(const row of settingsList) {
			try {
				row.value = JSON.parse(row.value);
			}
			catch(e) {}
		}

		await account.loadAccounts();

		return settingsList;
	}
};

