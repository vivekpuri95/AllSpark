"use strict";

const API = require('../../utils/api');
const commonFun = require('../commonFunctions');

async function test(req, res) {
    return res.send(await mysql.query('select 1'));
}


exports.list = class extends API {

    async list() {

        const results = await Promise.all([
            this.mysql.query(`
                SELECT
                    q.*,
                    CONCAT(u.first_name, ' ', u.last_name) AS added_by_name
                FROM
                    tb_query q JOIN tb_users u ON q.added_by = u.user_id
                WHERE
                    is_deleted = 0 and q.account_id = ?
            `, [this.account.account_id], 'allSparkWrite'),
            this.mysql.query('SELECT * FROM tb_filters'),
            this.mysql.query('SELECT * FROM tb_query_visualizations'),
            this.mysql.query('SELECT * FROM tb_query_dashboards where status = 1')
        ]);

        for(const row of results[0]) {
            row.filters = results[1].filter(filter => filter.query_id == row.query_id);
            row.visualizations = results[2].filter(visualization => visualization.query_id == row.query_id);
            row.dashboards = results[3].filter(dashboard => dashboard.query_id == row.query_id);
        }

        return results[0];
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, query_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_query'
            `);

        table_cols.map(row => query_cols.push(row.COLUMN_NAME));

        for(const key in this.request.body) {
            if(query_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query SET ? WHERE query_id = ? and account_id = ?', [values, this.request.body.query_id, this.account.account_id], 'allSparkWrite');

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

        return await this.mysql.query('INSERT INTO tb_query SET  ?', [values], 'allSparkWrite');
    }
}


exports.test = test;