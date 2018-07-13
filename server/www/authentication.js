const API = require("../utils/api");
const commonFun = require('../utils/commonFunctions');
const crypto = require('crypto');
const request = require('request');
const promisify = require('util').promisify;
const Mailer = require('../utils/mailer');
const requestPromise = promisify(request);
const config = require("config");
const constants = require("../utils/constants");
const account = require('../onServerStart');
const fetch = require('node-fetch');
const URLSearchParams = require('url').URLSearchParams;

const EXPIRE_AFTER = 1; //HOURS

exports.resetlink = class extends API {
	async resetlink() {

		let user = await this.mysql.query(
			`SELECT user_id, first_name, last_name FROM tb_users WHERE email = ? AND account_id = ?`,
			[this.request.body.email, this.request.body.account_id]
		);

		this.assert(user.length, "user not found");

		const token = await new Promise((resolve, reject) => {
			crypto.randomBytes(80, function (err, buf) {
				if (err) {
					reject(err);
				}
				else {
					resolve(buf.toString('hex'));
				}
			});
		});

		user = user[0];
		const user_id = user['user_id'];
		const full_name = user['first_name'] + (user['last_name'] ? ' ' + user['last_name'] : '');

		await this.mysql.query('update tb_password_reset set status = 0 where status = 1 and user_id = ?', [user_id], 'write');
		const query = `INSERT INTO tb_password_reset(user_id, reset_token, status) values ?`;
		await this.mysql.query(query, [[[user_id, token, 1]]], 'write');

		let mailer = new Mailer();
		mailer.from_email = 'no-reply@' + config.get("mailer").get("domain");
		mailer.from_name = this.account.name;
		mailer.to.add(this.request.body.email);
		mailer.subject = `Password reset for ${this.account.name}`;
		mailer.html = `
			<div style="height:300px;width: 750px;margin:0 auto;border: 1px solid #ccc;padding: 20px 40px; box-shadow: 0 0 25px rgba(0, 0, 0, 0.1);">

				<div style="height:40px; background-image:url('${this.account.logo}'); display: flex; border-bottom:1px solid #999; background-repeat:no-repeat; margin-bottom: 25px; background-size:250px; background-position:left; font-size: 125%; padding: 10px 0;">
					<div style="margin-left: auto; padding: 20px 0; font-size: 14px; color:#666;">JungleWorks</div>
				</div>

				<div>
					<div style="font-size:14px;color:#666">
						Hi ${full_name}, <br/><br/>
						<span style="color: #666;"> Please click on the link below to reset your password.</span>
					</div>
					<a href="https://${this.account.url}/login/reset?reset_token=${token}" style="font-size: 16px; text-decoration: none; padding: 20px;display:block;background: #eee;border: 1px solid #ccc;margin: 20px 0;text-align: center; " target="_blank">
						https://${this.account.url}/login/reset?reset_token=${token}
					</a>

					<div style="font-size:14px;color:#666">Thank You.</div>

					<div style="margin-top: 50px; font-size: 90%; text-align: center;">
						Powered By
						<a style="color:#666; text-decoration: none;" href="https://github.com/Jungle-Works/allspark" target="_blank" >AllSpark</a>
					</div>
				</div>

			</div>
		`;

		const [response] = await mailer.send();

		if (response.status === "rejected") {

			return response.reject_reason
		}

		return 'Password reset email sent!';


	}
}


exports.reset = class extends API {
	async reset() {

		if (!this.request.body.password || !this.request.body.reset_token)
			return false;

		const query = `
			select
				user_id
			from
				tb_password_reset
			where
				reset_token = ?
				and status = 1
				and (created_at > now() - interval ? hour)
		`;

		let user_id = await this.mysql.query(query, [this.request.body.reset_token, EXPIRE_AFTER]);

		if (!user_id.length)
			throw new API.Exception(400, 'Invalid Token, Please reset the password again.');

		user_id = user_id[0]['user_id'];

		const newHashPass = await commonFun.makeBcryptHash(this.request.body.password);

		await this.mysql.query('UPDATE tb_users SET password = ? WHERE user_id = ? AND account_id = ?', [newHashPass, user_id, this.account.account_id], 'write');

		await this.mysql.query('UPDATE tb_password_reset SET status = 0 WHERE status = 1 AND user_id = ?', [user_id], 'write');

		return 'Password Reset Successfully! You can log in now.';
	}
};


