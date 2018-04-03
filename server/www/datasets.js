const API = require('../utils/api');
const {report} = require('./reports/engine');

exports.list = class extends API {

	async list() {

		return await this.mysql.query(`
			SELECT
				d.*,
				CONCAT_WS(first_name, middle_name, last_name) user_name
			FROM
				tb_datasets d
			LEFT JOIN
				tb_users u
			ON
				d.created_by = u.user_id AND d.account_id = u.account_id
			WHERE
				d.account_id = ?`,
			[this.account.account_id],
		);
	}
};

exports.values = class DatasetValues extends API {

	async values() {

		const [dataset] = await this.mysql.query(
			`SELECT * FROM tb_datasets WHERE account_id = ? AND id = ?`,
			[this.account.account_id, this.request.query.id],
		);

		if(!dataset)
			throw new API.Exception(404, 'Dataset not found! :(');

		const reportObj = new report;

		Object.assign(reportObj, this);

		reportObj.request = {
			body: {
				query_id: dataset.query_id,
				user_id: this.user.user_id,
			}
		};

		return {
			values: await reportObj.report(),
			dataset,
		}
	}
}