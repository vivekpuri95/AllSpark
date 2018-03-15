const API = require('../../utils/api');

exports.list = class extends API {
    async list() {
        this.user.privilege.has('administrator');
        return await this.mysql.query('SELECT * FROM tb_roles WHERE account_id = ? ', [this.account.account_id]);
    }
}

exports.insert = class extends API {
    async insert() {
        this.user.privilege.has('administrator');

        if(!this.request.body.name || !this.request.body.is_admin)
            return false;

        let params = {
        account_id: this.account.account_id,
        name: this.request.body.name,
        is_admin: this.request.body.is_admin
        };

        return await this.mysql.query('INSERT INTO tb_roles SET ?', [params], 'write');
    }
}

exports.update = class extends API {
    async update() {
        this.user.privilege.has('administrator');

        let params = {
        account_id: this.account.account_id,
        name: this.request.body.name,
        is_admin: this.request.body.is_admin
        };

        this.request.body.account_id = this.account.account_id;
        return await this.mysql.query('UPDATE tb_roles SET ? WHERE role_id = ? AND account_id = ?',
            [params, this.request.body.role_id, this.account.account_id],
            'write'
        );
    }
}

exports.delete = class extends API {
    async delete() {
        this.user.privilege.has('administrator');

        return await this.mysql.query('DELETE FROM tb_roles WHERE role_id = ? AND account_id = ?',
            [this.request.body.role_id, this.account.account_id],
            'write'
        );
    }
}