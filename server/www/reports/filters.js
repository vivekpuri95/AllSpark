const API = require('../../utils/api');
const auth = require('../../utils/auth');
const reportHistory = require('../../utils/reportLogs');

class Filters extends API {

	async insert({name, query_id, placeholder, description = null, order, default_value = '', offset, type, dataset, multiple = 0} = {}) {

		this.assert(query_id, 'Query id is required');
		this.assert(name && placeholder, 'Name or placeholder is required');

		let values = {
			name, query_id, placeholder, type, multiple, default_value, description,
			order: isNaN(parseInt(order)) ? null : parseInt(order),
			offset: isNaN(parseInt(offset)) ? null : parseInt(offset),
			dataset: isNaN(parseInt(dataset)) ? null : parseInt(dataset),
		};

		if((await auth.report(query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		return await this.mysql.query('INSERT INTO tb_query_filters SET  ?', [values], 'write');
	}

	async update({filter_id, name, placeholder, description = null, order, default_value = '', offset, type, dataset, multiple = 0} = {}) {

		this.assert(filter_id, 'Filter id is required');
		this.assert(name && placeholder, 'Name or placeholder is required');

		let
			values = {
				name, placeholder, type, multiple, default_value, description,
				order: isNaN(parseInt(order)) ? null : parseInt(order),
				offset: isNaN(parseInt(offset)) ? null : parseInt(offset),
				dataset: isNaN(parseInt(dataset)) ? null : parseInt(dataset),
			},
			[filterQuery] = await this.mysql.query('SELECT * FROM tb_query_filters WHERE filter_id = ?', [filter_id]),
			compareJson = {};

		this.assert(filterQuery, 'Invalid filter id');

		if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		for(const key in values) {

			compareJson[key] = filterQuery[key] == null ? null : filterQuery[key].toString();
		}

		if(JSON.stringify(compareJson) == JSON.stringify(values)) {

			return "0 rows affected";
		}

		values.default_value = values.default_value || '';

		const
			updateResponse = await this.mysql.query('UPDATE tb_query_filters SET ? WHERE filter_id = ?', [values, filter_id], 'write'),
			logs = {
				query_id: filterQuery.query_id,
				owner: 'filter',
				owner_id: filter_id,
				value: JSON.stringify(filterQuery),
				operation:'update',
			};

		reportHistory.insert(this, logs);

		return updateResponse;
	}

	async delete({filter_id} = {}) {

		this.assert(filter_id, 'Filter id is required');

		const [filterQuery] = await this.mysql.query('SELECT * FROM tb_query_filters WHERE filter_id = ?', [filter_id]);

		this.assert(filterQuery, 'Invalid filter id');

		if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		const
			deleteResponse = await this.mysql.query('DELETE FROM tb_query_filters WHERE filter_id = ?', [filter_id], 'write'),
			logs = {
				query_id: filterQuery.query_id,
				owner: 'filter',
				owner_id: filter_id,
				value: JSON.stringify(filterQuery),
				operation:'delete',
			};

		reportHistory.insert(this, logs);

		return deleteResponse;
	}

}

exports.insert = Filters;
exports.update = Filters;
exports.delete = Filters;