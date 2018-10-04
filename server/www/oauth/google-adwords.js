const API = require('../../utils/api');
const path = require('path');
const spawn = require("child_process").spawn;
const csv = require('csvtojson');

class GoogleAdwords extends API {

	async getData() {

		const csvFile = path.join(__dirname , 'report.csv');

		console.log(path.join(__dirname , 'report.csv'));

		const py = spawn('python', ['./adwords.py', "params"]);

		py.stdin.write('{"from":"CAMPAIGN_PERFORMANCE_REPORT"}');
		py.stdin.end();

		await new Promise(function(resolve, reject) {

			py.stdout.on('end',function () {

				let campaigns = [];

				csv()
					.fromFile(csvFile).on('json', (jsonObj) => {

						campaigns.push(jsonObj)
					})
					.on('done', async function(error) {

						if (error) {

							reject(error)
						}
						else {

							console.log(campaigns);
							resolve('done')
						}
					})
			})
		})
	}
}

exports.getData = GoogleAdwords;