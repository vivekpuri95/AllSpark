const API = require('../../utils/api');
const auth = require('../../utils/auth');
const reportHistory = require('../../utils/reportLogs');

class Filters extends API {

	async insert({name, query_id, placeholder, description = null, order, default_value = '', offset, type = null, dataset, multiple = null} = {}) {

		this.assert(query_id, 'Query id is required');
		this.assert(name && placeholder, 'Name or placeholder is missing');

		let values = {
			name, query_id, placeholder, type, multiple, default_value, description,
			order: isNaN(parseInt(order)) ? null : parseInt(order),
			offset: isNaN(parseInt(offset)) ? null : parseInt(offset),
			dataset: isNaN(parseInt(dataset)) ? null : parseInt(dataset),
		};

		if((await auth.report(query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		const
			insertResponse = await this.mysql.query('INSERT INTO tb_query_filters SET  ?', [values], 'write'),
			[loggedRow] = await this.mysql.query(
				'SELECT * FROM tb_query_filters WHERE filter_id = ?',
				[insertResponse.insertId]
			),
			logs = {
				owner: 'filter',
				owner_id: insertResponse.insertId,
				state: JSON.stringify(loggedRow),
				operation:'insert',
			};

		reportHistory.insert(this, logs);

		return insertResponse;
	}

	async update({filter_id, name, placeholder, description = null, order, default_value = '', offset, type = null, dataset, multiple = null} = {}) {

		this.assert(filter_id, 'Filter id is required');
		this.assert(name && placeholder, 'Name or placeholder is missing');

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
			filterQuery[key] = values[key];
		}

		if(JSON.stringify(compareJson) == JSON.stringify(values)) {

			return "0 rows affected";
		}

		const
			updateResponse = await this.mysql.query('UPDATE tb_query_filters SET ? WHERE filter_id = ?', [values, filter_id], 'write'),
			logs = {
				owner: 'filter',
				owner_id: filter_id,
				state: JSON.stringify(filterQuery),
				operation:'update',
			};

		reportHistory.insert(this, logs);

		return updateResponse;
	}

	async delete({filter_id} = {}) {

		this.assert(filter_id, 'Filter id is required');

		const [filterQuery] = await this.mysql.query('SELECT * FROM tb_query_filters WHERE filter_id = ?', [filter_id]);

		this.assert(filterQuery, 'Invalid filter id');

		if((await auth.report(filterQuery.query_id, this.user)).error) {

			throw new API.Exception(404, 'User not authenticated for this report');
		}

		const
			deleteResponse = await this.mysql.query('DELETE FROM tb_query_filters WHERE filter_id = ?', [filter_id], 'write'),
			logs = {
				owner: 'filter',
				owner_id: filter_id,
				state: JSON.stringify(filterQuery),
				operation:'delete',
			};

		reportHistory.insert(this, logs);

		return deleteResponse;
	}

}

exports.insert = Filters;
exports.update = Filters;
exports.delete = Filters;