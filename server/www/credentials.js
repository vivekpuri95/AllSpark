const mysql = require('../utils/mysql');
const bigquery = require('./bigquery').BigQuery;
const API = require('../utils/api');

exports.insert = class extends API {

    async insert() {

        await this.mysql.query(
            'insert into tb_credentials(account_id, connection_name, host, user, password, db, `limit`, type, file, project_name) values (?)',
            [[
                this.account.account_id,
                this.request.body.connection_name,
                this.request.body.host,
                this.request.body.user,
                this.request.body.password,
                this.request.body.db,
                this.request.body.limit || 10,
                this.request.body.type.toLowerCase(),
                this.request.body.file,
                this.request.body.project_name,

            ]],
            'write'
        );

        await mysql.crateExternalPool(this.request.body.id);
        await bigquery.setup();
        return {
            status: true,
            message: "updated db"
        }


    }
}

exports.list = class extends API {

    async list() {
        return await this.mysql.query('select * from tb_credentials WHERE account_id = ?', [this.account.account_id]);
    }
}

exports.delete = class extends API {

    async delete() {

        await this.mysql.query(
            'update tb_credentials set status = 0 where id = ?',
            [this.request.body['id']],
            'write');
        await mysql.crateExternalPool(this.request.body.id);
        await bigquery.setup();
        return {
            status: true,
            message: "updated db"
        }

    }

}

exports.update = class extends API {

    async update() {
        let id = this.request.body['id'];

        delete this.request.body.id;
        delete this.request.body.token;

        await this.mysql.query('update tb_credentials set ? where id = ?',[this.request.body, id], 'write');
        await mysql.crateExternalPool(this.request.body.id);
        await bigquery.setup();
        return {
            status: true,
            message: "updated db"
        }
    }
}


exports.testConnections = class extends API {

    async testConnections() {

        var conConfig = await this.mysql.query('select * from tb_credentials where id = ?',[this.request.body['id']]);
        conConfig = conConfig[0];
        conConfig['database'] = conConfig['db']

        var con = sql.createConnection(conConfig);
        var result = await this.checkPulse(con);
        con.end();

        return {conConfig, result};
    }


    checkPulse(con) {
        return new Promise((resolve, reject) => {
            con.connect(function (err) {
                if (err) resolve([{'status': 0}]);

                var startTime = Date.now();
                return con.query('select 1 as "status"', function (err, result) {
                    if (err) return resolve([{'status': 0}]);

                    var endTime = Date.now();
                    result[0]['time']=endTime-startTime;
                    return resolve(result);
                });
            });
        });
    }
}

exports.schema = class extends API {

    async schema() {

        const databases = []

        const columns  = await this.mysql.query(`SELECT * FROM information_schema.columns `, [], this.request.query.id);

        for(const column of columns) {

            let foundDatabase = false;

            for(const database of databases) {
                if(database.name == column.TABLE_SCHEMA)
                    foundDatabase = true;
            }

            if(!foundDatabase) {

                const database = {
                    name : column.TABLE_SCHEMA,
                    tables : []
                };

                databases.push(database);
            }

            for(const database of databases) {
                if(database.name == column.TABLE_SCHEMA) {
                    foundDatabase = database;
                }
            }


            let foundTable = false;

            for(const table of foundDatabase.tables) {
                if(table.name == column.TABLE_NAME)
                    foundTable = true;
            }

            if(!foundTable) {

                const table = {
                    name : column.TABLE_NAME,
                    columns : []
                };

                foundDatabase.tables.push(table);
            }

            for(const table of foundDatabase.tables) {
                if(table.name == column.TABLE_NAME) {
                    foundTable = table;
                }
            }



            let foundColumns = false;

            for(const column of foundTable.columns) {
                if(column.name == column.COLUMN_NAME)
                    foundColumns = true;
            }

            if(!foundColumns) {

                const columns = {
                    name : column.COLUMN_NAME,
                    type: column.COLUMN_TYPE,
                };

                foundTable.columns.push(columns);
            }

            for(const column of foundTable.columns) {
                if(column.name == columns.COLUMN_NAME) {
                    foundColumns = column;
                }
            }




        }


        return databases;
    }
}
