const API = require('../utils/api');

class Global_filters extends API {

	async list() {
		const result = await this.mysql.query(`SELECT * FROM tb_global_filters WHERE account_id = ?`, [this.account.account_id]);

		for(const data of result) {
			data.placeholder = data.placeholder.split(',');
		}

		return result;
	};

	async insert() {
		this.user.privilege.needs('administrator');

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			placeholder: this.request.body.placeholder,
			default_value: this.request.body.default_value,
			multiple: this.request.body.multiple,
			type: this.request.body.type,
			offset: this.request.body.offset || null,
			dataset: this.request.body.dataset,
		};

		return await this.mysql.query(
			`INSERT INTO tb_global_filters SET ?`,
			[params],
			'write'
		);
	}

	async update() {
		this.user.privilege.needs('administrator');

		const params = {
			name: this.request.body.name,
			placeholder: this.request.body.placeholder,
			default_value: this.request.body.default_value,
			multiple: this.request.body.multiple,
			type: this.request.body.type,
			offset: this.request.body.offset || null,
			dataset: this.request.body.dataset,
		};

		return await this.mysql.query(
			`UPDATE tb_global_filters SET ? WHERE id = ? and account_id = ?`,
			[params, this.request.body.id, this.account.account_id],
			'write'
		);
	}

	async delete() {
		this.user.privilege.needs('administrator');

		return await this.mysql.query(
			`DELETE FROM tb_global_filters WHERE id = ? and account_id = ?`,
			[this.request.body.id, this.account.account_id],
			'write'
		);
	}
};

exports.list = Global_filters;
exports.insert = Global_filters;
exports.update = Global_filters;
exports.delete = Global_filters;