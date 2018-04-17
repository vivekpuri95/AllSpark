const API = require('../utils/api');

exports.log = class extends API{

	async log() {

		const error = {
			account_id : this.account.account_id,
			user_id : this.user.user_id,
			message : this.request.body.message,
			url :  this.request.body.url,
			description : this.request.body.description,
			type : this.request.body.type
		};

		return await this.mysql.query('INSERT INTO tb_errors SET ?', error, 'write');
	}

}