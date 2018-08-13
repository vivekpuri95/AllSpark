const API = require('../utils/api');
const commonFun = require('../utils/commonFunctions');
const dbConfig = require('config').get("sql_db");

class SessionLogs extends API {

	async list() {

		const db = dbConfig.write.database.concat('_logs');

		if(this.request.query.inactive)
			return await this.mysql.query(`SELECT * FROM ??.tb_sessions WHERE date(created_at) between ? and ?`, [db,this.request.query.sdate,this.request.query.edate]);

		return await this.mysql.query(`select a.* from ??.tb_sessions a where a.id not in (select session_id from ??.tb_sessions where session_id is not NULL) and a.type = 'login' and a.expire_time >  unix_timestamp(now()) and a.user_id = ?`,[db, db, this.request.query.user_id])
	};

	async insert() {

		const
			db = dbConfig.write.database.concat('_logs'),
			userAgent = new commonFun.UserAgent(this.request.body.user_agent || this.request.get('user-agent')),
			refresh_token = this.request.body.refresh_token,
			params = {
				user_id: this.request.body.user_id,
				type: this.request.body.type,
				user_agent: this.request.body.user_agent || this.request.get('user-agent'),
				expire_time: this.request.body.expire_time,
				os: userAgent.os,
				browser: userAgent.browser,
				ip: this.request.headers['x-real-ip'],
			};

		if(params.type == 'login' && this.response) {
			return;
		}

		if(params.type == 'logout' && refresh_token) {

			const token_details = await commonFun.getUserDetailsJWT(refresh_token);

			if(token_details.error) {
				return;
			}
			params.user_id = token_details.user_id;
			params.session_id = token_details.session_id;
		}

		const result = await this.mysql.query(
			`INSERT INTO ??.tb_sessions SET ?`,
			[db, params],
			'write'
		);

		return result;
	}
}

exports.list = SessionLogs;
exports.insert = SessionLogs;
exports.sessions = (() => new SessionLogs)();