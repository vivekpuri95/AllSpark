const API = require('../../utils/api.js');

exports.list = class extends API {
	async list() {
		return await this.mysql.query('SELECT * from tb_account_features');
	}
}

exports.toggle = class extends API {
	async toggle() {
		return await this.mysql.query(`
			INSERT INTO tb_account_features(account_id, feature_id) 
			SELECT ?,? FROM dual WHERE if(? IN (select feature_id from tb_features), 1, 0) 
			ON DUPLICATE KEY UPDATE status = not status;
			`,
			[this.account.account_id, this.request.body.feature_id, this.request.body.feature_id],
			'write'
		);
	}
}