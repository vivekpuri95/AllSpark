const API = require("../utils/newApi");
const commonFun = require("./commonFunctions");

exports.insert = class extends API {

    async insert(){

        var result = {};

        for(var key in this.request.body){
            result[key] = this.request.body[key]
        }

        if(result.password) {
            result.password = await commonFun.makeBcryptHash(result.password);
        }

        return await this.mysql.query(`insert into tb_users set ?`,result,'allSparkWrite');

    }

};

exports.delete = class extends API {

    async delete() {

        return await this.mysql.query(`update tb_users set status = 0 where user_id = ?`,[this.request.body.user_id],'allSparkWrite');

    }

}

exports.update = class extends API {

    async update(){

        var keys = Object.keys(this.request.body);

        const params = this.request.body,
        user_id = params.user_id,
        setParams = {};

        for (const key in params) {
            if (~keys.indexOf(key) && key != 'user_id')
                setParams[key] = params[key] || null;
        }

        delete setParams['token'];

        if(setParams.password)
            setParams.password = await commonFun.makeBcryptHash(setParams.password);

        const values = [setParams, user_id];

        return await this.mysql.query(`update tb_users set ? where user_id = ?`,values,'allSparkWrite');

    }

}

exports.list = class extends API {

    async list(){

        return await this.mysql.query(`select * from tb_users WHERE account_id = ?`, [this.account.account_id],'allSparkRead');

    }

};

exports.login = class extends API {

    async login() {

        const email = this.request.body.email;

        if(!email) {
            return {
                status: false,
                message: 'Invalid Email'
            }
        }

        let userDetails = await this.mysql.query(
            'select * from tb_users where email = ? and account_id = ? and status = 1',
            [email, this.account.account_id]
        );

        if(!userDetails.length) {

            return {
                status: false,
                message: "Invalid Email"
            }
        }

        userDetails = userDetails[0];

        const checkPassword = await commonFun.verifyBcryptHash(this.request.body.password, userDetails.password);

        if(!checkPassword) {

            return {
                status: false,
                message: "Invalid Password"
            }
        }

        let userPrivileges = await this.mysql.query(
            'select up.* from tb_user_privilege up join tb_users u using(user_id) where user_id = ? and account_id = ?',
            [userDetails.user_id, this.account.account_id]
        );

        userPrivileges = userPrivileges.map(x=> {

            return {
                category_id: x.category_id,
                role: x.role,
            }
        });

        const obj = {
            user_id: userDetails.user_id,
            account_id: this.account.account_id,
            email: email,
            name: `${userDetails.first_name} ${userDetails.middle_name || ''} ${userDetails.last_name}`,
            userPrivileges: userPrivileges
        };

        return {
            token: commonFun.makeJWT(obj, parseInt(userDetails.ttl || 7) * 86400),
            status: true,
        }
    }
};