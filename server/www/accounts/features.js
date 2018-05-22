const API = require('../../utils/api.js');

exports.list = class extends API {
	async list() {
		this.user.privilege.needs('administrator');
		return await this.mysql.query('SELECT * from tb_account_features');
	}
}

exports.toggle = class extends API {
	async toggle() {

		this.user.privilege.needs('administrator');

		return await this.mysql.query(`
			INSERT INTO tb_account_features(account_id, feature_id)
			SELECT ?,? FROM dual WHERE ? IN (select feature_id from tb_features) 
			ON DUPLICATE KEY UPDATE status = ?;
			`,
			[this.request.body.account_id, this.request.body.feature_id, this.request.body.feature_id, this.request.body.status],
			'write'
		);
	}
}