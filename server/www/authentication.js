const API = require("../utils/api");
const commonFun = require('../utils/commonFunctions');


exports.login = class extends API {
    async login() {

        const email = this.request.query.email;

        if (!email) {

            return {
                status: false,
                message: 'Email required'
            }
        }
        const userDetail = await this.mysql.query(`select * from tb_users where email = ?`, [email]);

        if (!userDetail.length) {

            return {
                status: false,
                message: 'Invalid Email'
            }
        }
        const checkPassword = await commonFun.verifyBcryptHash(this.request.query.password, userDetail[0].password);

        if (!checkPassword) {

            return {
                status: false,
                message: "Invalid Password"
            }
        }


        const obj = {
            user_id: userDetail[0].user_id,
            email: userDetail[0].email,
        };

        return {
            token: commonFun.makeJWT(obj, parseInt(userDetail[0].ttl || 7) * 86400),
            status: true,
        }

    }
};


exports.refresh = class extends API {

    async refresh() {

        const loginObj = await commonFun.verifyJWT(this.request.query.token);

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
                    user_id = ?
                    AND u.account_id = ?
           `,
            [loginObj.user_id, this.account.account_id]
        );


        let userRoles = await this.mysql.query(
            `
            SELECT 
                u.user_id,
                IF(c.is_admin = 1, 0, ur.category_id) AS category_id,
                IF(r.is_admin = 1, 0, ur.role_id) AS role
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
            	USING(role_id)
            WHERE 
                user_id = ?
                AND u.account_id = ?
            `,
            [loginObj.user_id, this.account.account_id]
        );

        userRoles = userRoles.map(x => {

            return {
                category_id: x.category_id,
                role: x.role,
            }
        });

        const obj = {
            user_id: userPrivileges[0].user_id,
            account_id: this.account.account_id,
            email: loginObj.email,
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

exports.tookan = class extends API {
    async tookan() {

        if(!this.request.query.access_token) {

            throw("access token not found")
        }

        let userDetail = await this.mysql.query(`
            select
                u.* 
            from
                tookan.tb_users tu 
            join 
                tb_users u 
                using(user_id) 
            where 
                access_token = ? 
            `);

        if(!userDetail.length) {

            throw("user not found")
        }

        userDetail = userDetail[0];

        const obj = {
            user_id: userDetail.user_id,
            email: userDetail.email,
        };

        return commonFun.makeJWT(obj, parseInt(userDetail.ttl || 7) * 86400);
    }

};