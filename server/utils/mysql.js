"use strict";

const mysql = require('mysql');
const dbConfig = require('config').get("sql_db");

console.log('INITIALIZE POOL###################################');


const poolObj = {};

for(const connection in dbConfig) {
    poolObj[connection] = mysql.createPool(dbConfig[connection])
}


class MySQL {
    constructor(connectionName='read') {
        this.pool = poolObj[connectionName || 'read'] || poolObj['read'];
    }

    async query(sql, values=null, connectionName='read') {
        this.pool = poolObj[connectionName];

        return new Promise((resolve, reject) => {

            const q = this.pool.query(sql, values, function(err, result) {

                if (err) {
                    console.log(err);
                    return reject(err);
                }

                if(!result.hasOwnProperty('length')) {
                    return resolve(result);
                }

                this.formatted_sql = q.sql;
                this.sql = q.sql.replace(/\n/g, ' ');
                this.result = result;
                result.instance = this;
                return resolve(result);
            });
        });
    }

    static async crateExternalPool(id=-1) {
        const query = `select * from tb_credentials c where c.status = 1 and type = 'mysql'`;

        const mysqlObj = new MySQL();
        const credentials = await mysqlObj.query(query);

        for(const credential of credentials) {

            poolObj[credential.id] = mysql.createPool({
                connectionLimit : credential.limit || 10,
                user            : credential.user,
                host            : credential.host,
                password        : credential.password,
                database        : credential.db,
            });

        }
        console.log("Connections Available: ", Object.keys(poolObj))
    }

}

(async () => await MySQL.crateExternalPool())();

exports.MySQL = (() => new MySQL)();
exports.crateExternalPool = MySQL.crateExternalPool;

