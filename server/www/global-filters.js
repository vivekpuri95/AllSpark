const API = require('../utils/api');

class GlobalFilters extends API {

	async list() {

		const result = await this.mysql.query(`SELECT * FROM tb_global_filters WHERE account_id = ?`, [this.account.account_id]);

		for(const data of result) {

			data.placeholder = data.placeholder.split(',');
		}

		return result;
	};

	async insert({name, placeholder, default_value, multiple, type, offset, dataset} = {}) {

		this.user.privilege.needs('administrator');

		const params = {
			account_id: this.account.account_id,
			name,
			placeholder,
			default_value,
			multiple,
			type,
			offset: isNaN(parseInt(offset)) ? null : parseInt(offset),
			dataset: parseInt(dataset) || null,
		};

		return await this.mysql.query(
			`INSERT INTO tb_global_filters SET ?`,
			[params],
			'write'
		);
	}

	async update({id, name, placeholder, default_value, multiple, type, offset, dataset} = {}) {

		this.user.privilege.needs('administrator');

		const params = {
			name, placeholder, default_value, multiple, type,
			offset: isNaN(parseInt(offset)) ? null : parseInt(offset),
			dataset: parseInt(dataset) || null,
		};

		return await this.mysql.query(
			`UPDATE tb_global_filters SET ? WHERE id = ? and account_id = ?`,
			[params, id, this.account.account_id],
			'write'
		);
	}

	async delete({id} = {}) {

		this.user.privilege.needs('administrator');

		return await this.mysql.query(
			`DELETE FROM tb_global_filters WHERE id = ? and account_id = ?`,
			[id, this.account.account_id],
			'write'
		);
	}
};

exports.list = GlobalFilters;
exports.insert = GlobalFilters;
exports.update = GlobalFilters;
exports.delete = GlobalFilters;