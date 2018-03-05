const API = require("../utils/newApi");

exports.create = class extends API {

    async create() {

        const result = {};

        for(const key in this.request.body) {

            result[key] = this.request.body[key]
        }

        return await this.mysql.query(`insert ignore into tb_user_privilege set ?`, result, 'allSparkWrite');
    }

};

exports.update = class extends API {

    async update() {

        const result = {};
        const userId = this.request.body.user_id;

        if(!userId) {

            return {
                status: false,
                message: "userId not found"
            }
        }

        for(const key in this.request.body) {

            result[key] = this.request.body[key]
        }

        delete result["user_id"];

        return await this.mysql.query(`update tb_user_privilege set ? where user_id = ?`, [result, userId], 'allSparkWrite');
    }

};

exports.delete = class extends API {

    async delete() {

        const userId = this.request.body.user_id;
        const role = this.request.body.role;
        const category = this.request.body.category_id;

        return await this.mysql.query(`
                delete 
                   from tb_user_privilege 
                where 
                    user_id = ? and role = ? and category_id = ?
            `,
            [userId, role, category],
            'allSparkWrite'
        );
    }

};


exports.list = class extends API {

    async list() {

        return await this.mysql.query(`
            select 
                up.* 
            from 
                tb_user_privilege up 
            join 
                tb_users u
                using(user_id) 
            where 
                account_id = ?
                and u.status = 1`,
            [this.account.account_id]
        );
    }
};