const API = require('../utils/api');
const user_search = require('./users').userSearch;

exports.query = class extends API {

	async query() {

		let user_obj = Object.assign(new user_search(), this);
		const searchInput = this.request.query.text;

		const user_results =  await user_obj.userSearch(this.request.query.text);
		const response = [];

		// for(const user of user_results) {
		//
		// 	for(const key of Object.keys(user)){
		//
		// 		if((user[key].toString()).includes(searchInput)){
		// 			response.push({
		// 				id: user.user_id,
		// 				name: user[key],
		// 				superset: 'Users',
		// 				href: '/users'
		// 			});
		// 		}
		// 	}
		// }

		for(const key of Object.keys(user_results[0])) {

			user_results.map(user => {

				const temp = typeof user[key] == 'string' ? user[key].toLowerCase() : user[key].toString();

				if(temp.includes(searchInput)) {
					console.log(user[key]);
					response.push({
						id: user.user_id,
						name: user[key],
						superset: 'Users',
						href: '/users'
					});
				}
			});
		}

		return response;
	}
}