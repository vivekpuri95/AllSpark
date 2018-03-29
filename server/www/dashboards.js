const API = require('../utils/api');

exports.list = class extends API {

	async list() {

		const rows = await this.mysql.query(
			'SELECT * FROM tb_dashboards where status = 1 AND account_id = ?',
			[this.account.account_id]
		);

		for(const row of rows) {

			try {
				row.format = JSON.parse(row.format);
			} catch(e) {
				row.format = {};
			}
		}

		return rows;
	}
};

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('dashboard');

		let
			values = {},
			columns = ['name', 'parent', 'icon', 'roles', 'format'];

		for(const key in this.request.body) {
			if(columns.includes(key))
				values[key] = this.request.body[key] || null;
		}

		// Make sure the format is valid JSON
		try {
			values.format = JSON.stringify(JSON.parse(values.format))
		} catch(e) {
			values.format = JSON.stringify({});
		}

		values.account_id = this.account.account_id;

		return await this.mysql.query('INSERT INTO tb_dashboards SET ? ', [values], 'write');
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs('dashboard');

		const
			values = {},
			columns = ['name', 'parent', 'icon', 'roles', 'format'];

		for(const key in this.request.body) {
			if(columns.includes(key))
				values[key] = this.request.body[key] || null;
		}

		// Make sure the format is valid JSON
		try {
			values.format = JSON.stringify(JSON.parse(values.format))
		} catch(e) {
			values.format = JSON.stringify({});
		}

		return await this.mysql.query(
			'UPDATE tb_dashboards SET ? WHERE id = ? AND account_id = ?',
			[values, this.request.body.id, this.account.account_id],
			'write'
		);
	}
};

exports.updateFormat = class extends API {

	async updateFormat() {

		this.user.privilege.needs('dashboard');

		// Make sure the format is valid JSON
		try {
			JSON.stringify(JSON.parse(this.request.body.format))
		} catch(e) {
			throw new API.Exception(400, 'Bad dashboard format! :(');
		}

		return await this.mysql.query(
			'UPDATE tb_dashboards SET format = ? WHERE id = ? AND account_id = ?',
			[this.request.body.format, this.request.body.id, this.account.account_id],
			'write'
		);
	}
};

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('dashboard');

		return await this.mysql.query(
			'UPDATE tb_dashboards SET status = 0 WHERE id = ? AND account_id = ?',
			[this.request.body.id, this.account.account_id],
			'write'
		);
	}
};