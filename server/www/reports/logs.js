const API = require('../../utils/api');
const dbConfig = require('config').get("sql_db");

class Logs extends API {

	async log() {
		const db = dbConfig.write.database.concat('_logs');

		return await this.mysql.query(`SELECT * FROM ${db}.tb_report_logs WHERE user_id = ? and session_id = ?`, [this.request.query.user_id, this.request.query.session_id]);
	}
}

exports.log = Logs;