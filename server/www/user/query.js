const API = require('../../utils/api');

exports.list = class extends API {

    async list() {

        const
            data = await this.mysql.query(
                'SELECT user_id, query_id FROM tb_user_query WHERE user_id = ?',
                [this.request.body.user_id]
            ),
            queries = [];

        for (const row of data) {

            queries.push(row.query_id);
        }
        return {
            user_id: this.request.body.query_id,
            query: queries
        };
    }
};

exports.insert = class extends API {

    async insert() {

        this.user.privilege.needs('report');

        const check = await this.mysql.query(
            `SELECT
				*
			FROM
				tb_users u
			JOIN
				tb_query q
			WHERE
				user_id = ?
				AND query_id = ?
				AND u.account_id = ?
				AND q.account_id = ?
			`,
            [this.request.body.user_id, this.request.body.query_id, this.account.account_id, this.account.account_id]
        );

        if (!check.length) {
            throw 'Unauthorised user';
        }

        return await this.mysql.query(
            'INSERT INTO tb_user_query (user_id, query_id) values (?, ?) ',
            [this.request.body.user_id, this.request.body.query_id],
            'write'
        );
    }
};

exports.update = class extends API {

    async update() {

        this.user.privilege.needs('report');

        const existing_check = await this.mysql.query(`
		    SELECT
			    u.account_id, q.account_id
			FROM
			    tb_user_query uq
			JOIN
			    tb_users u USING(user_id)
			JOIN
			    tb_query q USING(query_id)
			WHERE
			    id = ?
			    AND u.account_id = ?
			    AND q.account_id = ?
	    `,
            [this.request.body.id, this.account.account_id, this.account.account_id]
        );
        const update_check = await this.mysql.query(`
		        SELECT
		            *
		        FROM
		            tb_users u
		        JOIN
		        	tb_query q
		        WHERE
		            user_id = ?
		            AND q.account_id = ?
		            AND u.account_id = ?
		            AND q.query_id = ?
		    `,
            [this.request.body.user_id, this.account.account_id, this.account.account_id, this.request.body.query_id]
        );

        if (!update_check.length || !existing_check.length) {
            throw 'Unauthorised user';
        }

        return await this.mysql.query(
            `UPDATE tb_user_query SET user_id = ?, query_id = ? WHERE id = ?`,
            [this.request.body.user_id, this.request.body.query_id, this.request.body.id],
            'write');
    }
};

exports.delete = class extends API {

    async delete() {

        this.user.privilege.needs('report');

        const delete_check = await this.mysql.query(`
		    SELECT
			    u.account_id, q.account_id
			FROM
			    tb_user_query uq
			JOIN
			    tb_users u USING(user_id)
			JOIN
			    tb_query q USING(query_id)
			WHERE
			    id = ?
			    AND u.account_id = ?
			    AND q.account_id = ?
	    `,
            [this.request.body.id, this.account.account_id, this.account.account_id]
        );

        if (!delete_check.length) {
            throw "Unauthorised User";
        }

        return await this.mysql.query(
            'DELETE FROM tb_user_query WHERE id = ?',
            [this.request.body.id],
            'write'
        );
    }
};
