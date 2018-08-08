const API = require('../utils/api');
const sessions = require('../utils/sessions').sessions;
const commonFun = require('../utils/commonFunctions');

class SessionLogs extends API {

	async insert() {

		const user_agent = new commonFun.UserAgent(this.request.get('user-agent'));

		let params = {
			user_id: this.request.body.user_id,
			type: this.request.body.type,
			description: this.request.body.description,
			user_agent: this.request.get('user-agent'),
			os: user_agent.os,
			browser: user_agent.browser,
			refresh_token: this.request.body.refresh_token,
			ip: this.request.connection.remoteAddress,
		};

		return await sessions.insert(params);
	}
}

exports.insert = SessionLogs;