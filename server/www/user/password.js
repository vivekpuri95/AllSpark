const API = require('../../utils/api');
const crypto = require('crypto');
const comFun = require('../commonFunctions');
let mailer = require('../../utils/mailer');

const EXPIRE_AFTER = 1; //HOURS

exports.resetlink = class extends API {
    async resetlink() {

        let user = await this.mysql.query(`SELECT user_id, first_name, last_name FROM tb_users WHERE email = ? AND account_id = ?`,
                                            [this.request.body.email,this.account.account_id]);
        if (!user.length)
            return true;

        const token = await new Promise((resolve, reject) => {
            crypto.randomBytes(80, function (err, buf) {
                if (err)
                    reject(err);
                else
                    resolve(buf.toString('hex'));
            });
        });

        const user_id = user[0]['user_id'];
        const full_name = user[0]['first_name'] +' '+ user[0]['last_name'];

        const query = `INSERT INTO tb_password_reset(user_id, reset_token) values ?`
        await this.mysql.query(query, [[[user_id, token]]], 'allSparkWrite');

        mailer = new mailer();
        mailer.from_email = 'no-reply@'+this.account.url;
        mailer.from_name = this.account.name;
        mailer.to.add(this.request.body.email);
        mailer.subject = `Password reset for ${this.account.name}`
        mailer.html = `
        <div style="height:300px;width: 750px;margin:0 auto;border: 1px solid #ccc;padding: 20px 40px; box-shadow: 0 0 25px rgba(0, 0, 0, 0.1);">
            <div style="height:40px;background-image:url('${this.account.logo}');display: flex;background-position:center;border-bottom:1px solid #999;background-repeat:no-repeat;margin-bottom: 25px;background-size:250px;background-position:left;font-size: 125%;padding: 10px 0;"><div style="margin-left: auto; padding: 20px 0; font-size: 14px; color:#666;">JungleWorks</div></div>
            <div>
                <div style="font-size:14px;color:#666">Hi ${full_name}, <br/><br/> <span style="color: #666;"> Please click on the link below to reset your password.</span></div>
                <a href="${this.account.url}/login/reset?reset_token=${token}" style="font-size: 16px; text-decoration: none; padding: 20px;display:block;background: #eee;border: 1px solid #ccc;margin: 20px 0;text-align: center; " target="_blank">${this.account.url}/login/reset?reset_token=${token}</a>
                <div style="font-size:14px;color:#666">Thank You.</div>
                <div style="font-size:14px;margin-top: 50px;font-size: 90%;text-align: center;">Powered By <a style="color:#666;text-decoration: none;" href="https://github.com/Jungle-Works/allspark" target="_blank" >Kato</a></div>

            </div>
        </div>`

        await mailer.send();
        return true;
    }
}

exports.reset = class extends API {
    async reset() {
        if (!this.request.body.password || !this.request.body.reset_token)
            return false;

        const query = ` SELECT 
                            user_id 
                        FROM 
                            tb_password_reset 
                        WHERE 
                            id in (
                                SELECT 
                                    max(id) 
                                FROM 
                                    tb_password_reset 
                                WHERE user_id in (
                                    SELECT 
                                        user_id 
                                    FROM 
                                        tb_password_reset
                                    WHERE reset_token = ? and created_at > now() - interval ? hour)) 
                            and reset_token = ?`

        let user = await this.mysql.query(query, [this.request.body.reset_token, EXPIRE_AFTER, this.request.body.reset_token]);
        if (!user.length)
            return false;

        user = user[0]['user_id']
        const newHashPass = await comFun.makeBcryptHash(this.request.body.password);
        await this.mysql.query('update tb_users set password = ? WHERE user_id = ? and account_id = ?', [newHashPass, user, this.account.account_id], 'allSparkWrite');

        return true;
    }
}

exports.change = class extends API {

    async change() {

        const dbPass = await this.mysql.query(
            `SELECT password FROM tb_users WHERE user_id = ? and account_id = ?`,
            [this.user.user_id, this.account.account_id],
            'allSparkRead'
        );

        const check = await comFun.verifyBcryptHash(this.request.body.old_password, dbPass[0].password);
        if(check) {
            const new_password = await comFun.makeBcryptHash(this.request.body.new_password);
            return await this.mysql.query(
                `UPDATE tb_users SET password = ? WHERE user_id = ? and account_id = ?`,
                [new_password, this.user.user_id, this.account.account_id],
                'allSparkWrite'
            );
        }
        else
            throw("Password does not match!");
    }
}
