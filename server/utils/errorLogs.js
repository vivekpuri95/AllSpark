const mysql = require('./mysql').MySQL;
const dbConfig = require('config').get("sql_db");

class ErrorLogs {

	static async insert(params) {

	    const db = dbConfig.write.database.concat('_logs');

	    return await mysql.query(`INSERT INTO ${db}.tb_errors SET ?`, params, 'write');
	}

}

module.exports = ErrorLogs;