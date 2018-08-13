const mysql = require('./mysql').MySQL;
const dbConfig = require('config').get("sql_db");
const commonFunc = require('./commonFunctions');

class ReportHistory {

	static async insert(obj, logs) {

		const
			db = dbConfig.write.database.concat('_logs'),
			userAgent = new commonFunc.UserAgent(obj.request.get('user-agent'));

		logs.account_id = obj.account.account_id;
		logs.ip = obj.request.headers['x-real-ip'];
		logs.user_agent = obj.request.get('user-agent');
		logs.os = userAgent.os;
		logs.browser = userAgent.browser;
		logs.updated_by = obj.user.user_id;

		await mysql.query(
			`INSERT INTO ${db}.tb_report_history SET ? `,
			[logs],
			'write'
		);
	}
}

module.exports = ReportHistory;