const API = require('../../utils/api');
const auth = require('../../utils/auth');

exports.insert = class extends API {

    async insert() {

        let
            values = {},
            filter_cols = ['name', 'query_id', 'placeholder', 'description', 'order', 'default_value', 'is_multiple', 'offset', 'type', 'dataset', 'multiple'];

        if((await auth.report(this.request.body.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

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
            values = {},
            filter_cols = ['name', 'placeholder', 'description', 'order', 'default_value', 'is_multiple', 'offset', 'type', 'dataset', 'multiple'],
            [filterQuery] = await this.mysql.query('SELECT query_id FROM tb_query_filters WHERE filter_id = ?', [this.request.body.filter_id]);


        this.assert(filterQuery, 'Invalid filter id');

        if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

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

        const [filterQuery] = await this.mysql.query('SELECT query_id FROM tb_query_filters WHERE filter_id = ?', [this.request.body.filter_id]);

        this.assert(filterQuery, 'Invalid filter id');

        if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');


        return await this.mysql.query('DELETE FROM tb_query_filters WHERE filter_id = ?', [this.request.body.filter_id], 'write');
    }
};