const API = require('../utils/api.js');

exports.query = class extends API {
	async query() {
		this.user.privilege.needs('report');

		let data;
		try {
			data = JSON.parse(this.request.body.json);
		}
		catch (e) {
			throw new API.Exception(400, 'Invalid JSON format!');
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

		const query_id = query.insertId;

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

		return query;
	}
}

exports.dashboard = class extends API {
	async dashboard() {

		let data;
		try {
			data = JSON.parse(this.request.body.json);
		}
		catch (e) {
			return e;
		}

		let insertQuery = new exports.query();
		insertQuery = Object.assign(insertQuery, this);

		let query_id = [];
		for (const query of data.query) {
			if (query) {
				insertQuery.request.body.json = JSON.stringify(query);
				query_id.push((await insertQuery.query()).insertId);
			}
		}

		var queryItr = query_id[Symbol.iterator]();
		try {
			data.dashboard.format.reports = data.dashboard.format.reports.map((report) => {
				report.query_id = queryItr.next().value;
				return report;
			});
		}
		catch (e) {
			throw new API.Exception(400, 'Invalid Reports');
		}

		data.dashboard.account_id = this.account.account_id;
		data.dashboard.added_by = this.user.user_id;
		data = await this.mysql.query('INSERT INTO tb_dashboards SET ?', data.dashboard, 'write');

		return data.insertId;
	}
};