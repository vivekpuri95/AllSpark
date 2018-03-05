const API = require('../utils/api.js');

exports.list = class extends API {

	async list() {

		return await this.mysql.query(`SELECT * FROM tb_accounts WHERE status = 1`);
	}
}

exports.insert = class extends API {

	async insert() {

		let payload = {};

		for(const values in this.request.body) {
			payload[values] = this.request.body[values];
		}

		return await this.mysql.query(
			`INSERT INTO tb_accounts SET ?`,
			payload,
			'allSparkWrite'
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
			'allSparkWrite'
		);
	}
}

exports.delete = class extends API {

	async delete() {

		return await this.mysql.query(
			`UPDATE tb_accounts SET status = 0 WHERE account_id = ?`,
			this.request.body.account_id,
			'allSparkWrite'
		);
	}
}