const mysql = require('./mysql').MySQL;
const db = require('config').get("log_database");

class ErrorLogs {

	static async insert(params) {

		return await mysql.query(`INSERT INTO ${db}.tb_errors SET ?`, params, 'write');
	}

}

module.exports = ErrorLogs;