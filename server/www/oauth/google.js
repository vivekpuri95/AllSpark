const Providers = require('./providers');
const fetch = require('node-fetch');

module.exports = class Google {

	async api(endpoint, parameters, options = {}) {

		const response = await fetch(`https://www.googleapis.com/${endpoint}?${parameters}`);

		return await response.json();
	}
}