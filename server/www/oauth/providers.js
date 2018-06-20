const API = require('../../utils/api');

exports.list = class extends API {

	async list() {

		this.user.privilege.needs('connection');

		return await this.mysql.query(`
			SELECT
				p.provider_id,
				p.name,
				p.type,
				p.client_id
			FROM tb_oauth_providers p
				JOIN tb_features f ON p.name = f.name AND f.type = 'oauth'
				JOIN tb_account_features af ON af.feature_id = f.feature_id AND af.account_id = ? AND af.status = 1
		`, [this.account.account_id]);
	}
}