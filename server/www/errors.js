const API = require('../utils/api');
const errorLogs = require('../utils/errorLogs');

exports.log = class extends API {

	async log() {

		let error = {
			account_id : this.account.account_id,
			user_id : this.user.user_id,
			message : this.request.body.message,
			url : this.request.body.url,
			description : this.request.body.description,
			type : this.request.body.type,
		};

		return await errorLogs.insert(error);
	}

};