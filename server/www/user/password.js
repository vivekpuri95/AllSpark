const API = require('../../utils/api');
const crypto = require('crypto');
const comFun = require('../commonFunctions');

let mailer = require('../../utils/mailer');
mailer = new mailer();

const EXPIRE_AFTER = 1; //HOURS

exports.resetlink = class extends API {
    async resetlink() {

        let user = await this.mysql.query(`SELECT user_id FROM tb_users WHERE email = ? AND account_id = ?`,
                                            [this.request.body.email,this.account.account_id]);
        if (!user.length)
            return user;

        const token = await new Promise((resolve, reject) => {
            crypto.randomBytes(80, function (err, buf) {
                if (err)
                    reject(err);
                else
                    resolve(buf.toString('hex'));
            });
        });

        user = user[0]['user_id']
        const query = `INSERT INTO tb_password_reset(user_id, reset_token) values ?`
        await this.mysql.query(query, [[[user, token]]], 'allSparkWrite');

        mailer.to.add(this.request.body.email);
        mailer.subject = `Password reset link for allspark`
        const resetUrl = `${this.account.account_id}/login/forgot?token=${token}`
        mailer.html = `Click <a href='${resetUrl}'><b>here</b></a> to reset your password for AllSpark`
        await mailer.send();

        return true;
    }
}

exports.reset = class extends API {
    async reset() {
        if (!this.request.body.password || !this.request.body.token)
            return false;

        const query = ` select 
                            user_id 
                        from 
                            tb_password_reset 
                        where 
                            id in (
                                select 
                                    max(id) 
                                from 
                                    tb_password_reset 
                                where user_id in (
                                    select 
                                        user_id 
                                    from 
                                        tb_password_reset
                                    where reset_token = ? and created_at > now() - interval ? hour)) 
                            and reset_token = ?`

        let user = await this.mysql.query(query, [this.request.body.token, EXPIRE_AFTER, this.request.body.token]);
        if (!user.length)
            return false;

        user = user[0]['user_id']
        const newHashPass = await comFun.makeBcryptHash(this.request.body.password);
        await this.mysql.query('update tb_users set password = ? where user_id = ? and account_id = ?', [newHashPass, user, this.account.account_id], 'allSparkWrite');

        return true;
    }
}
