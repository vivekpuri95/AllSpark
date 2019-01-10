const API = require('../utils/api');
const commonFun = require('../utils/commonFunctions');
const dbConfig = require('config').get("sql_db");

class SessionLogs extends API {

	async list({user_id, inactive, sdate, edate} = {}) {

		this.assert(user_id, 'User id required!');

		if(user_id != this.user.user_id) {

			this.user.privilege.needs('administrator');
		}

		const db = dbConfig.write.database.concat('_logs');

		if(inactive && false) {

			return await this.mysql.query(`
				SELECT
					*
				FROM
					??.tb_sessions
				WHERE
					date(created_at) between ? and ?
				`,
				[db, sdate, edate]
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
			[db, db, user_id]
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

			const description = {
				message: this.request.body.description,
				token: refresh_token,
			}

			params.description = JSON.stringify(description);

			const token_details = await commonFun.getUserDetailsJWT(refresh_token);

			if(token_details.error) {
				return;
			}
			params.user_id = token_details.user_id;
			params.session_id = token_details.session_id;
		}

		const result = await this.mysql.query(
			`INSERT INTO ??.tb_sessions SET ?, creation_date = curdate()`,
			[db, params],
			'write'
		);

		return result;
	}
}

exports.list = SessionLogs;
exports.insert = SessionLogs;
exports.sessions = (() => new SessionLogs)();