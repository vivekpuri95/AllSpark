const API = require('../../utils/api');
const googleapis = require('googleapis');
const fetch = require('node-fetch');
const config = require('config');

exports.validate = class extends API {

	async validate() {

		this.assert(this.user.user_id == this.request.body.state, 'Invalid state! :(');
		this.assert(config.has('google_apis'), 'Google API client id not found in the config! :(');

		const
			queryString = new URLSearchParams(),
			google_apis = config.get('google_apis');

		this.assert(google_apis.client_id, 'Google APIs Client ID not found! :(');
		this.assert(google_apis.client_secret, 'Google APIs Client Secret not found! :(');

		queryString.set('code', this.request.body.code);
		queryString.set('client_id', google_apis.client_id);
		queryString.set('client_secret', google_apis.client_secret);
		queryString.set('redirect_uri', `https://${this.account.url}/third-party/google-api/callback`);
		queryString.set('grant_type', 'authorization_code');

		const options = {
			method: 'POST',
			body: queryString,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		};

		let response = await fetch('https://www.googleapis.com/oauth2/v4/token', options);

		response = await response.json();

		this.assert(response.refresh_token, 'Invalid response form Google! :(' + JSON.stringify(response, 0, 4));

		const [settings] = await this.mysql.query(`
			SELECT
				id, value
			FROM
				tb_settings
			WHERE
				account_id = ? AND
				owner = 'account' AND
				profile = 'main' AND
				status = '1'
		`, [this.account.account_id]);

		this.assert(settings, 'Main settings profile not found! :(');

		try {
			settings.value = JSON.parse(settings.value);
		} catch(e) {
			settings.value = [];
		}

		settings.value.push({
			key: 'google_apis_refresh_token',
			value: response.refresh_token,
		});

		settings.value = JSON.stringify(settings.value);

		return await this.mysql.query(
			'UPDATE tb_settings SET value = ? WHERE id = ?',
			[settings.value, settings.id],
			'write'
		);
	}
}