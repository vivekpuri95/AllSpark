const API = require('../../utils/api');
const reportHistory = require('../../utils/reportLogs');

exports.insert = class extends API {

    async insert() {

        let
            values = {}, visual_cols = ['query_id', 'name', 'type', 'options'];

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
            values = {}, visual_cols = ['name', 'type', 'description', 'options'],
			[updatedRow] =  await this.mysql.query('SELECT * FROM tb_query_visualizations WHERE visualization_id = ?', [this.request.body.visualization_id]),
            compareJson = {};

		this.assert(updatedRow, 'Invalid visualization id');

        for(const key in this.request.body) {

            if(visual_cols.includes(key)) {

                values[key] = this.request.body[key] || null;
				compareJson[key] = updatedRow[key] ? typeof updatedRow[key] == "object" ? updatedRow[key] : updatedRow[key].toString() : '';
			}
        }

        if(JSON.stringify(compareJson) == JSON.stringify(values))
            return;

        const
            updateResponse = await this.mysql.query('UPDATE tb_query_visualizations SET ? WHERE visualization_id = ?', [values, this.request.body.visualization_id], 'write'),
            logs = {
                owner: 'visualization',
                owner_id: this.request.body.visualization_id,
                value: JSON.stringify(updatedRow),
                operation:'update',
            };

		reportHistory.insert(this, logs);

		return updateResponse
    }
};

exports.delete = class extends API {

    async delete() {

        const
			[updatedRow] =  await this.mysql.query('SELECT * FROM tb_query_visualizations WHERE visualization_id = ?', [this.request.body.visualization_id]),
            deleteResponse = await this.mysql.query('DELETE FROM tb_query_visualizations WHERE visualization_id = ?', [this.request.body.visualization_id], 'write'),
            logs = {
                owner: 'visualization',
                owner_id: this.request.body.visualization_id,
                value: JSON.stringify(updatedRow),
                operation:'delete',
            };

		reportHistory.insert(this, logs);

        return deleteResponse;
    }
};