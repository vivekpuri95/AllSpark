const API = require('../../utils/api');

class Approvers extends API {

	async list({source = null} = {}) {

		this.account.features.needs('merge-requests-module');

		return this.mysql.query(`
			SELECT
				u.user_id,
				CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) user_name
			FROM
				tb_merge_requests_approvers a
			JOIN
				tb_users u USING(account_id)
			WHERE
				a.source = ? AND u.account_id = ?`,
			[source, this.account.account_id]
		);
	}
}

exports.list = Approvers;