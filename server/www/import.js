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
			tags: data.tags,
			is_enabled: data.is_enabled,
			is_deleted: data.is_deleted,
			is_redis: data.is_redis,
			refresh_rate: data.refresh_rate,
			roles: data.roles,
			format: JSON.stringify(data.format),
			connection_name: data.connection_name
		};

		query = await this.mysql.query('INSERT INTO tb_query SET ?', [query], 'write');
		if (query.affectedRows != 1)
			return 'Invalid Query Entry';

		const query_id = query.insertId;

		let visualizations = data.visualizations;

		visualizations = visualizations.map((visualization) => {
			return {
				query_id: query_id,
				name: visualization.name,
				type:visualization.type,
				options: visualization.options
			}
		});

		const visualizationsIds = [];
		for (const visualization of visualizations){
			visualizationsIds.push((await this.mysql.query(
				`INSERT INTO tb_query_visualizations SET ?`,
				[visualization],
				'write'
			)).insertId);
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

		query.visualizationIds = [];

		for (const index in data.visualizations) {
			const id = data.visualizations[index].visualization_id;
			query.visualizationIds.push({old_id: id, new_id: visualizationsIds[index]});
		}

		return query;
	}
}

exports.dashboard = class extends API {

	async dashboard() {

		let visualizations, data;

		try {
			data = JSON.parse(this.request.body.json);
		}
		catch (e) {
			throw new API.Exception(400, 'Invalid JSON format!');
		}

		visualizations = data.dashboard.format.reports;
		delete data.dashboard.format;

		data.dashboard.account_id = this.account.account_id;
		data.dashboard.added_by = this.user.user_id;
		const dashboardId = (await this.mysql.query('INSERT INTO tb_dashboards SET ?', data.dashboard, 'write')).insertId;


		let insertQuery = new exports.query();
		insertQuery = Object.assign(insertQuery, this);

		let visualizationsIds = [];
		for (const query of data.query) {
			if (query) {
				insertQuery.request.body.json = JSON.stringify(query);
				visualizationsIds.push((await insertQuery.query()).visualizationIds);
			}
		}

		const dashboardVisualization = [];

		for (const visualization of visualizations) {

			for (const idMap of visualizationsIds) {

				for (const idObj of idMap) {

					if (idObj.old_id == visualization.visualization_id) {

						dashboardVisualization.push(['dashboard', dashboardId, idObj.new_id, JSON.stringify(visualization.format)]);
					}
				}
			}
		}

		await this.mysql.query(
			'INSERT INTO tb_visualization_canvas(owner, owner_id, visualization_id, format) VALUES ?',
			[dashboardVisualization],
			'write'
		);

		return true;
	}
};