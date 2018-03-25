"use strict";

const API = require('../../utils/api');
const commonFun = require('../../utils/commonFunctions');
const auth = require('../../utils/auth');

exports.list = class extends API {

    async list() {

        const results = await Promise.all([
            this.mysql.query(`
                SELECT
                    q.*,
                    CONCAT(u.first_name, ' ', u.last_name) AS added_by_name
                FROM
                    tb_query q
                LEFT JOIN
                    tb_users u
                ON
                    q.added_by = u.user_id
                WHERE
                    is_deleted = 0
                    and q.account_id = ?
            `, [this.account.account_id]),
            this.mysql.query('SELECT * FROM tb_filters'),
            this.mysql.query('SELECT * FROM tb_query_visualizations'),
        ]);

        const response = [];

        for(const row of results[0]) {

            if((await auth.report(row, this.user)).error)
                continue;

			row.filters = results[1].filter(filter => filter.query_id == row.query_id);
			row.visualizations = results[2].filter(visualization => visualization.query_id == row.query_id);
			response.push(row);

        }

        return response;
    }
};

exports.update = class extends API {

    async update() {

        this.user.privilege.needs('report');

        let
            values = {},
            query_cols = [
                'name',
                'source',
                'query',
                'url',
                'url_options',
                'category_id',
                'description',
                'added_by',
                'requested_by',
                'tags',
                'is_enabled',
                'is_deleted',
                'is_redis',
                'refresh_rate',
                'roles',
                'connection_name'
            ];

		for(const key in this.request.body) {
            if(query_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query SET ? WHERE query_id = ? and account_id = ?', [values, this.request.body.query_id, this.account.account_id], 'write');

    }
}

exports.insert = class extends API {

    async insert() {

		this.user.privilege.needs('report');

        let
            values = {}, query_cols = [
                'account_id',
                'name',
                'source',
                'query',
                'url',
                'url_options',
                'category_id',
                'description',
                'added_by',
                'requested_by',
                'tags',
                'is_enabled',
                'is_deleted',
                'is_redis',
                'refresh_rate',
                'roles',
                'connection_name'
            ];

        for(const key in this.request.body) {
            if(query_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values["account_id"] = this.account.account_id;
        values.added_by = this.user.email;

        return await this.mysql.query('INSERT INTO tb_query SET  ?', [values], 'write');
    }
}
