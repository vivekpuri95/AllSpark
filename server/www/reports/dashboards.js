const API = require('../../utils/api');

exports.list = class extends API {

    async list() {

        return await this.mysql.query('SELECT * FROM tb_query_dashboards where status = 1');
    }
};

exports.insert = class extends API {

    async insert() {

        let
            values = {}, dashboard_cols = ['query_id', 'dashboard', 'position', 'span'];

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('INSERT INTO tb_query_dashboards SET  ?', [values], 'write');
    }
};

exports.update = class extends API {

    async update() {

        let
        values = {}, dashboard_cols = ['query_id', 'position', 'span'];

        for(const key in this.request.body) {
            if(dashboard_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query_dashboards SET ? WHERE id = ?', [values, this.request.body.id], 'write');
    }
};
exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('UPDATE tb_query_dashboards SET status = 0 WHERE id = ?', [this.request.body.id], 'write');
    }
};