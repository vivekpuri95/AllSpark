const API = require('../../utils/api');

exports.list = class extends API {

    async list() {

        return await this.mysql.query('SELECT * FROM tb_query_dashboards where status = 1');
    }
};

exports.insert = class extends API {

    async insert() {

        let
            values = {}, dashboard_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_query_dashboards'
            `);

        table_cols.map(row =>  dashboard_cols.push(row.COLUMN_NAME) );

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('INSERT INTO tb_query_dashboards SET  ?', [values], 'allSparkWrite');
    }
};

exports.update = class extends API {

    async update() {

        let
        values = {}, dashboard_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_query_dashboards'
            `);

        table_cols.map(row =>  dashboard_cols.push(row.COLUMN_NAME) );

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query_dashboards SET ? WHERE id = ?', [values, this.request.body.id], 'allSparkWrite');
    }
};
exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('UPDATE tb_query_dashboards SET status = 0 WHERE id = ?', [this.request.body.id], 'allSparkWrite');
    }
};