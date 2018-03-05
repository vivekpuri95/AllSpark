const API = require("../utils/api");

exports.insert = class extends API {

    async insert(){

        var result = {};

        for(var key in this.request.body){
            result[key] = this.request.body[key]
        }

        return await this.mysql.query(`insert into tb_third_party_credentials set ?`,result,'allSparkWrite');

    }

}

exports.delete = class extends API {

    async delete(){

        return await this.mysql.query(`update tb_third_party_credentials set status = 0 where account_id = ?`,[this.request.body.account_id],'allSparkWrite');

    }

}

exports.update = class extends API {

    async update(){

        var keys = Object.keys(this.request.body);

        const params = this.request.body,
        account_id = params.account_id,
        setParams = {};

        for (const key in params) {
            if (~keys.indexOf(key) && key != 'account_id')
                setParams[key] = params[key] || null;
        }

        const values = [setParams, account_id];

        return await this.mysql.query(`update tb_third_party_credentials set ? where account_id = ?`,values,'allSparkWrite');

    }

}

exports.list = class extends API {

    async list(){

        return await this.mysql.query(`select * from tb_third_party_credentials`,[],'allSparkRead');

    }

}