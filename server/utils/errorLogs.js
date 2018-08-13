const mysql = require('./mysql').MySQL;
const dbConfig = require('config').get("sql_db");
const commonFun = require('../utils/commonFunctions');

class ErrorLogs {

	static async insert(params) {

	    const db = dbConfig.write.database.concat('_logs');

	    let os, browser;
		const ua = new commonFun.UserAgent(params.user_agent);

		os = ua.os;
		browser = ua.browser;

		params = {...params, os, browser};


	    return await mysql.query(`INSERT INTO ${db}.tb_errors SET ?`, params, 'write');
	}

}

module.exports = ErrorLogs;