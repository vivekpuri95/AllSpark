const API = require('../utils/api');
const users = require('./users').list;
const dashboards = require('./dashboards').list;
const datasets = require('./datasets').list;
const reports = require('./reports/report').list;

exports.query = class extends API {

	async query() {

		this.request.body = {
			search: this.request.query.text
		};

		const user_obj = Object.assign(new users(), this);
		const dashboards_obj = Object.assign(new dashboards(), this);
		const datasets_obj = Object.assign(new datasets(), this);
		const report_obj = Object.assign(new reports(), this);

		let user_list, dashboard_list, dataset_list, report_list;

		[user_list, dashboard_list, dataset_list, report_list] = await Promise.all([
			await user_obj.list(),
			await dashboards_obj.list(),
			await datasets_obj.list(),
			await report_obj.list()
		]);

		let response = [].concat(report_list).concat(user_list).concat(dataset_list).concat(dashboard_list);

		return response;
	}
}