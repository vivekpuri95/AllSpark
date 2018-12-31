const API = require('../utils/api');

class GlobalFilters extends API {

	async list() {

		this.user.privilege.needs('administrator', 'ignore');

		const result = await this.mysql.query(
			`SELECT * FROM tb_global_filters WHERE account_id = ?`,
			[this.account.account_id]
		);

		for(const data of result) {

			data.placeholder = data.placeholder.split(',');
		}

		return result;
	};

	async insert({name, placeholder, dashboard_id, description = '', order = null, default_value = '', multiple = null, type = null, offset, dataset} = {}) {

		this.user.privilege.needs('administrator', 'ignore');

		this.assert(name && placeholder, 'Name or Placeholder is missing');

		const params = {
			account_id: this.account.account_id,
			name,
			dashboard_id,
			placeholder,
			description,
			order: isNaN(parseInt(order)) ? null : parseInt(order),
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

	async update({id, name, placeholder, dashboard_id, description = '', order = null, default_value = '', multiple = null, type = null, offset, dataset} = {}) {

		this.user.privilege.needs('administrator', 'ignore');

		this.assert(id, 'Global filter id is required');
		this.assert(name && placeholder, 'Name or Placeholder cannot be null or empty');

		const params = {
			name, placeholder, description, default_value, multiple, type, dashboard_id,
			order: isNaN(parseInt(order)) ? null : parseInt(order),
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

		this.user.privilege.needs('administrator', 'ignore');

		this.assert(id, 'Global filter id is required');

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