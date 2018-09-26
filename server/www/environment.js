const API = require('../utils/api');

class About extends API {

	about() {
		return this.environment;
	}
}

exports.about = About;