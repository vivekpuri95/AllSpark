const API = require('../../utils/api');
const crypto = require('crypto');
const comFun = require('../commonFunctions');

let mailer = require('../../utils/mailer');
mailer = new mailer();

exports.resetlink = class extends API{
    async resetlink(){

        var exist =await this.mysql.query('select 1 from allspark.tb_users where email = ?',[this.request.body.email],'allSparkRead');
        if(exist.length==0)
            return true;

        const token = await new Promise((resolve,reject) =>{
            crypto.randomBytes(80, function(err, buf) {
                if(err)
                    reject(err);
                else
                    resolve(buf.toString('hex'));
            });
        });


        var expireTime = new Date ();
        expireTime.setMinutes ((new Date()).getMinutes() + 60 );

        let query = 'insert into allspark.tb_password_reset(email,reset_token,expire_after) values ? on duplicate key update reset_token = values(reset_token) ,expire_after = values(expire_after)'
        await this.mysql.query(query,[[[this.request.body.email,token,expireTime]]],'allSparkWrite');

        mailer.to.add(this.request.body.email);
        mailer.subject = 'Password reset link for allspark'
        const resetUrl = 'jungleworks-allspark.jugnoo.in/user/password/forgot?token=' + token
        mailer.html = 'Click <a href='+ resetUrl +'><b>here</b></a> to reset your password for allspark'

        await mailer.send();

        return true;
    }
}

exports.reset = class extends API{
    async reset(){
        if(this.request.body.password==undefined || this.request.body.token==undefined)
            return false;

        let email = await this.mysql.query('select email from allspark.tb_password_reset where reset_token = ? and expire_after > ?',
            [this.request.body.token,new Date()],
            'allSparkRead');

        if(email.length==0)
            return false;

        email = email.map(element => element.email)[0];

        const  newHashPass = await comFun.makeBcryptHash(this.request.body.password);
        await this.mysql.query('update allspark.tb_users set password = ? where email = ?',[newHashPass,email],'allSparkWrite');

        return true;
    }
}
