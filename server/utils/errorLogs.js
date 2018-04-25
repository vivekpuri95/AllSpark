const mysql = require('./mysql').MySQL;

class ErrorLogs {

	static async insert(params) {

	    const db = mysql.pool.config.connectionConfig.database.concat('_logs');

		return await mysql.query(`INSERT INTO ${db}.tb_errors SET ?`, params, 'write');
	}

}

module.exports = ErrorLogs;