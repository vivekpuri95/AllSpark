const API = require("../utils/api");
const commonFun = require("../utils/commonFunctions");

exports.insert = class extends API {

    async insert(){

        var result = {};

        for(var key in this.request.body){
            result[key] = this.request.body[key]
        }

        if(result.password) {
            result.password = await commonFun.makeBcryptHash(result.password);
        }

        delete result.token;

        result.account_id = this.account.account_id;

        return await this.mysql.query(`insert into tb_users set ?`,result,'write');

    }

};

exports.delete = class extends API {

    async delete() {

        return await this.mysql.query(`update tb_users set status = 0 where user_id = ?`,[this.request.body.user_id],'write');

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

        return await this.mysql.query(`update tb_users set ? where user_id = ?`,values,'write');

    }

}

exports.list = class extends API {

    async list(){

        let results;
        if(this.request.body.user_id){
			results = await Promise.all([
				this.mysql.query(`SELECT * FROM tb_users WHERE user_id = ? AND account_id = ? `, [this.request.body.user_id, this.account.account_id]),
				this.mysql.query(`SELECT id, user_id, category_id, role_id FROM tb_user_roles WHERE user_id = ? `, [this.request.body.user_id]),
				this.mysql.query(`SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege WHERE user_id = ? `, [this.request.body.user_id])
			]);

        }
        else {
			results = await Promise.all([
				this.mysql.query(`SELECT * FROM tb_users WHERE account_id = ?`, [this.account.account_id]),
				this.mysql.query(`SELECT id, user_id, category_id, role_id FROM tb_user_roles`),
				this.mysql.query(`SELECT id, user_id, category_id, privilege_id FROM tb_user_privilege`)
			]);
		}

		for(const row of results[0]) {
			row.roles = results[1].filter(roles => roles.user_id == row.user_id);
			row.privileges = results[2].filter(privilege => privilege.user_id == row.user_id);
		}
		return results[0];
    }

};

