const API = require('../utils/api');
const users = require('./users').list;
const dashboards = require('./dashboards').list;
const datasets = require('./datasets').list;

exports.query = class extends API {

	async query() {

		this.request.body = {
			search: this.request.query.text
		};

		const searchInput = this.request.query.text;

		const user_obj = Object.assign(new users(), this);
		const dashboards_obj = Object.assign(new dashboards(), this);
		const datasets_obj = Object.assign(new datasets(), this);

		const user_list =  await user_obj.list();
		const dashboard_list = await dashboards_obj.list();
		const dataset_list = await datasets_obj.list();

		console.log(dataset_list);

		const response = [];


		for(const user of user_list) {

			user.name = user.first_name.concat(' ', user.last_name);

			for(const key of ['user_id', 'phone', 'email', 'first_name', 'last_name']) {

				const temp = typeof user[key] == 'string' ? user[key].toLowerCase() : user[key].toString();

				if(temp.includes(searchInput)) {

					user[key] = ['first_name', 'last_name'].includes(key) ? user.name : user[key];

					response.push({
						id: user.user_id,
						name: user[key],
						superset: 'Users',
						href: `/user/profile/${user.user_id}`
					});
				}
			}
		}

		for(const db of dashboard_list) {

			if(db.name.toLowerCase().includes(searchInput)) {

				response.push({
					id: db.id,
					name: db.name,
					superset: 'Dashboards',
					href: `/dashboard/${db.id}`
				});
			}
		}

		for(const dataset of dataset_list) {

			for(const key of ['id', 'name']) {

				const temp = typeof dataset[key] == 'string' ? dataset[key].toLowerCase() : dataset[key].toString();

				if(temp.includes(searchInput)) {

					response.push({
						id: dataset.id,
						name: dataset[key],
						superset: 'Datasets',
						href: '/settings'
					});
				}
			}
		}


		return response;
	}
}