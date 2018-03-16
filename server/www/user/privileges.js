const API = require('../../utils/api');

exports.list = class extends API {
    async list() {
        this.user.privilege.needs('user');
        return await this.mysql.query(
            'SELECT * FROM tb_user_privilege WHERE user_id IN (SELECT user_id FROM tb_users WHERE account_id = ?)',
            [this.account.account_id]
        );
    }
}

exports.insert = class extends API {
    async insert() {
        this.user.privilege.needs('user');

        if (!('user_id' in this.request.body) || !('category_id' in this.request.body) || !('privilege_id' in this.request.body))
            return false;

        const user_id = this.request.body.user_id;
        const category_id = this.request.body.category_id;
        const privilege_id = this.request.body.privilege_id;
        const account_id = this.account.account_id;

        const query = `
            insert into tb_user_privilege(user_id,category_id,privilege_id)		
                select ?, ?, ? 
                    where
                        'true' in( 
                            select 
                                    case 
                                        when 
                                            'true' in (select 'true' from tb_users where user_id = ? and account_id = ?)
                                            and
                                            'true' in (select 'true' from tb_categories where category_id = ? and account_id = ?)
                                            and
                                            'true' in (select 'true' from tb_privileges where privilege_id = ?)
                                        then 'true'
                                    end
                        )
        `;

        return await this.mysql.query(
            query,
            [user_id, category_id, privilege_id, user_id, account_id, category_id, account_id, privilege_id, account_id],
            'write'
        );
    }
}

exports.update = class extends API {
    async update() {
        this.user.privilege.needs('user');

        const id = this.request.body.id;
        const user_id = this.request.body.user_id;
        const category_id = this.request.body.category_id;
        const privilege_id = this.request.body.privilege_id;
        const account_id = this.account.account_id;

        const query = `
            update tb_user_privilege set user_id = ?, category_id = ?, privilege_id = ?
            where 
                id = ?
                and 'true' in 
                    (select 
                        case 
                            when 
                                'true' in (select 'true' from tb_users where user_id = ? and account_id = ?)
                                and
                                'true' in (select 'true' from tb_categories where category_id = ? and account_id = ?)
                                and
                                'true' in (select 'true' from tb_privileges where privilege_id = ?)
                            then 'true'
                        end)
        `;

        return await this.mysql.query(
            query,
            [user_id, category_id, privilege_id, id, user_id, account_id, category_id, account_id, privilege_id],
            'write'
        );
    }
}

exports.delete = class extends API {
    async delete() {
        this.user.privilege.needs('user');

        return await this.mysql.query(
            'DELETE FROM tb_user_privilege WHERE id = ? AND user_id IN (SELECT user_id FROM tb_users WHERE account_id = ?)',
            [this.request.body.id, this.account.account_id],
            'write'
        );
    }
}