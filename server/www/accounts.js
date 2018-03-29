const API = require('../utils/api.js');

exports.list = class extends API {

	async list() {

		this.user.privilege.needs('administrator');

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
			`);

		const accountObj = {};

		accountList.map(x => {

			accountObj[x.account_id] =  JSON.parse(JSON.stringify(x));

			delete accountObj[x.account_id]['profile'];
			delete accountObj[x.account_id]['value'];

			if (!accountObj[x.account_id].settings) {

				accountObj[x.account_id].settings = [];
			}

			accountObj[x.account_id].settings.push({
				profile: x.profile,
				value: JSON.parse(x.value),
			})
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

		return await this.mysql.query(
			`INSERT INTO tb_accounts SET ?`,
			payload,
			'write'
		);
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

		const values = [setParams, account_id];

		return await this.mysql.query(
			`UPDATE tb_accounts SET ? WHERE account_id = ?`,
			values,
			'write'
		);
	}
}

exports.delete = class extends API {

	async delete() {

		return await this.mysql.query(
			`UPDATE tb_accounts SET status = 0 WHERE account_id = ?`,
			this.request.body.account_id,
			'write'
		);
	}
}