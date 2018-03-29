const API = require('../../utils/api');

exports.insert = class extends API {

    async insert() {

        let
            values = {}, filter_cols = ['name', 'query_id', 'placeholder', 'description', 'default_value', 'is_multiple', 'offset', 'type', 'dataset', 'multiple'];

        for(const key in this.request.body) {
            if(filter_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values.default_value = values.default_value || '';

        return await this.mysql.query('INSERT INTO tb_query_filters SET  ?', [values], 'write');
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, filter_cols = ['name', 'query_id', 'placeholder', 'description', 'default_value', 'is_multiple', 'offset', 'type', 'dataset', 'multiple'];

        for(const key in this.request.body) {
            if(filter_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values.default_value = values.default_value || '';

        return await this.mysql.query('UPDATE tb_query_filters SET ? WHERE filter_id = ?', [values, this.request.body.filter_id], 'write');
    }
};

exports.delete = class extends API {

    async delete() {
        return await this.mysql.query('DELETE FROM tb_query_filters WHERE filter_id = ?', [this.request.body.filter_id], 'write');
    }
};