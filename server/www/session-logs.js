const API = require('../utils/api');
const commonFun = require('../utils/commonFunctions');
const dbConfig = require('config').get("sql_db");

class SessionLogs extends API {

	async list() {

		this.user.privilege.needs('user');

		return await this.mysql.query(`SELECT * FROM tb_sessions WHERE account_id = ?`, [this.user.user_id]);
	};

	async insert() {

		const db = dbConfig.write.database.concat('_logs');

		const userAgent = new commonFun.UserAgent(this.request.body.user_agent || this.request.get('user-agent'));

		let params = {
			user_id: this.request.body.user_id,
			type: this.request.body.type,
			user_agent: this.request.body.user_agent || this.request.get('user-agent'),
			expire_time: this.request.body.expire_time,
			os: userAgent.os,
			browser: userAgent.browser,
			refresh_token: this.request.body.refresh_token,
			ip: this.request.headers['x-real-ip'],
		};

		if(params.type == 'login' && this.response) {
			return;
		}

		if(params.type == 'logout' && params.refresh_token) {

			const token_details = await commonFun.getUserDetailsJWT(params.refresh_token);

			if(token_details.error) {
				return;
			}

			params.user_id = token_details.user_id;
			params.session_id = token_details.sessionId;
		}

		delete(params.refresh_token);

		const result = await this.mysql.query(
			`INSERT INTO ??.tb_sessions SET ?`,
			[db, params],
			'write'
		);

		return result;
	}
}

exports.insert = SessionLogs;
exports.sessions = (() => new SessionLogs)();