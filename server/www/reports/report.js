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
            this.mysql.query('SELECT * FROM tb_query_dashboards where status = 1')
        ]);
        const response = [];

        for(const row of results[0]) {

            if(!auth.report(row, this.user))
                continue;

			row.filters = results[1].filter(filter => filter.query_id == row.query_id);
			row.visualizations = results[2].filter(visualization => visualization.query_id == row.query_id);
			row.dashboards = results[3].filter(dashboard => dashboard.query_id == row.query_id);
			response.push(row);

        }

        return response;
    }
};

exports.update = class extends API {

    async update() {

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
            ],
			token = this.request.body.token;

		const userData = await commonFun.verifyJWT(token);
		if(userData.error) {

			return userData
		}

		for(const key in this.request.body) {
            if(query_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query SET ? WHERE query_id = ? and account_id = ?', [values, this.request.body.query_id, this.account.account_id], 'write');

    }
}

exports.insert = class extends API {

    async insert() {

        let
            values = {}, query_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_query'
            `),
            token = this.request.body.token;


        table_cols.map(row => query_cols.push(row.COLUMN_NAME));

        const userData = await commonFun.verifyJWT(token);

        if(userData.error) {

            return userData
        }


        for(const key in this.request.body) {
            if(query_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values["account_id"] = this.account.account_id;
        values.added_by = userData.email;

        return await this.mysql.query('INSERT INTO tb_query SET  ?', [values], 'write');
    }
}
