const API = require("../utils/api");

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.profile, "profile not found");
		this.assert(this.request.body.owner, "owner not found");
		this.assert(this.request.body.account_id, "account id not found");

		const valueObj = {...this.request.body};

		delete valueObj["profile"];
		delete valueObj["owner"];
		delete valueObj["token"];
		delete valueObj["account_id"];

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
			[this.request.body.account_id, this.request.body.profile, this.request.body.owner, JSON.stringify(valueObj)],
			"write");
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.id, "no id found to update");

		const obj = {...this.request.body};

		delete obj["token"];

		const profile = obj.profile;

		if(profile) {

			delete obj["profile"];

			return await this.mysql.query("UPDATE tb_settings SET profile = ?, value = ? WHERE id = ?", [profile, JSON.stringify(obj), this.request.body.id], "write");
		}
		else {
			return await this.mysql.query("UPDATE tb_settings SET value = ? WHERE id = ?", [JSON.stringify(obj), this.request.body.id],
				"write");
		}
	}
};


exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("administrator");

		this.assert(this.request.body.id, "no id found to delete");

		return await this.mysql.query("DELETE FROM tb_settings WHERE id = ?", [this.request.body.delete], "write");
	}
};

exports.list = class extends API {

	async list() {

		this.user.privilege.needs("administrator");

		const settingsList = await this.mysql.query("select * from tb_settings");
		for(const row of settingsList) {

			row.value = JSON.parse(row.value);
		}

		return settingsList;
	}
};

