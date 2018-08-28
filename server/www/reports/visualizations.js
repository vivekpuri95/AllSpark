const API = require('../../utils/api');
const reportHistory = require('../../utils/reportLogs');

exports.insert = class extends API {

    async insert({query_id, name, type, options = null} = {}) {

		this.assert(query_id, 'Query id is required');
		this.assert(name && type, 'Name or type is missing');

		this.assert(
			['table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear'].includes(type),
        	'Invalid visualization type'
		);

        let values = {query_id, name, type, options};

        const
            insertResponse = await this.mysql.query('INSERT INTO tb_query_visualizations SET  ?', [values], 'write'),
            [loggedRow] = await this.mysql.query(
                'SELECT * FROM tb_query_visualizations WHERE visualization_id = ?',
                [insertResponse.insertId]
            ),
            logs = {
                owner: 'visualization',
                owner_id: insertResponse.insertId,
                state: JSON.stringify(loggedRow),
                operation:'insert',
            };

        reportHistory.insert(this, logs);

        return insertResponse;
    }
};

exports.update = class extends API {

    async update({visualization_id, name, type, options = null} = {}) {

		this.assert(visualization_id, 'Visualization id is required');
		this.assert(name && type, 'Name or type is missing');

		this.assert(
			['table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear'].includes(type),
			'Invalid visualization type'
		);

        let
			values = {name, type, options},
			[updatedRow] =  await this.mysql.query('SELECT * FROM tb_query_visualizations WHERE visualization_id = ?', [visualization_id]),
            compareJson = {};

		this.assert(updatedRow, 'Invalid visualization id');

		for(const key in values) {

			compareJson[key] = updatedRow[key] == null ? null : updatedRow[key].toString();
			updatedRow[key] = values[key];
		}

        if(JSON.stringify(compareJson) == JSON.stringify(values)) {

        	return "0 rows affected";
		}

        const
            updateResponse = await this.mysql.query('UPDATE tb_query_visualizations SET ? WHERE visualization_id = ?', [values, visualization_id], 'write'),
            logs = {
                owner: 'visualization',
                owner_id: visualization_id,
                state: JSON.stringify(updatedRow),
                operation:'update',
            };

		reportHistory.insert(this, logs);

		return updateResponse
    }
};

exports.delete = class extends API {

    async delete({visualization_id} = {}) {

    	this.assert(visualization_id, 'Visualization Id required');

        const
			[updatedRow] =  await this.mysql.query('SELECT * FROM tb_query_visualizations WHERE visualization_id = ?', [visualization_id]),
            deleteResponse = await this.mysql.query('DELETE FROM tb_query_visualizations WHERE visualization_id = ?', [visualization_id], 'write'),
            logs = {
                owner: 'visualization',
                owner_id: visualization_id,
                state: JSON.stringify(updatedRow),
                operation:'delete',
            };

		reportHistory.insert(this, logs);

        return deleteResponse;
    }
};