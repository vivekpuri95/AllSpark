const API = require('../../utils/api');
const Providers = require('./providers');
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

exports.gaReports = class extends API {

	async gaReports({id, viewId, startDate, endDate} = {}) {

		this.user.privilege.needs('connection.list');

		const [oAuthProvider] = await this.mysql.query(
			`SELECT
				c.id connection_id,
				c.access_token,
				c.refresh_token,
				p.*
			FROM
				tb_oauth_connections c
			JOIN
				tb_oauth_providers p USING (provider_id)
			WHERE
				c.id = ? AND
				c.user_id = ? AND
				c.status = 1`,
			[id, this.user.user_id]
		);

		this.assert(oAuthProvider, 'Invalid connection id');

		let connection;

		if(oAuthProvider.type == 'Google') {

			connection =  new GoogleAPIs(this, oAuthProvider);
		}

		this.assert(connection, 'Invalid provider type!');

		const access_token = await connection.test();

		const
			options = {
				method: 'POST',
				body: JSON.stringify({
					'reportRequests': [
						{
							'viewId': viewId,
							'dateRanges': [{'startDate': startDate, 'endDate': endDate}],
							'metrics': [{'expression': 'ga:users'}]
						}
					]
				}),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${access_token}`
				},
			};

		let response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', options);

		response = await response.json();

		return response;

	}
}

class OAuthConnection {

	constructor(endpoint, provider) {

		this.endpoint = endpoint;

		Object.assign(this, provider);

		this.provider = provider;

		this.endpoint.assert(this.connection_id, 'Connection ID not found!');
		this.endpoint.assert(this.client_id, 'Client ID not found!');
		this.endpoint.assert(this.client_secret, 'Client secret not found!');
	}

	async validate() {

		const
			connection = {};

		await this.getRefreshToken(connection);
		await this.getAccessToken(connection);

		this.endpoint.mysql.query(
			'UPDATE tb_oauth_connections SET ? WHERE id = ?',
			[connection, this.connection_id]
		);
	}
}

class GoogleAPIs extends OAuthConnection {

	async getRefreshToken(connection) {

		const
			parameters = new URLSearchParams(),
			options = {
				method: 'POST',
				body: parameters,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			};

		parameters.set('code', this.endpoint.request.body.code);
		parameters.set('client_id', this.client_id);
		parameters.set('client_secret', this.client_secret);
		parameters.set('redirect_uri', `http://${this.endpoint.request.headers.host}/connections-manager`);
		parameters.set('grant_type', 'authorization_code');

		let response = await fetch('https://www.googleapis.com/oauth2/v4/token', options);

		response = await response.json();

		this.endpoint.assert(response.refresh_token, `Refresh token not recieved from google, ${JSON.stringify(response)}!`);

		this.refreshToken = connection.refresh_token = response.refresh_token;
	}

	async getAccessToken(connection) {

		const
			parameters = new URLSearchParams(),
			options = {
				method: 'POST',
				body: parameters,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			};

		parameters.set('refresh_token', connection.refresh_token);
		parameters.set('client_id', this.provider.client_id);
		parameters.set('client_secret', this.provider.client_secret);
		parameters.set('grant_type', 'refresh_token');

		let response = await fetch('https://www.googleapis.com/oauth2/v4/token', options);

		response = await response.json();

		this.endpoint.assert(response.access_token, 'Access Token not recieved form Google!');

		this.accessToken = connection.access_token = response.access_token;
		connection.expires_at = new Date(Date.now() + (response.expires_in * 1000)).toISOString().replace('T', ' ').replace('Z', '');
	}

	async test() {

		this.endpoint.assert(this.access_token, 'Access Token not found!');
		this.endpoint.assert(this.refresh_token, 'Refresh Token not found!');

		await this.getAccessToken(this);

		return this.access_token;
	}
}

class FacebookMarketing extends OAuthConnection {

	async getRefreshToken() {

		return null;
	}

	async getAccessToken(connection) {

		const
			parameters = new URLSearchParams(),
			options = {
				method: 'POST',
				body: parameters,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			};

		parameters.set('client_id', this.provider.client_id);
		parameters.set('redirect_uri', `http://${this.endpoint.request.headers.host}/connections-manager`);
		parameters.set('client_secret', this.provider.client_secret);
		parameters.set('code', this.endpoint.request.body.code);

		let response = await fetch('https://graph.facebook.com/v3.0/oauth/access_token', options);

		response = await response.json();

		this.endpoint.assert(response.access_token, `Access Token not recieved form Facebook, ${JSON.stringify(response)}!`);

		connection.access_token = response.access_token;
		connection.expires_at = new Date(Date.now() + (response.expires_in * 1000)).toISOString();
	}

	async test() {

		this.endpoint.assert(this.provider.access_token, 'Access Token not found!');

		let  appAccessToken;

		{
			const
				parameters = new URLSearchParams(),
				options = {
					method: 'POST',
					body: parameters,
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				};

			parameters.set('client_id', this.provider.client_id);
			parameters.set('client_secret', this.provider.client_secret);
			parameters.set('grant_type', 'client_credentials');

			let response = await fetch('https://graph.facebook.com/v3.0/oauth/access_token', options);

			response = await response.json();

			this.endpoint.assert(response.access_token, 'App Access Token not recieved form Facebook!');

			appAccessToken = response.access_token;
		}

		{
			const
				parameters = new URLSearchParams(),
				options = {
					method: 'GET',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				};

			parameters.set('input_token', this.provider.access_token);
			parameters.set('access_token', appAccessToken);

			let response = await fetch('https://graph.facebook.com/v3.0/debug_token?' + parameters , options);

			response = await response.json();

			this.endpoint.assert(response.data && response.data.is_valid, 'Access token in not valid!');
		}

		return this.provider.access_token;
	}
}