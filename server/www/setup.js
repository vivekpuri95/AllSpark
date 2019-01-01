const API = require('../utils/api');
const config = require('config');
const commonFun = require('../utils/commonFunctions');
const Account = require('../onServerStart');

class Setup extends API {

	async run({account, user} = {}) {

		const existingAccounts = await this.mysql.query('SELECT * from tb_accounts',[]);

		this.assert(!existingAccounts.length, 'Account already exists');

		if(!(account && user)) {

			if(!config.has("setup")) {

				return 'Configuration property not set';
			}

			account = config.get("setup").account;
			user = config.get("setup").user;
		}

		this.assert(account.url && account.name, 'Insufficient account details');
		this.assert(user.email && user.password && user.first_name, 'Insufficient user details');

		const
			setupAccount = await this.mysql.query(
				`INSERT INTO 
					tb_accounts (name, url, icon, logo)
				VALUES (?, ?, ?, ?)
				`,
				[account.name, account.url, account.icon || '', account.logo || ''],
				'write'
			);

		this.assert(setupAccount.insertId, 'Account not inserted!');

		const
			password = await commonFun.makeBcryptHash(user.password),
			setupUser = await this.mysql.query(
				`INSERT INTO 
					tb_users (account_id, first_name, middle_name,last_name, phone, email, password)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				`,
				[setupAccount.insertId, user.first_name, user.middle_name || '', user.last_name || '', user.phone || null, user.email, password],
				'write'
			)
		;

		this.assert(setupUser.insertId, 'User not inserted!');

		const [category, roles, privilege, accountFeatures, settings] = await Promise.all([
			this.mysql.query(
				'INSERT INTO tb_categories (account_id, name, slug, is_admin) VALUES (?, "Everybody", "everybody", 1)',
				[setupAccount.insertId],
				'write'
			),
			this.mysql.query(
				'INSERT INTO tb_roles (account_id, name, is_admin) VALUES (?, "Admin", 1)',
				[setupAccount.insertId],
				'write'
			),
			this.mysql.query(
				'INSERT INTO tb_privileges (account_id, name, is_admin) VALUES (?, "Admin", 1)',
				[setupAccount.insertId],
				'write'
			),
			this.mysql.query(
				'INSERT INTO tb_account_features (account_id, feature_id) SELECT ? AS account_id, feature_id FROM tb_features',
				[setupAccount.insertId],
				"write"
			),
			this.mysql.query(
				'INSERT INTO tb_settings (account_id, owner, owner_id, profile, value) VALUES (?, "account", ?, "main", "[]")',
				[setupAccount.insertId, setupAccount.insertId],
				"write"
			),
		]);

		this.assert(category.insertId && roles.insertId && privilege.insertId && accountFeatures.insertId && settings.insertId, 'Error in adding account categories or roles');

		const [userPrivilege, userRole] = await Promise.all([
			this.mysql.query(
				'INSERT INTO tb_user_privilege (user_id, category_id, privilege_id) VALUES (?, ?, ?)',
				[setupUser.insertId, category.insertId, privilege.insertId],
				'write'
			),
			this.mysql.query(
				'INSERT INTO tb_object_roles (account_id, owner_id, owner, target_id, target, category_id, added_by) VALUES (?, ?, "user", ?, "role", ?, ?)',
				[setupAccount.insertId, setupUser.insertId, roles.insertId, category.insertId, setupUser.insertId],
				'write'
			)
		]);

		this.assert(userPrivilege.insertId && userRole.insertId, 'Error in inserting user roles or privileges');

		await this.mysql.query('UPDATE tb_object_roles SET group_id = id where id = ?', [userRole.insertId], 'write');

		await Account.loadAccounts();

		return {
			account: setupAccount.insertId,
			user:setupUser.insertId
		}
	}
}

exports.run = Setup;