const mysql = require('./mysql').MySQL;

class ErrorLogs {

	static async insert(params) {

		return await mysql.query('INSERT INTO tb_errors SET ?', params, 'write');
	}

}

module.exports = ErrorLogs;