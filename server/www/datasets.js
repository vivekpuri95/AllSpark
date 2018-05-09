const API = require('../utils/api');
const {report} = require('./reports/engine');
const constants = require('../utils/constants');

exports.list = class extends API {

	async list() {

		let
			query = `
				SELECT
					d.*,
					CONCAT_WS(' ',first_name, last_name) user_name
				FROM
					tb_datasets d
				LEFT JOIN
					tb_users u
				ON
					d.created_by = u.user_id AND d.account_id = u.account_id
				WHERE
					d.account_id = ${this.account.account_id}
					AND d.status = 1
			`;

		if(this.request.body.search) {
			query = query.concat(`
				AND (
					id LIKE '%${this.request.body.search}%'
					OR name LIKE '%${this.request.body.search}%'
				)
				LIMIT 10
			`);
		}

		const result = await this.mysql.query(query);

		if(this.request.body.search) {

			for(const row of result) {

				row.superset = 'Datasets';
				row.href = '/settings';
			}
		}

		return result;
	}
};

exports.insert = class extends API {
	async insert() {
		this.user.privilege.needs('report');

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			query_id: this.request.body.query_id,
			category_id: this.request.body.category_id,
			created_by: this.user.user_id
		};
		return await this.mysql.query(
			`INSERT INTO tb_datasets SET ?`,
			[params],
			'write'
		);
	}
}

exports.update = class extends API {
	async update() {
		this.user.privilege.needs('report');

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			query_id: this.request.body.query_id,
			category_id: this.request.body.category_id,
			created_by: this.user.user_id
		};
		return await this.mysql.query(
			`UPDATE tb_datasets SET ? WHERE account_id = ? AND id = ?`,
			[params, this.account.account_id, this.request.body.id],
			'write'
		);
	}
}

exports.delete = class extends API {
	async delete() {
		this.user.privilege.needs('report');

		return await this.mysql.query(
			`UPDATE	tb_datasets SET status = 0 WHERE account_id = ? AND id = ?`,
			[this.account.account_id, this.request.body.id],
			'write'
		);
	}
}

exports.values = class DatasetValues extends API {

	async values() {

		const [dataset] = await this.mysql.query(
			`SELECT * FROM tb_datasets WHERE account_id = ? AND id = ?`,
			[this.account.account_id, this.request.query.id],
		);

		if (!dataset)
			throw new API.Exception(404, 'Dataset not found! :(');

		if (!dataset.query_id)
			return [];

		const reportObj = new report;

		Object.assign(reportObj, this);

		reportObj.request = {
			body: {
				query_id: dataset.query_id,
				user_id: this.user.user_id,
			}
		};

		if(this.account.auth_api)
			reportObj.request.body[constants.filterPrefix + 'access_token'] = this.request.query[constants.filterPrefix + 'access_token'];

		return await reportObj.report(dataset.query_id);
	}
}