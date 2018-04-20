const API = require('../utils/api.js');

exports.jsonInsert = class extends API {
	async jsonInsert() {
		this.user.privilege.needs('report');

		let query = JSON.parse(this.request.body.json);
		query.account_id = this.account.account_id;
		query.added_by = this.user.user_id;
		delete query.query_id;
		delete query.added_by_name;
		delete query.created_at;
		delete query.updated_at;
		delete query.filters;
		delete query.visualizations;

		query = await this.mysql.query('INSERT INTO tb_query SET ?', [query], 'write');
		if (query.affectedRows != 1)
			return 'Invalid Query Entry';

		let query_id = await this.mysql.query('SELECT query_id FROM tb_query ORDER BY created_at DESC LIMIT 1');
		query_id = query_id[0].query_id;

		let visualizations = JSON.parse(this.request.body.json).visualizations;
		let final_v = {};
		final_v.values = [];

		for (let v of visualizations) {
			v.query_id = query_id;
			delete v.visualization_id;
			delete v.created_at;
			delete v.updated_at;

			if (v.type != 'table') {
				final_v.values.push(Object.values(v));
				final_v.keys = Object.keys(v);
			}
		}

		if (final_v.length) {
			final_v = await this.mysql.query(
				`INSERT INTO tb_query_visualizations (??) VALUES ?`,
				[final_v.keys, final_v.values],
				'write'
			);
			if (!final_v.affectedRows)
				return 'Invalid Visualization Entry';
		}

		let filters = JSON.parse(this.request.body.json).filters;
		let filters_keys;
		filters = filters.map((f) => {
			f.query_id = query_id;
			delete f.filter_id;
			delete f.created_at;
			delete f.updated_at;

			filters_keys = Object.keys(f);
			return Object.values(f);
		});

		if (filters.length) {
			filters = await this.mysql.query(
				`INSERT INTO tb_query_filters (??) VALUES ?`,
				[filters_keys, filters],
				'write'
			);
			if (!filters.affectedRows)
				return 'Invalid Filters Entry';
		}

		return true;
	}
}