const API = require('../../utils/api');

exports.list = class extends API {
    async list() {
        return await this.mysql.query('select * from tb_roles where account_id = ? ', [this.account.account_id]);
    }
}

exports.insert = class extends API {
    async insert() {
        if(!this.request.query.name || !this.request.query.is_admin)
            return {error: "Invalid fields"}

        let params = {};
        params.account_id = this.account.account_id;
        params.name = this.request.query.name;
        params.is_admin = this.request.query.is_admin;
        return await this.mysql.query('insert into tb_roles set ?', [params], 'write');
    }
}

exports.update = class extends API {
    async update() {
        let params = {};
        params.account_id = this.account.account_id;
        params.name = this.request.query.name;
        params.is_admin = this.request.query.is_admin;

        this.request.query.account_id = this.account.account_id;
        return await this.mysql.query('update tb_roles set ? where role_id = ? and account_id = ?',
            [params, this.request.query.role_id, this.account.account_id],
            'write'
        );
    }
}

exports.delete = class extends API {
    async delete() {
        return await this.mysql.query('delete from tb_roles where role_id = ? and account_id = ?',
            [this.request.query.role_id, this.account.account_id],
            'write'
        );
    }
}