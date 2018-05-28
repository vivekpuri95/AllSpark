const API = require('../utils/api');
const account = require('./accounts').insert;
const commonFunc = require('../utils/commonFunctions');

exports.createaccount = class extends API {

	async createaccount() {

		const check = this.mysql.query(
			`SELECT 
				* 
			FROM 
				tb_accounts a JOIN tb_users u USING (account_id) 
			WHERE 
				a.status = 1 
				AND u.status = 1 
				AND a.name = ? 
				AND u.email = ?
			`,
			this.request.body.name, this.request.body.email);

		if(check.length)
			return "Account already exists";

		const account_obj = Object.assign(new account(), this);
		let account_res;

		try {
			account_res = await account_obj.insert();
		}
		catch(e) {
			return;
		}

		const password = await commonFunc.makeBcryptHash(this.request.body.password);

		const user = await this.mysql.query(
			`INSERT INTO tb_users (account_id, first_name, middle_name, last_name, email, password, phone)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				account_res.account_id,
				this.request.body.first_name,
				this.request.body.middle_name,
				this.request.body.last_name,
				this.request.body.email,
				password,
				this.request.body.phone
			],
			'write'
		);


		await Promise.all([
			this.mysql.query(`INSERT INTO tb_user_roles (user_id, category_id, role_id) VALUES (?, ?, ?)`,[user.insertId, account_res.category_id, account_res.role_id],'write'),
			this.mysql.query(`INSERT INTO tb_user_privilege (user_id, category_id, privilege_id) VALUES (?, ?, 1)`,[user.insertId, account_res.category_id],'write'),
		]);

		return "User signup successful";
	}
}