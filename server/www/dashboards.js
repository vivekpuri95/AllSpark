const API = require('../utils/newApi');

exports.list = class extends API {

    async list() {

        const result = await this.mysql.query(
            'SELECT * FROM tb_dashboards where status = 1 AND account_id = ?',
            [this.account.account_id]
        );

        const reports = await this.mysql.query(
            'SELECT * FROM tb_query_dashboards WHERE status = 1',
            [this.account.account_id]
        );

        for(const row of result) {

            row.reports = reports.filter(r => r.dashboard == row.id);
            row["roles"] = row["roles"] ? row["roles"].split(",").map(Number) : [];
        }

        return result;
    }
};

exports.insert = class extends API {

    async insert() {

        let
            values = {}, dashboard_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_dashboards'
            `);

        table_cols.map(row =>  dashboard_cols.push(row.COLUMN_NAME) );

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values["account_id"] = this.account.account_id;
        return await this.mysql.query('INSERT INTO tb_dashboards SET  ? ', [values], 'allSparkWrite');
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, dashboard_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_dashboards'
            `);

        table_cols.map(row =>  dashboard_cols.push(row.COLUMN_NAME) );

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }


        return await this.mysql.query('UPDATE tb_dashboards SET ? WHERE id = ? and account_id = ?', [values, this.request.body.id, this.account.account_id], 'allSparkWrite');
    }
};
exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('UPDATE tb_dashboards SET status = 0 WHERE id = ? and account_id = ? ', [this.request.body.id, this.account.account_id], 'allSparkWrite');
    }
};


exports.getAllChildren = class extends API {

    async getAllChildren(){
        const response = await this.mysql.query(`
            SELECT
                a.id AS dashboards_id,
                a.name AS parent,
                GROUP_CONCAT(b.name) AS children
            FROM
                tb_dashboards a
            JOIN
                tb_dashboards b
            ON
                a.id = b.parent
            GROUP BY
                a.id
        `);

        for(const row of response){
            row.children = row.children.split(',');
        }
        return response;
    }
}