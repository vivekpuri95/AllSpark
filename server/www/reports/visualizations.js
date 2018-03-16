const API = require('../../utils/api');

exports.insert = class extends API {

    async insert() {

        let
            values = {}, visual_cols = ['query_id', 'name', 'type', 'options', 'is_enabled'];

        for(const key in this.request.body) {
            if(visual_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('INSERT INTO tb_query_visualizations SET  ?', [values], 'write');
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, visual_cols = ['query_id', 'name', 'type', 'options', 'is_enabled'];

        for(const key in this.request.body) {
            if(visual_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query_visualizations SET ? WHERE visualization_id = ?', [values, this.request.body.visualization_id], 'write');
    }
};
exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('DELETE FROM tb_query_visualizations WHERE visualization_id = ?', [this.request.body.visualization_id], 'write');
    }
};