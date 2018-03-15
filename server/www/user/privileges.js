const API = require('../../utils/api');

exports.list = class extends API {
    async list() {
        this.user.privilege.needs('administrator');
        return await this.mysql.query(
            'SELECT * FROM tb_user_privilege WHERE user_id IN (SELECT user_id FROM tb_users WHERE account_id = ?)',
            [this.account.account_id]
        );
    }
}

exports.insert = class extends API {
    async insert() {
        this.user.privilege.needs('administrator');

        if (!('user_id' in this.request.body) || !('category_id' in this.request.body) || !('privilege_id' in this.request.body))
            return false;

        const params = {
            user_id: this.request.body.user_id,
            category_id: this.request.body.category_id,
            privilege_id: this.request.body.privilege_id
        };

        return await this.mysql.query('INSERT INTO tb_user_privilege SET ?', [params], 'write');
    }
}

exports.update = class extends API {
    async update() {
        this.user.privilege.needs('administrator');

        const params = {
            user_id: this.request.body.user_id,
            category_id: this.request.body.category_id,
            privilege_id: this.request.body.privilege_id
        };

        return await this.mysql.query(
            'UPDATE tb_user_privilege SET ? WHERE id = ? AND user_id IN (SELECT user_id FROM tb_users WHERE account_id = ?)',
            [params, this.request.body.id, this.account.account_id],
            'write'
        );
    }
}

exports.delete = class extends API {
    async delete() {
        this.user.privilege.needs('administrator');

        return await this.mysql.query(
            'DELETE FROM tb_user_privilege WHERE id = ? AND user_id IN (SELECT user_id FROM tb_users WHERE account_id = ?)',
            [this.request.body.id, this.account.account_id],
            'write'
        );
    }
}