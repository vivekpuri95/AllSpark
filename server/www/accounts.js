const API = require('../utils/api.js');
const account = require('../onServerStart');
const commonFun = require("../utils/commonFunctions");


exports.list = class extends API {

	async list() {

		this.user.privilege.needs('administrator');

		const accountList = await this.mysql.query(`	
			SELECT
				a.*,
				s.profile,
				s.value,
				group_concat(distinct f.feature_id) as features
			FROM
				tb_accounts a
			LEFT JOIN
				tb_settings s
			ON
				s.account_id = a.account_id
				AND s.owner = 'account'
			LEFT JOIN
				tb_account_features f
			ON 
				a.account_id = f.account_id
				AND f.status = 1
			WHERE
				a.status = 1
				group by profile, account_id
		`);

		this.assert(accountList.length, "Account not found :(");
		const accountObj = {};

		accountList.map(x => {

			if (!accountObj[x.account_id]) {
				accountObj[x.account_id] = JSON.parse(JSON.stringify(x));
			}

			delete accountObj[x.account_id]['profile'];
			delete accountObj[x.account_id]['value'];
			delete accountObj[x.account_id]['features'];

			if (!accountObj[x.account_id].settings) {

				accountObj[x.account_id].settings = [];
			}

			accountObj[x.account_id].settings.push({
				profile: x.profile,
				value: JSON.parse(x.value),
			});

			accountObj[x.account_id].features = x.features.split(',');
		});

		return Object.values(accountObj);
	}
};

exports.get = class extends API {

	async get() {

		const accountList = await this.mysql.query(`
			SELECT
				a.*,
				s.profile,
				s.value
			FROM
				tb_accounts a
			LEFT JOIN
				tb_settings s
			ON
				s.account_id = a.account_id
				AND s.owner = 'account'
			WHERE
				a.status = 1
				and a.account_id = ?
			`,
			[this.account.account_id]);

		this.assert(accountList.length, "Account not found :(");

		const accountObj = {
			settings: [],
		};

		Object.assign(accountObj, accountList[0]);

		accountList.map(x => {

			let settings = {};

			try {
				settings = JSON.parse(x.value);
			} catch(e) {};

			accountObj.settings.push({
				profile: x.profile,
				value: settings,
			});
		});

		delete accountObj['value'];
		delete accountObj['profile'];

		return accountObj;
	}
};

exports.insert = class extends API {

	async insert() {

		let payload = {};

		for (const values in this.request.body) {
			payload[values] = this.request.body[values];
		}

		delete payload.settings;
		delete payload.token;
		delete payload.access_token;

		const result = await this.mysql.query(
			`INSERT INTO tb_accounts SET ?`,
			payload,
			'write'
		);

		this.assert(result.insertId, "account not inserted");

		let settings, insertList = [];

		if(this.request.body.settings) {
			this.assert(commonFun.isJson(this.request.body.settings), "settings is not in JSON format");
			settings = JSON.parse(this.request.body.settings);

			for(const setting of settings) {

				insertList.push([result.insertId, "account", setting.profile, JSON.stringify(setting.value)]);
			}
		}

		await this.mysql.query(`
			INSERT INTO
				tb_settings
				(
					account_id,
					owner,
					profile,
					value
				) 
				VALUES (?) ON DUPLICATE KEY UPDATE profile = VALUES(profile), value = VALUES(value)
			`,
			insertList,
			"write");

        await account.loadAccounts();
        return result;
	}
}

exports.update = class extends API {

	async update() {

		const keys = Object.keys(this.request.body);

		const payload = this.request.body,
			account_id = payload.account_id,
			setParams = {};

		for (const key in payload) {
			if (~keys.indexOf(key) && key != 'account_id')
				setParams[key] = payload[key] || null;
		}

		delete setParams.settings;
		delete setParams.token;
		delete setParams.access_token;

		const values = [setParams, account_id];

		const result = await this.mysql.query(
			`UPDATE tb_accounts SET ? WHERE account_id = ?`,
			values,
			'write'
		);

		let settings, insertList = [];

		if(this.request.body.settings) {

			this.assert(commonFun.isJson(this.request.body.settings), "settings is not in JSON format");

			settings = JSON.parse(this.request.body.settings);

			for(const setting of settings) {

				insertList.push([account_id, "account", setting.profile, JSON.stringify(setting.value)]);
			}
		}

		await this.mysql.query(`
			INSERT INTO
				tb_settings
				(
					account_id,
					owner,
					profile,
					value
				) 
				VALUES (?) ON DUPLICATE KEY UPDATE profile = VALUES(profile), value = VALUES(value)
			`,
			insertList,
			"write");

        await account.loadAccounts();
        return result;
	}
}

exports.delete = class extends API {

	async delete() {

		const result = await this.mysql.query(
			`UPDATE tb_accounts SET status = 0 WHERE account_id = ?`,
			this.request.body.account_id,
			'write'
		);

        await account.loadAccounts();
        return result;
	}
}