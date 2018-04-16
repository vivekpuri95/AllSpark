const API = require('../utils/api');

exports.insert = class extends API{

	async insert() {

		console.log(this.request.body);
		//return await mysql.query('INSERT INTO tb_errors SET ?', this.request.body, 'write');
	}

}