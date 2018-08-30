const API = require('../utils/api');

class Info extends API {

	envInfo() {
		return this.abc;
	}
}

exports.envInfo = Info;