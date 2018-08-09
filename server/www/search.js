const API = require('../utils/api');
const users = require('./users').list;
const dashboards = require('./dashboards').list;
const reports = require('./reports/report').list;
const getRole = require('./object_roles').get;

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

exports.user_search = class extends API {

	async user_search() {

		this.user.privilege.needs('user');

		const
			userObj = Object.assign(new users() , this),
			userList = await userObj.list(),
			response = [];

		for(const user of userList) {

			if(!user.user_id.toString().includes(this.request.query.id))
				continue;

			if(!user.name.toLowerCase().includes(this.request.query.name.toLowerCase()))
				continue;

			if(!user.email.toLowerCase().includes(this.request.query.email.toLowerCase()))
				continue;

			if(this.request.query.category_id) {

				if(typeof this.request.query.category_id == 'string')
					this.request.query.category_id = [this.request.query.category_id];

				const role_len = user.roles.filter(x => this.request.query.category_id.includes(x.category_id.toString())).length;
				const prv_len = user.privileges.filter(x => this.request.query.category_id.includes(x.category_id.toString())).length;

				if(!role_len && !prv_len)
					continue;
			}

			if(this.request.query.role_id || this.request.query.privilege_id) {

				if(typeof this.request.query[this.request.query.search_by + '_id'] == 'string')
					this.request.query[this.request.query.search_by + '_id'] = [this.request.query[this.request.query.search_by + '_id']];

				const len = user[this.request.query.search_by + 's'].filter(x => this.request.query[this.request.query.search_by + '_id'].includes(x[this.request.query.search_by + '_id'].toString())).length;

				if(!len)
					continue;
			}

			response.push(user.user_id);

		}

		return response;

		// const
		// 	objRole = new getRole(),
		// 	privilegeUsers = await this.mysql.query(`
		// 		SELECT
		// 			*
		// 		FROM
		// 			tb_user_privilege p
		// 		JOIN
		// 			tb_categories c
		// 		ON
		// 			c.category_id = p.category_id
		// 		WHERE
		// 			account_id = ?
		// 		`, [this.account.account_id]
		// 	),
		// 	roleUsers = await objRole.get(this.account.account_id, 'user', 'role');
		//
		// this.searchWith = this.request.query.search_by;
		//
		// this.userAccess = {
		// 	privilege: {},
		// 	role: {},
		// };
		//
		// for(const row of roleUsers) {
		//
		// 	if(!this.userAccess.role[row.target_id]) {
		// 		this.userAccess.role[row.target_id] = {};
		// 	}
		//
		// 	if(!this.userAccess.role[row.target_id][row.category_id]) {
		// 		this.userAccess.role[row.target_id][row.category_id] = [];
		// 	}
		//
		// 	this.userAccess.role[row.target_id][row.category_id].push(row.owner_id);
		// }
		//
		// for(const row of privilegeUsers) {
		//
		// 	if(!this.userAccess.role[row.privilege_id]) {
		// 		this.userAccess.role[row.privilege_id] = {};
		// 	}
		//
		// 	if(!this.userAccess.role[row.privilege_id][row.category_id]) {
		// 		this.userAccess.role[row.privilege_id][row.category_id] = [];
		// 	}
		//
		// 	this.userAccess.role[row.privilege_id][row.category_id].push(row.user_id);
		// }
		//
		// let response = [];
		//
		// if(this.request.query.category_id && this.request.query.category_id != 0) {
		//
		// 	if(typeof this.request.query.category_id == 'string')
		// 		this.request.query.category_id = [this.request.query.category_id];
		//
		// 	for(const role_id in this.userAccess.role) {
		//
		// 		for(const category_id of this.request.query.category_id)
		// 			response = response.concat(this.userAccess.role[role_id][category_id]);
		// 	}
		//
		// 	for(const prv in this.userAccess.privilege) {
		//
		// 		for(const category_id of this.request.query.category_id)
		// 			response = response.concat(this.userAccess.privilege[prv][category_id]);
		// 	}
		// }
		// else if(['privilege', 'role'].includes(this.searchWith)) {
		//
		// 	if((typeof this.request.query[this.searchWith + '_id'] == 'object') || (typeof this.request.query.category_id == 'object')) {
		// 		response = this.prepareResponse();
		// 	}
		// 	else {
		// 		response = this.userAccess[this.searchWith][this.request.query[this.searchWith + '_id']] ? this.userAccess[this.searchWith][this.request.query[this.searchWith + '_id']][this.request.query.category_id] : [];
		// 	}
		// }
		// else {
		// 	throw new API.Exception(400, 'Invalid search parameters');
		// }
		//
		// return (response || []);

	}

	prepareResponse() {

		let response = [];

		if(typeof this.request.query[this.searchWith + '_id'] == 'object') {

			for(const id of this.request.query[this.searchWith + '_id']) {
				response = response.concat(this.userAccess[this.searchWith][id][this.request.query.category_id]);
			}
		}
		else if(typeof this.request.query.category_id == 'object') {

			for(const id of this.request.query.category_id)
				response = response.concat(this.userAccess[this.searchWith][this.request.query[this.searchWith + '_id']][id])
		}

		return response;
	}
}