const API = require('../../utils/api');
const Providers = require('./providers');
const GoogleAPIs = require('../../utils/oauthConnections').GoogleAPIs;
const FacebookMarketing = require('../../utils/oauthConnections').FacebookMarketing;
const fetch = require('node-fetch');

exports.list = class extends API {

	async list() {

		this.user.privilege.needs('connection.list');

		return await this.mysql.query(`
			SELECT * FROM tb_oauth_connections WHERE status = 1 AND user_id = ? AND provider_id IN (
				SELECT
					p.provider_id
				FROM tb_oauth_providers p
					JOIN tb_features f ON p.name = f.name AND f.type = 'oauth'
					JOIN tb_account_features af ON af.feature_id = f.feature_id AND af.account_id = ? AND af.status = 1
			)`,
			[this.user.user_id, this.account.account_id]
		);
	}
}

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('connection.insert');

		const providers = await (new Providers.list(this)).list();

		this.assert(providers.some(p => p.provider_id == this.request.body.provider_id), 'Invalid provier id!');

		return await this.mysql.query(
			`INSERT INTO tb_oauth_connections SET user_id = ?, provider_id = ?`,
			[this.user.user_id, this.request.body.provider_id]
		);
	}
}

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('connection.delete');

		const [connection] = await this.mysql.query(
			'SELECT provider_id FROM tb_oauth_connections WHERE id = ? AND user_id = ? AND status = 1',
			[this.request.body.id, this.user.user_id]
		);

		this.assert(connection, 'Invalid connection ID!');

		const providers = await (new Providers.list(this)).list();

		this.assert(providers.some(p => p.provider_id == connection.provider_id), 'Invalid provier id!');

		return await this.mysql.query(
			`UPDATE tb_oauth_connections SET status = 0 WHERE id = ? AND user_id = ?`,
			[this.request.body.id, this.user.user_id]
		);
	}
}

exports.redirect_uri = class extends API {

	async redirect_uri() {

		this.user.privilege.needs('connection.list');

		const [provider] = await this.mysql.query(`
			SELECT
				p.*,
				c.id connection_id
			FROM
				tb_oauth_connections c
			JOIN
				tb_oauth_providers p USING (provider_id)
			WHERE
				c.id = ? AND
				c.user_id = ? AND
				c.status = 1`,
			[this.request.body.state, this.user.user_id]
		);

		this.assert(provider, 'Invalid connection ID!');

		const providers = await (new Providers.list(this)).list();

		this.assert(providers.some(p => p.provider_id == provider.provider_id), 'Invalid provier id!');

		let connection;

		if(provider.type == 'Google')
			connection = new GoogleAPIs(this, provider);

		else if(provider.type == 'Facebook')
			connection = new FacebookMarketing(this, provider);

		this.assert(connection, 'Invalid provider type!');

		await connection.validate();

		return true
	}
}

exports.test = class extends API {

	async test() {

		this.user.privilege.needs('connection.list');

		const [provider] = await this.mysql.query(`
			SELECT
				p.*,
				c.*,
				c.id connection_id
			FROM
				tb_oauth_connections c
			JOIN
				tb_oauth_providers p USING (provider_id)
			WHERE
				c.id = ? AND
				c.user_id = ? AND
				c.status = 1`,
			[this.request.query.id, this.user.user_id]
		);

		this.assert(provider, 'Invalid connection ID!');

		const providers = await (new Providers.list(this)).list();

		this.assert(providers.some(p => p.provider_id == provider.provider_id), 'Invalid provier id!');

		let connection;

		if(provider.type == 'Google')
			connection = new GoogleAPIs(this, provider);

		else if(provider.type == 'Facebook')
			connection = new FacebookMarketing(this, provider);

		this.assert(connection, 'Invalid provider type!');

		return await connection.test();
	}
}