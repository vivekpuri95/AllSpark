const mysql = require('./mysql').MySQL;
const dbConfig = require('config').get("sql_db");

class ErrorLogs {

	static async insert(params) {

	    const db = dbConfig.write.database.concat('_logs');

	    let os, browser;
		const ua = params.user_agent.toLowerCase();

		if(ua.includes('linux')) {

			os = 'linux';
		}

		else if(ua.includes('macintosh')) {

			os = 'macintosh';
		}

		else if(ua.includes('windows')) {

			os = 'windows';
		}

		else {

			os = 'others';
		}

		if(ua.includes('chrome')) {

			browser = 'chrome';
		}

		else if (ua.includes('firefox')) {

			browser = 'firefox';
		}

		else if(ua.includes('safari') && !ua.includes('chrome')) {

			browser = 'safari';
		}

		else {

			browser = 'others';
		}

		params = {...params, os, browser};


	    return await mysql.query(`INSERT INTO ${db}.tb_errors SET ?`, params, 'write');
	}

}

module.exports = ErrorLogs;