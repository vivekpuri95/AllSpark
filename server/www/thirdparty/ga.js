const API = require("../../utils/api");
const PythonShell = require("python-shell");
const fs = require("fs");

exports.backfill = class extends API {

	async backfill() {

		const dir = __dirname+ '/../../env/bin/python';
		const script_path = __dirname;

		let credentials = `SELECT * FROM tb_third_party_credentials WHERE account_id = ? AND id = ?`;
		credentials = await this.mysql.query(credentials, [this.account.account_id, this.request.query.credential_id]);

		this.assert(credentials.length, "No Credentials Found")
		fs.writeFileSync(__dirname + '/../../../../certs/' + this.account.name + '_' + credentials[0].account_type + '_' + credentials[0].id + '.p12', Buffer.from(new Uint8Array(credentials[0].credentials)));


		let metadata = `
			SELECT * FROM tb_tasks WHERE account_id = ? AND id = ?
		`
		let reports = await this.mysql.query(metadata, [this.account.account_id, this.request.query.metadata_id]);
		reports = reports[0].metadata;
		reports = JSON.parse(reports);

		reports.reportRequests[0].dateRanges = {
			startDate: this.request.query.date,
			endDate: this.request.query.date,
		};

		const optionsSegmented = {
			mode: "text",
			pythonPath: dir,
			pythonOptions: ["-u"],
			scriptPath: script_path,
			args: [JSON.stringify(reports), __dirname + '../../../../../certs/' + this.account.name + '_' + credentials[0].account_type + '_' + credentials[0].id + '.p12']
		};

		let result = await new Promise(resolve => {
			PythonShell.run('googleAnalytics.py', optionsSegmented, function (err, results) {
				resolve(results);
			});
		});
		result = JSON.parse(result);

		let keys = reports.reportRequests[0].metrics.map(m => m.expression.split(':')[1]);

		keys = keys.concat(reports.reportRequests[0].dimensions.map(m => m.name.split(':')[1]));

		let data = [];
		for(const _row of result.reports[0].data.rows) {

			const row = {};

			for(const [i, value] of _row.metrics[0].values.concat(_row.dimensions).entries())
				row[keys[i]] = value;

			row.task_id = this.request.query.task_id;
			data.push(row);
		}

		const insertData = `
			INSERT INTO tb_third_party_ga (${Object.keys(data[0])}) VALUES ?
		`

		const parameters = [data.map(row => Object.values(row))];
		return await this.mysql.query(insertData, parameters, 'write');

	}
}

