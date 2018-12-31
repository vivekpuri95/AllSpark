const API = require("../utils/api");

class Tests extends API {

	async test() {
		return 'a';
	}
}

exports.test = Tests;
exports.changeFilterOffsetFormat = Tests;