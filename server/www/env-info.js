const API = require('../utils/api');

class Info extends API {

	envInfo() {
		return this.env;
	}
}

exports.envInfo = Info;