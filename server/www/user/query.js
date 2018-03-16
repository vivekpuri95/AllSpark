const API = require('../../utils/api');

exports.list = class extends API {

	async list() {

		const data =  await this.mysql.query(
			'SELECT user_id, GROUP_CONCAT(query_id) AS queries FROM tb_user_query WHERE user_id = ?',
			[this.request.body.user_id]
		);

		for(const row of data) {
			row["queries"] = row["queries"].split(",").map(Number);
		}
		return data;
	}
};

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('report');

		const user_check = await this.mysql.query(
			`SELECT account_id FROM tb_users WHERE user_id = ? AND account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);
		const report_check = await this.mysql.query(
			`SELECT * FROM tb_query WHERE query_id = ? AND account_id = ?`,
			[this.request.body.user_id, this.account.account_id]
		);

		if(!user_check.length || !report_check.length)
			throw 'Unauthorised user';

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
		        a.account_id AS user_acc,
		        b.account_id AS query_acc
		    FROM (
		        SELECT
		            account_id
		        FROM
		            tb_users
		        WHERE
		            user_id = ?
		            AND account_id = ?
		    ) a
		    JOIN (
                SELECT
                    account_id
                FROM
                    tb_query
                WHERE
                    query_id = ?
                    AND account_id = ?
            ) b
		    `,
			[this.request.body.user_id, this.account.account_id, this.request.body.query_id, this.account.account_id]
		);

		if(!update_check.length || !existing_check.length)
			throw 'Unauthorised user';

		return await this.mysql.query(
			`UPDATE tb_user_query SET user_id = ?, query_id = ? WHERE id = ?`,
			[this.request.body.user_id, this.request.body.query_id, this.request.body.id],
			'write');
	}
}

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('report');

		const delete_check =  await this.mysql.query(`
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

		if(!delete_check.length)
			throw "Unauthorised User";

		return await this.mysql.query(
			'DELETE FROM tb_user_query WHERE id = ?',
			[this.request.body.id],
			'write'
		);
	}
};
