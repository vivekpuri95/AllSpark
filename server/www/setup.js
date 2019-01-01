const API = require('../utils/api');
const config = require('config');

class Setup extends API {

	async run({account, user} = {}) {

		if(!(account && user)) {

			if(!config.has("setup")) {

				return 'Configuration property not set';
			}

			account = config.get("setup").account;
			user = config.get("setup").user;
		}

		const
			setupAccount = await this.mysql.query(
				`INSERT INTO 
					tb_accounts (name, url, icon, logo)
				VALUES (?, ?, ?, ?)
				`,
				[account.name, account.url, account.icon, account.logo],
				'write'
			),
			setupUser = await this.mysql.query(
				`INSERT INTO 
					tb_users (account_id, first_name, middle_name,last_name, phone, email, password)
				VALUES (?, ?, ?, ?, ?, ?)
				`,
				[setupAccount.insertId, user.first_name, user.middle_name, user.last_name, user.phone, user.email, user.password],
				'write'
			)
		;
	}
}

exports.run = Setup;