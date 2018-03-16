const API = require('../../utils/api');

exports.names = class extends API {

    async names() {

        const result = await this.mysql.query('SELECT * FROM tb_query_datasets');

        return result.map(d => d.name);
    }
};

exports.list = class extends API {

    async list() {

        const result = await this.mysql.query('SELECT * FROM tb_query_datasets');

        for( const row of result){
            row["roles"] = row["roles"] ? row["roles"].split(",").map(Number) : [];
        }

        return result;
    }
};

exports.insert = class extends API {

    async insert() {

        let
            values = {}, dataset_cols = ['account_id', 'category_id', 'dataset', 'name', 'value'];

        for(const key in this.request.body) {
            if(dataset_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        values["account_id"] = this.account.account_id;
        return await this.mysql.query('INSERT INTO tb_query_datasets SET  ?', [values], 'write');
    }
};

exports.update = class extends API {

    async update() {

        let
            values = {}, dataset_cols = ['category_id', 'dataset', 'name', 'value'];

        for(const key in this.request.body) {
            if(dataset_cols.includes(key))
                values[key] = this.request.body[key] || null;
        }

        return await this.mysql.query('UPDATE tb_query_datasets SET ? WHERE id = ? and account_id = ?', [values, this.request.body.id, this.account.account_id], 'write');
    }
};
exports.delete = class extends API {

    async delete() {

        return await this.mysql.query('DELETE FROM tb_query_datasets WHERE id = ? and account_id = ?', [this.request.body.id, this.account.account_id], 'write');
    }
};