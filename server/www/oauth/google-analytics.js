const API = require('../../utils/api');
const Google = require('./google');

class GoogleAnalytics extends API {

	async metadata() {

		const
			google = new Google(),
			response = await google.api('analytics/v3/metadata/ga/columns'),
			metadata = {};

		this.assert(response && response.items && response.items.length, 'Invalid response from google!');

		for(const column of response.items) {

			const type = column.attributes.type.toLowerCase() + 's';

			if(!(type in metadata))
				metadata[type] = [];

			metadata[type].push({name: column.attributes.uiName, value: column.id});
		}

		return metadata;
	}
}

exports.metadata = GoogleAnalytics;