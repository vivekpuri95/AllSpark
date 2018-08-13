const API = require('../../utils/api');


exports.insert = class extends API {
    async insert() {
        this.user.privilege.needs('user', this.request.body.category_id);

		const check = await this.mysql.query(`
		    SELECT
		    	*
		    FROM
		    	tb_users u
		    JOIN
		    	tb_categories c
		    JOIN
		    	tb_roles r
		    WHERE
		    	user_id = ?
		    	AND c.category_id = ?
		    	AND r.role_id = ?
		    	AND u.account_id = ?
		    	AND c.account_id = ?
		    	AND r.account_id = ?
		    `,
			[
			    this.request.body.user_id,
                this.request.body.category_id,
                this.request.body.role_id,
                this.account.account_id,
                this.account.account_id,
                this.account.account_id
            ]
		);

		this.assert(check.length, "Invalid request");

        const params = {
			owner_id: this.request.body.user_id,
	        owner: "user",
			category_id: this.request.body.category_id,
			target_id: this.request.body.role_id,
	        target: "role",
	        account_id: this.account.account_id,
	        added_by: this.user.user_id
        };

        return await this.mysql.query('INSERT INTO tb_object_roles SET ?', [params], 'write');
    }
}

exports.update = class extends API {
    async update() {
        this.user.privilege.needs('user', this.request.body.category_id);

		const existing_check = await this.mysql.query(`
		    SELECT
			    c.account_id AS cat_acc, r.account_id AS role_acc
			FROM
			    tb_object_roles o
			JOIN
			    tb_categories c USING(category_id)
			JOIN
			    tb_roles r
			ON 
				r.role_id = o.target_id
			WHERE
			    o.id = ?
			    AND c.account_id = ?
			    AND r.account_id = ?
			    AND o.account_id = ?
			    AND o.target = "role"
			    AND o.owner = "user"
	    `,
			[this.request.body.id, this.account.account_id, this.account.account_id, this.account.account_id]
		);
		const update_check = await this.mysql.query(`
		    SELECT
		            *
            FROM
                tb_categories c
            JOIN
                tb_roles r
            WHERE
                category_id = ?
                AND role_id = ?
                AND c.account_id = ?
                AND r.account_id = ?
		    `,
			[this.request.body.category_id, this.request.body.role_id, this.account.account_id, this.account.account_id]
        );

		this.assert(update_check.length && existing_check.length, "Invalid request");

        const params = {
            category_id: this.request.body.category_id,
            target_id: this.request.body.role_id,
        };

        return await this.mysql.query(
            'UPDATE tb_object_roles SET ? WHERE id = ?',
            [params, this.request.body.id],
            'write'
        );
    }
}

exports.delete = class extends API {

    async delete() {
        this.user.privilege.needs('user', this.request.body.category_id);

        const delete_check = await this.mysql.query(`
            SELECT
                u.account_id
            FROM
                tb_object_roles o
            JOIN
                tb_users u
            ON
            	u.user_id = o.owner_id
            WHERE
                id = ?
                AND u.account_id = ?
                AND o.account_id = ?
                AND o.owner = "user"
                AND o.target = "role"
            `,
            [this.request.body.id, this.account.account_id, this.account.account_id]
        );

		this.assert(delete_check.length, "Invalid request");

        return await this.mysql.query(
            'DELETE FROM tb_object_roles WHERE id = ?',
            [this.request.body.id],
            'write'
        );
    }
}