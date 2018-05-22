const gcloud = require('google-cloud');
const mysql = require('../utils/mysql').MySQL;
const fs = require('fs');
const commonFun = require('../utils/commonFunctions');
const config = require("config");
const path = require("path");

const gauth = function (project, file) {

	console.log('Initiating authentication with gcloud..');

	return gcloud.bigquery({
		projectId: project,
		keyFilename: file
	});

};

class BigQuery {

	static call(query, filters, account, file, project) {

		return new Promise(function (resolve, reject) {

			const options = {
				"query": query,
				"queryParameters": filters,
				"useLegacySql": false,
				"parameterMode": "NAMED"
			};

			gauth(project, path.join(__dirname , "../../bigquery_files/" + account + "/" + file)).query(options, function (err, bqData) {

				if (err) {
					console.log("in error ", err);
					return reject({error: err, query: query});
				}

				resolve(bqData);

			});
		});
	}


	static async setup() {
		const bigQueryConnections = await mysql.query(`
            select
                c.*,
                a.account_id
            from
                tb_credentials c
            join
                tb_accounts a
                using(account_id)
            where
                type = 'bigquery'
                and c.status = 1
                and a.status = 1
            `);

		const path = config.get("bigquery_files_destination");

		for (const con of bigQueryConnections) {

			if (!fs.existsSync(path + con.account_id)) {

				fs.mkdirSync(path + con.account_id);
			}

			else {

				try {

					await commonFun.clearDirectory(path + con.account_id);
				}
				catch (e) {

					console.log(new Error('could not clear directory', e));
				}
			}
		}

		for (const con of bigQueryConnections) {

			try {

				await fs.writeFileSync(path + con.account_id + '/' + con.id + ".json", con.file);
			}
			catch (e) {

				console.log(new Error('could not load bigquery file: ', con.id, 'for ', con.name));
			}
		}
	}
}

exports.setup = BigQuery.setup;
exports.BigQuery = BigQuery;