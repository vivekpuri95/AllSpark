const API = require('../utils/api');
const errorLogs = require('../utils/errorLogs');
const dbConfig = require('config').get("sql_db");

class Error extends API {

	async list() {
		const db = dbConfig.write.database.concat('_logs');

		return await this.mysql.query(`SELECT * FROM ${db}.tb_errors WHERE user_id = ? and session_id = ?`, [this.request.query.user_id, this.request.query.session_id]);
	}

	async log() {

		let error = {
			account_id : this.account.account_id,
			user_id : this.user.user_id,
			message : this.request.body.message,
			url : this.request.body.url,
			description : this.request.body.description,
			type : this.request.body.type,
			user_agent: this.request.get('user-agent'),
		};

		return await errorLogs.insert(error);
	}

};

exports.list = Error;
exports.log = Error;