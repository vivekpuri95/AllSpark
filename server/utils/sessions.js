const mysql = require('./mysql').MySQL;
const commonFun = require('../utils/commonFunctions');
const atob = require('atob');

class Sessions {

	async list() {

		this.user.privilege.needs('user');

		return await this.mysql.query(`SELECT * FROM tb_sessions WHERE account_id = ?`, [this.user.user_id]);
	};

	async insert(params) {

		if(params.type != 'login' && params.refresh_token) {

			const check_token = await commonFun.verifyJWT(params.refresh_token);

			if(check_token.error && check_token.message != 'jwt expired')
				return;

			params.user_id = check_token.user_id;
			params.session_id = check_token.sessionId;
		}

		delete(params['refresh_token']);

		const result = await mysql.query(
			`INSERT INTO tb_sessions SET ?`,
			[params],
			'write'
		);

		return result;
	}
}

exports.insert = Sessions;
exports.sessions = (() => new Sessions)();