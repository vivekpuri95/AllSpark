const API = require('../../utils/api');

exports.list = class extends API {

	async list() {

		this.user.privilege.needs('user');
		const data =  await this.mysql.query(
			'SELECT user_id, GROUP_CONCAT(query_id) as queries FROM tb_user_query where user_id = ?',
			[this.request.body.user_id]);
		for(const row of data){
			row["queries"] = row["queries"].split(",").map(Number);
		}
		return data;
	}
};

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('user');
		const user_check = await this.mysql.query(
			`select account_id from tb_users where user_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);
		const report_check = await this.mysql.query(
			`SELECT * FROM tb_query where query_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);

		if(!user_check.length && !report_check.length)
			throw 'Unauthorised user';

		return await this.mysql.query(
			'INSERT INTO tb_user_query (user_id, query_id) values (?, ?) ',
			[this.request.body.user_id, this.request.body.query_id],
			'write'
		);
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs('user');

		const user_check = await this.mysql.query(
			`select account_id from tb_users where user_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);
		const report_check = await this.mysql.query(
			`SELECT * FROM tb_query where query_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);

		if(!user_check.length && !report_check.length)
			throw 'Unauthorised user';

		return await this.mysql.query(
			`UPDATE tb_user_query SET user_id = ?, query_id = ? WHERE id = ?`,
			[this.request.body.user_id, this.request.body.query_id, this.request.body.id],
			'write')
	}
}

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('user');

		const user_check = await this.mysql.query(
			`select account_id from tb_users where user_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);
		const report_check = await this.mysql.query(
			`SELECT * FROM tb_query where query_id = ? and account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);

		if(!user_check.length && !report_check.length)
			throw 'Unauthorised user';

		return await this.mysql.query(
			'DELETE FROM tb_user_query WHERE id = ?',
			[this.request.body.id],
			'write'
		);
	}
};
