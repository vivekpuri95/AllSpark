const API = require('../../utils/api');

exports.insert = class extends API {

    async insert() {

        let
            values = {}, filter_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_filters'
            `);

        table_cols.map(row => {
            filter_cols.push(row.COLUMN_NAME);
        } );

        for(const key in this.request.body) {
            if(filter_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('INSERT INTO tb_filters SET  ?', [values], 'allSparkWrite');
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, filter_cols = [],
            table_cols = await this.mysql.query(`
                SELECT
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'allspark' AND TABLE_NAME = 'tb_filters'
            `);

        table_cols.map(row => {
            filter_cols.push(row.COLUMN_NAME);
        } );

        for(const key in this.request.body) {
            if(filter_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_filters SET ? WHERE filter_id = ?', [values, this.request.body.filter_id], 'allSparkWrite');
    }
};
exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('DELETE FROM tb_filters WHERE filter_id = ?', [this.request.body.filter_id], 'allSparkWrite');
    }
};