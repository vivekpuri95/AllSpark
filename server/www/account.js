const API = require('../utils/api');

exports.insert = class extends API{
    async insert(){
        return this.mysql.query('insert into tb_accounts set ?',[this.request.query],"allSparkWrite");
    }
}

exports.delete = class extends API{
    async delete(){
        return this.mysql.query('update tb_accounts set status = 0 where account_id = ?',[this.request.query.account_id],"allSparkWrite");
    }
}

exports.list = class extends API{
    async list(){
        return this.mysql.query('select * from tb_accounts',null,"allSparkWrite");
    }
}

exports.update = class extends API{
    async update(){
        let accId = this.request.query.account_id;
        delete this.request.query.account_id;
        return this.mysql.query('update tb_accounts set ? where account_id = ?',[this.request.query,accId],"allSparkWrite");
    }
}