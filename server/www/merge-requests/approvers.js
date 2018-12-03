const API = require('../../utils/api');

class Approvers extends API {

	async list() {

		this.account.features.needs('merge-requests-module');

		return this.mysql.query(`
			SELECT
				u.user_id,
				CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) name
			FROM
				tb_merge_requests_approvers a
			JOIN
				tb_users u USING(user_id)
			WHERE
				u.account_id = ?`,
			[this.account.account_id]
		);
	}
}

exports.list = Approvers;