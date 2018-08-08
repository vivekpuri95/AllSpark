const API = require('../utils/api');
const commonFun = require('../utils/commonFunctions');
const atob = require('atob');

class SessionLogs extends API {

	async list() {

		this.user.privilege.needs('user');

		return await this.mysql.query(`SELECT * FROM tb_sessions WHERE account_id = ?`, [this.user.user_id]);
	};

	async insert() {

		const user_agent = new commonFun.UserAgent(this.request.get('user-agent'));

		let params = {
			user_id: this.request.body.user_id,
			type: this.request.body.type,
			user_agent: this.request.get('user-agent'),
			expire_time: this.request.body.expire_time,
			os: user_agent.os,
			browser: user_agent.browser,
			refresh_token: this.request.body.refresh_token,
			ip: this.request.connection.remoteAddress,
		};

		if(params.type != 'login' && params.refresh_token) {

			const check_token = await commonFun.verifyJWT(params.refresh_token);

			if(check_token.error && check_token.message != 'jwt expired')
				return check_token.message;

			const token_details = JSON.parse(atob(params.refresh_token.split('.')[1]));

			params.user_id = token_details.user_id;
			params.session_id = token_details.sessionId;
		}

		delete(params['refresh_token']);

		const result = await this.mysql.query(
			`INSERT INTO tb_sessions SET ?`,
			[params],
			'write'
		);

		return result;
	}
}

exports.insert = SessionLogs;
exports.sessions = (() => new SessionLogs)();