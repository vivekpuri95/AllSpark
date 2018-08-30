const API = require('../../utils/api.js');
const onServerStart = require('../../onServerStart');

exports.toggle = class extends API {
	async toggle() {

		this.user.privilege.needs('administrator');

		const [account] = await this.mysql.query(
			'SELECT account_id FROM tb_accounts WHERE account_id = ? AND status = 1',
			[this.request.body.account_id]
		);

		if(!account)
			throw new API.Exception(400, 'Invalid account ID');

		const [feature] = await this.mysql.query(
			'SELECT feature_id FROM tb_features WHERE feature_id = ?',
			[this.request.body.feature_id]
		);

		if(!feature)
			throw new API.Exception(400, 'Invalid feature ID');

		const insertResponse = await this.mysql.query(`
			INSERT INTO tb_account_features(account_id, feature_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = ?`,
			[this.request.body.account_id, this.request.body.feature_id, this.request.body.status],
			'write'
		);

		await onServerStart.loadAccounts();

		return insertResponse;
	}
}