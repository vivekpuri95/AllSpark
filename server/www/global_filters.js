const API = require('../utils/api');

exports.list = class extends API {

	async list() {
		return await this.mysql.query(`SELECT * FROM tb_global_filters WHERE account_id=?`, [this.account.account_id]);
	}
};

exports.insert = class extends API {
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
}

exports.update = class extends API {
	async update() {
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
			`UPDATE tb_global_filters SET ? WHERE id = ?`,
			[params, this.request.body.id],
			'write'
		);
	}
}

exports.delete = class extends API {
	async delete() {
		this.user.privilege.needs('administrator');

		return await this.mysql.query(
			`DELETE FROM tb_global_filters WHERE id = ?`,
			[this.request.body.id],
			'write'
		);
	}
}