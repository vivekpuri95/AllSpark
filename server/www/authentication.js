const API = require("../utils/api");
const commonFun = require('../utils/commonFunctions');
const crypto = require('crypto');

const Mailer = require('../utils/mailer');

const EXPIRE_AFTER = 1; //HOURS

exports.resetlink = class extends API {
	async resetlink() {

		let user = await this.mysql.query(
			`SELECT user_id, first_name, last_name FROM tb_users WHERE email = ? AND account_id = ?`,
			[this.request.body.email, this.account.account_id]
		);

		if (!user.length)
			return true;

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
		const query = `INSERT INTO tb_password_reset(user_id, reset_token, status) values ?`
		await this.mysql.query(query, [[[user_id, token, 1]]], 'write');

		let mailer = new Mailer();
		mailer.from_email = 'no-reply@' + this.account.url;
		mailer.from_name = this.account.name;
		mailer.to.add(this.request.body.email);
		mailer.subject = `Password reset for ${this.account.name}`
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
                    <a href="https://${this.account.url}//login/reset?reset_token=${token}" style="font-size: 16px; text-decoration: none; padding: 20px;display:block;background: #eee;border: 1px solid #ccc;margin: 20px 0;text-align: center; " target="_blank">
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

		await mailer.send();

		return 'Password reset email sent!';
	}
}


exports.reset = class extends API {
	async reset() {

		if (!this.request.body.password || !this.request.body.reset_token)
			return false;

		const query = `select
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

		return 'Password Reset Successfuly! You can log in now.';
	}
};


exports.login = class extends API {

	async login() {

		const email = this.request.body.email;
		const accessToken = this.request.body.access_token;

		if (this.account.auth_api) {

			const engine = require("./reports/engine");

			const APIRequest = new engine.APIRequest(
				{url: this.account.auth_api, method: "GET"},
				{name: "access_token", value: accessToken},
				null
			);

			const preparedRequest = APIRequest.finalQuery;

			const reportEngine = new engine.ReportEngine(preparedRequest);
			const result = await reportEngine.execute();

			this.assert(result.status, "User does not exist", 401);
		}

		this.assert(email, "Email Required");
		this.assert(this.request.body.password, "Password Required");

		const [userDetail] = await this.mysql.query(`SELECT * FROM tb_users WHERE email = ? AND account_id = ?`, [email, this.account.account_id]);


		this.assert(userDetail, "Invalid Email! :(");

		const checkPassword = await commonFun.verifyBcryptHash(this.request.body.password, userDetail.password);

		this.assert(checkPassword, "Invalid Password! :(");

		const obj = {
			user_id: userDetail.user_id,
			email: userDetail.email,
		};

		return commonFun.makeJWT(obj, parseInt(userDetail.ttl || 7) * 86400);
	}
};


exports.refresh = class extends API {

	async refresh() {

		const loginObj = await commonFun.verifyJWT(this.request.body.refresh_token);

		this.assert(!loginObj.error, "Token not correct", 401);

		const accessToken = this.request.body.access_token;

		if (this.account.auth_api) {

			const engine = require("./reports/engine");

			const APIRequest = new engine.APIRequest(
				{url: this.account.auth_api, method: "GET"},
				[{name: "access_token", value: accessToken}],
				null
			);

			const preparedRequest = APIRequest.finalQuery;

			const reportEngine = new engine.ReportEngine(preparedRequest);
			const result = await reportEngine.execute();

			this.assert(result.status, "User does not exist", 401);
		}

		const [user] = await this.mysql.query("SELECT * FROM tb_users WHERE user_id = ?", loginObj.user_id);

		this.assert(user, "user not found");

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
               `,
			[loginObj.user_id, this.account.account_id, loginObj.user_id, this.account.account_id]
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
			account_id: this.account.account_id,
			email: loginObj.email,
			name: [user.first_name, user.middle_name, user.last_name].filter(x => x).join(' '),
			roles,
			privileges,
		};

		return commonFun.makeJWT(obj, 5 * 60);
	}
}

exports.tookan = class extends API {
	async tookan() {

		if (!this.request.query.access_token) {

			throw("access token not found")
		}

		let userDetail = await this.mysql.query(`
            SELECT
                u.*
            FROM
                jungleworks.tb_users tu
            JOIN
                tb_users u
                using(user_id)
            WHERE
                access_token = ?
            `,
			[this.request.query.access_token]);

		if (!userDetail.length) {

			throw("user not found")
		}

		userDetail = userDetail[0];

		const obj = {
			user_id: userDetail.user_id,
			email: userDetail.email,
		};

		return commonFun.makeJWT(obj, parseInt(userDetail.ttl || 7) * 86400);
	}

};