const API = require('../utils/api');

exports.list = class extends API {
    async list(){
        return await this.mysql.query('select * from tb_roles');
    }
}

exports.insert = class extends API {
    async insert(){
        this.request.query.account_id = this.account.account_id;
        return await this.mysql.query('insert into tb_roles set ?',[this.request.query],'allSparkWrite');
    }
}

exports.update = class extends API {
    async update(){
        let role_id = this.request.query.role_id;
        delete this.request.query.role_id;
        this.request.query.account_id = this.account.account_id;
        return await this.mysql.query('update tb_roles set ? where role_id = ?',[this.request.query,role_id],'allSparkWrite');
    }
}

exports.delete = class extends API {
    async delete(){
        return await this.mysql.query('delete from tb_roles where role_id = ?',[this.request.query.role_id],'allSparkWrite');
    }
}