const API = require("../utils/api");

class Tests extends API {

	async test() {
		return 'a';
	}

	async changeFilterOffsetFormat() {

		for(const filter of await this.mysql.query('SELECT * FROM tb_query_filters')) {

			if(isNaN(parseInt(filter.offset)))
				continue;

			let type = 'day';

			if(filter.type == 'datetime')
				type = 'seconds';

			else if(filter.type == 'month')
				type = 'month';

			else if(filter.type == 'year')
				type = 'year';

			filter.offset = [{
				value: Math.abs(filter.offset),
				unit: type,
				direction: filter.offset > 0 ? 1 : -1,
				snap: true,
			}];

			await this.mysql.query(
				'UPDATE tb_query_filters SET offset = ? WHERE filter_id = ?',
				[JSON.stringify(filter.offset), filter.filter_id]
			);
		}
	}
}

exports.test = Tests;
exports.changeFilterOffsetFormat = Tests;