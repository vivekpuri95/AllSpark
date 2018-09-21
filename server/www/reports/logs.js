const API = require('../../utils/api');
const dbConfig = require('config').get("sql_db");

class Logs extends API {

	async log({user_id, session_id} = {}) {

		this.assert(user_id && session_id, 'User Id or Session Id missing');

		const db = dbConfig.write.database.concat('_logs');

		return await this.mysql.query(
			`SELECT * FROM ${db}.tb_report_logs WHERE user_id = ? and session_id = ?`,
			[user_id, session_id]
		);
	}

	async history({user_id, session_id} = {}) {

		this.assert(user_id && session_id, 'User Id or Session Id missing');

		const db = dbConfig.write.database.concat('_logs');

		return await this.mysql.query(`
			SELECT 
				* 
			FROM 
				${db}.tb_history 
			WHERE
				user_id = ?
				AND owner IN ('query', 'visualization')
				AND session_id = ?
			`,
			[user_id, session_id]);
	}
}

exports.log = Logs;
exports.history = Logs;