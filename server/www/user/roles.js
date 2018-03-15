const API = require('../../utils/api');

exports.list = class extends API {
    async list() {
        this.user.privilege.needs('user', this.request.body.category_id);
        return await this.mysql.query('SELECT * FROM tb_user_roles');
    }
}

exports.insert = class extends API {
    async insert() {
        this.user.privilege.needs('user', this.request.body.category_id);

        const params = {
			user_id: this.request.body.user_id,
			category_id: this.request.body.category_id,
			role_id: this.request.body.role_id
        };

        return await this.mysql.query('INSERT INTO tb_user_roles SET ?', [params], 'write');
    }
}

exports.update = class extends API {
    async update() {
        this.user.privilege.needs('user', this.request.body.category_id);

        const params = {
            user_id: this.request.body.user_id,
            category_id: this.request.body.category_id,
            role_id: this.request.body.role_id
        };

        return await this.mysql.query(
            'UPDATE tb_user_roles SET ? WHERE id = ?',
            [params, this.request.body.id],
            'write'
        );
    }
}

exports.delete = class extends API {
    async delete() {
        this.user.privilege.needs('user', this.request.body.category_id);

        return await this.mysql.query(
            'DELETE FROM tb_user_roles WHERE id = ?',
            [this.request.body.id],
            'write'
        );
    }
}