const API = require("../utils/api");
const commonFun = require("./commonFunctions");

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

        return await this.mysql.query(`insert into tb_users set ?`,result,'allSparkWrite');

    }

};

exports.delete = class extends API {

    async delete() {

        return await this.mysql.query(`update tb_users set status = 0 where user_id = ?`,[this.request.body.user_id],'allSparkWrite');

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

        return await this.mysql.query(`update tb_users set ? where user_id = ?`,values,'allSparkWrite');

    }

}

exports.list = class extends API {

    async list(){

        if(this.request.body.user_id)
			return await this.mysql.query(`SELECT * FROM tb_users WHERE user_id = ? AND account_id = ? `, [this.request.body.user_id, this.account.account_id], 'allSparkRead');
        else
			return await this.mysql.query(`select * from tb_users WHERE account_id = ?`, [this.account.account_id],'allSparkRead');
    }

};

exports.login = class extends API {

    async login() {

        const email = this.request.body.email;
        if(!email) {
            return {
                status: false,
                message: 'Invalid Email'
            }
        }

        let userPrivileges = await this.mysql.query(
                `SELECT 
                    u.*, 
                    IF(r.is_admin = 1, 0, privilege_id) privilege_id, 
                    IF(c.is_admin = 1, 0, category_id) AS category_id,
                    r.name as privilege_name
                FROM 
                    tb_user_privilege up 
                JOIN tb_privileges r 
                    USING(privilege_id) 
                JOIN tb_users u
                    USING(user_id)
                JOIN tb_categories c
                		USING(category_id)
                WHERE
                    email = ?
                    AND u.account_id = ?
           `,
            [email, this.account.account_id]
        );

        if(!userPrivileges.length) {

            return {
                status: false,
                message: "Invalid Email"
            }
        }

        const checkPassword = await commonFun.verifyBcryptHash(this.request.body.password, userPrivileges[0].password);

        if(!checkPassword) {

            return {
                status: false,
                message: "Invalid Password"
            }
        }

        let userRoles = await this.mysql.query(
            `
            SELECT 
                u.user_id,
                IF(c.is_admin = 1, 0, ur.category_id) AS category_id,
                IF(r.is_admin = 1, 0, ur.role) AS role
            FROM 
                tb_user_roles ur
            JOIN 
                tb_users u 
                USING(user_id) 
            JOIN
                tb_categories c
                USING(category_id)
            JOIN
            	tb_roles r
            	ON r.role_id = ur.role
            WHERE 
                user_id = ?
                AND u.account_id = ?;
            `,
            [userPrivileges[0].user_id, this.account.account_id]
        );

        userRoles = userRoles.map(x=> {

            return {
                category_id: x.category_id,
                role: x.role,
            }
        });

        const obj = {
            user_id: userPrivileges[0].user_id,
            account_id: this.account.account_id,
            email: email,
            name: `${userPrivileges[0].first_name} ${userPrivileges[0].middle_name || ''} ${userPrivileges[0].last_name}`,
            roles: userRoles,
            privileges: userPrivileges.map(x => {

                return {
                    privilege_id: x.privilege_id,
                    privilege_name: x.privilege_name,
                    category_id: x.category_id,
                }
            })
        };

        const categories = await this.mysql.query('SELECT * FROM tb_categories WHERE account_id = ?', [this.account.account_id]);

        return {
            token: commonFun.makeJWT(obj, parseInt(userPrivileges[0].ttl || 7) * 86400),
            metadata: {categories},
            status: true,
        }
    }
};
