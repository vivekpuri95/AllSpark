const API = require('../../utils/api');


exports.insert = class extends API {

	async insert() {

		return await this.mysql.query(
			'INSERT INTO tb_user_query (user_id, query_id) values ( ?, ?) ',
			[this.request.body.user_id, this.request.body.query_id],
			'allSparkWrite'
		);
	}
};

exports.delete = class extends API {

	async delete() {
		return await this.mysql.query(
			'DELETE FROM tb_user_query WHERE user_id = ? and query_id = ?',
			[this.request.body.user_id, this.request.body.query_id],
			'allSparkWrite'
		);
	}
};
