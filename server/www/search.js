const API = require('../utils/api');
const users = require('./users').list;
const dashboards = require('./dashboards').list;
const reports = require('./reports/report').list;

exports.query = class extends API {

	async query() {

		this.request.body = {
			search: `%${this.request.query.text}%`
		};

		const search_set = [users, dashboards, reports];
		let response = [];

		for(const item of search_set) {

			const obj = Object.assign(new item(), this);
			let list;

			try {
				list = await obj.list();
			}
			catch (e) {
				list = [];
			}

			response = response.concat(list);
		}

		return response;
	}
}