exports.login = class extends API {

	load() {

		this.requestAccount = this.request.body.account_id;
		this.email = this.request.body.email;

		this.possibleAccounts = [];

		if (this.requestAccount) {

			this.possibleAccounts = global.accounts.filter(x => x.account_id === this.requestAccount);
		}

		else {

			this.possibleAccounts = global.accounts.filter(x => x.url === this.request.hostname);
		}

		this.authResponseObj = {};
	}

	async requestAuthAPI() {

		let parameters = new URLSearchParams;

		const externalParameterKeys = this.possibleAccounts[0].settings.get("external_parameters");

		if(Array.isArray(externalParameterKeys)) {

			for (const key of externalParameterKeys) {

				const value = this.request.body[constants.external_parameter_prefix + key] || "";

				if (Array.isArray(value)) {

					for (const item of value) {

						parameters.append(key, item);
					}
				}

				else {

					parameters.append(key, value);
				}
			}
		}

		parameters.append('account_id', this.request.body.account_id || 0);

		let url = this.possibleAccounts[0].auth_api + "?" + parameters;

		try {

			let authAPIResponse = await fetch(url, {"method": "GET"});
			authAPIResponse = (await authAPIResponse.json()).data;

			if(!(authAPIResponse && authAPIResponse.userDetails)) {

				throw({message: "User not found"});
			}
			this.userDetails = authAPIResponse.userDetails;

			await account.loadAccounts();
			this.authResponseObj = JSON.parse(JSON.stringify(authAPIResponse));
			delete this.authResponseObj.userDetails;

		}
		catch (e) {

			throw new API.Exception(400, e.message);
		}
	}

	async login() {

		this.load();

		if (!this.email) {

			this.assert(this.possibleAccounts.length, "No account found :(");


			if (!this.possibleAccounts[0].auth_api) {

				throw new API.Exception(400, "Could't authenticate, please specify this account's Authorization API or login using Email.")
			}

			await this.requestAuthAPI();
		}

		else {

			const userDetails = await this.mysql.query(`
				select
					u.*
				from
					tb_users u
				join
					tb_accounts a
					using(account_id)
				where
					email = ?
					and u.status = 1
					and a.status = 1
					and account_id in (?)
				`,
				[this.email, this.requestAccount ? [this.requestAccount] : this.possibleAccounts.map(x => x.account_id)]
			);

			if (userDetails.length > 1) {

				const accountsObj = {};

				for (const account of global.accounts) {

					accountsObj[account.account_id] = account;
				}

				return userDetails.map(x => accountsObj[x.account_id]);
			}

			else {

				this.userDetails = userDetails[0];
				this.assert(this.userDetails && this.userDetails.user_id, "Email not found :(");

				this.possibleAccounts = global.accounts.filter(x => x.account_id === this.userDetails.account_id);

				if (this.possibleAccounts[0].auth_api && this.request.body.external_parameters) {

					await this.requestAuthAPI();
				}

				if (!this.request.body.password) {

					return this.possibleAccounts;
				}

				if (!this.request.body.external_parameters && this.request.body.password) {

					const checkPassword = await commonFun.verifyBcryptHash(this.request.body.password, this.userDetails.password);
					this.assert(checkPassword, "Invalid Password! :(");
				}
			}
		}

		this.assert(this.userDetails && this.userDetails.user_id, "user not found while loading user's details");

		const obj = {
			user_id: this.userDetails.user_id,
			email: this.userDetails.email,
			account_id: this.userDetails.account_id,
		};

		const finalObj = {
			jwt: commonFun.makeJWT(obj, parseInt(this.userDetails.ttl || 7) * 86400),
		};

		Object.assign(finalObj, this.authResponseObj);

		return finalObj;
	}
};

exports.refresh = class extends API {

	async refresh() {

		let userDetail = await commonFun.verifyJWT(this.request.body.refresh_token);

		this.assert(!userDetail.error, "Token not correct", 401);

		if (this.account.auth_api && this.request.body.external_parameters) {

			this.possibleAccounts = [this.account];

			const loginObj = new exports.login();

			loginObj.request.body.account_id = this.account.account_id;

			Object.assign(loginObj, this);

			await loginObj.requestAuthAPI();

			userDetail = loginObj.userDetails;
		}

		this.assert(userDetail, "User not found! :(", 401);

		const [user] = await this.mysql.query("SELECT * FROM tb_users WHERE user_id = ? and status = 1", userDetail.user_id);

		this.assert(user, "User not found! :(", 401);

		const userPrivilegesRoles = await this.mysql.query(`
				SELECT
					'privileges' AS 'owner',
					user_id,
					IF(p.is_admin = 1, 0, privilege_id) owner_id,
					p.name AS owner_name,
					IF(c.is_admin = 1, 0, category_id) AS category_id,
					c.name AS category_name
				FROM
					tb_user_privilege up
				JOIN tb_privileges p
					USING(privilege_id)
				JOIN tb_users u
					USING(user_id)
				JOIN tb_categories c
					USING(category_id)
				WHERE
					user_id = ?
					AND u.account_id = ?
					and u.status = 1

				UNION ALL

				SELECT
					'roles' AS 'owner',
					u.user_id,
					IF(r.is_admin = 1, 0, ur.role_id) AS owner_id,
					r.name AS role_name,
					IF(c.is_admin = 1, 0, ur.category_id) AS category_id,
					c.name AS category_name
				FROM
					tb_user_roles ur
				JOIN
					tb_users u
					USING(user_id)
				JOIN
					tb_categories c
					USING(category_id)
				JOIN
					tb_roles r
					USING(role_id)
				WHERE
					user_id = ?
					AND u.account_id = ?
					and u.status = 1
			   `,
			[user.user_id, user.account_id, user.user_id, user.account_id]
		);

		const privileges = userPrivilegesRoles.filter(privilegeRoles => privilegeRoles.owner === "privileges").map(x => {

			return {
				privilege_id: x.owner_id,
				privilege_name: x.owner_name,
				category_id: x.category_id,
			}
		});

		const roles = userPrivilegesRoles.filter(privilegeRoles => privilegeRoles.owner === "roles").map(x => {

			return {
				category_id: x.category_id,
				role: x.owner_id,
			}
		});

		const obj = {
			user_id: user.user_id,
			account_id: user.account_id,
			email: user.email,
			name: [user.first_name, user.middle_name, user.last_name].filter(x => x).join(' '),
			roles,
			privileges,
		};

		if (config.has("superAdmin_users") && config.get("superAdmin_users").includes(user.email)) {

			obj.privileges.push({
				privilege_id: -1,
				privilege_name: constants.privilege.superadmin,
				category_id: constants.adminCategory[0],
			})
		}
		return commonFun.makeJWT(obj, 5 * 60);
	}
}