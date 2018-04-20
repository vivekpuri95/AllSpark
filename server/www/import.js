const API = require('../utils/api.js');

exports.json = class extends API {
	async json() {
		this.user.privilege.needs('report');

		let data;
		try{
			data = JSON.parse(this.request.body.json);
		}
		catch(e){
			return e;
		}

		let query = {
			account_id: this.account.account_id,
			added_by: this.user.user_id,
			name: data.name,
			source: data.source,
			query: data.query,
			url: data.url,
			url_options: data.url_options,
			category_id: data.category_id,
			description: data.description,
			requested_by: data.requested_by,
			tags: data.tags,
			is_enabled: data.is_enabled,
			is_deleted: data.is_deleted,
			is_redis: data.is_redis,
			refresh_rate: data.refresh_rate,
			roles: data.roles,
			format: data.format,
			connection_name: data.connection_name
		};

		query = await this.mysql.query('INSERT INTO tb_query SET ?', [query], 'write');
		if (query.affectedRows != 1)
			return 'Invalid Query Entry';

		let query_id = await this.mysql.query('SELECT query_id FROM tb_query ORDER BY created_at DESC LIMIT 1');
		query_id = query_id[0].query_id;

		let visualizations = data.visualizations;

		visualizations = visualizations.map((visualization) => {
			return [
				query_id,
				visualization.name,
				visualization.type,
				visualization.options
			]
		});

		if (visualizations.length) {
			visualizations = await this.mysql.query(
				`INSERT INTO tb_query_visualizations(query_id, name, type, options) VALUES ?`,
				[visualizations],
				'write'
			);
		}

		let filters = data.filters;
		filters = filters.map((filter) => {
			return [
				filter.name,
				query_id,
				filter.placeholder,
				filter.description,
				filter.default_value,
				filter.offset,
				filter.multiple,
				filter.type,
				filter.dataset
			]
		});

		if (filters.length) {
			filters = await this.mysql.query(
				`INSERT INTO tb_query_filters(name, query_id, placeholder, description, default_value, offset, multiple, type, dataset) VALUES ?`,
				[filters],
				'write'
			);
		}

		return true;
	}
}