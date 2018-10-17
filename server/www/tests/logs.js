const API = require('../../utils/api');
const dbConfig = require('config').has("sql_db") ? require('config').get("sql_db") : '';

exports.save = class extends API {

	async save({section, test, executed_as, time, result, response, group_id, scope} = {}) {

		const db = dbConfig.write.database.concat('_logs');

		return await this.mysql.query(
			`INSERT INTO ${db}.tb_tests_logs(section, test, executed_as, executed_by, time, result, response, group_id, scope, creation_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
			[ section, test, executed_as, this.user.user_id, time, result, response, group_id, scope ], 'write'
		);
	}
}