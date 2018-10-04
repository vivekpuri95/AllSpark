const API = require('../utils/api');
const commonFun = require('../utils/commonFunctions');
const dbConfig = require('config').get("sql_db");

class SessionLogs extends API {

	async list() {

		this.user.privilege.needs('user');

		const db = dbConfig.write.database.concat('_logs');

		if(this.request.query.inactive) {
			return await this.mysql.query(`
				SELECT
					*
				FROM
					??.tb_sessions
				WHERE
					date(created_at) between ? and ?
				`,
				[db,this.request.query.sdate,this.request.query.edate]
			);
		}

		return await this.mysql.query(`
			SELECT
				s1.*
			FROM
				??.tb_sessions s1
			LEFT JOIN
				??.tb_sessions s2
			ON
				s1.id = s2.session_id
			WHERE
				s1.type = 'login'
				AND s2.id is  null
				AND s1.created_at >  now() - interval 5 day
				AND s1.user_id = ?
			`,
			[db, db, this.request.query.user_id]
		)
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