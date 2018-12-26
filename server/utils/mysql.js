"use strict";

const mysql = require('mysql');
const Redis = require("./redis").Redis;
const Config = require('config');

const dbConfig = Config.get("sql_db");

console.log('INITIALIZE POOL###################################');


let poolObj = {};

for (const connection in dbConfig) {

	poolObj[connection] = {
		connection,
		pool: mysql.createPool(dbConfig[connection]),
	}
}


class MySQL {

	constructor(connectionName = 'read') {

		this.pool = poolObj[connectionName || 'read'] || poolObj['read'];
	}

	static async crateExternalPool(force) {

		if(force) {

			for(const connection in poolObj) {

				if(Object.keys(dbConfig).includes(connection)) {
					continue;
				}

				delete(poolObj[connection]);
			}
		};

		const query = `select * from tb_credentials c where c.status = 1 and type = "mysql"`;

		const mysqlObj = new MySQL();
		const credentials = await mysqlObj.query(query);

		for (const credential of credentials) {

			if(poolObj[credential.id]) {

				continue;
			}

			poolObj[credential.id] = {
				connection: {...credential, database: credential.db}
			};
		}

		await Redis.hset(`${process.env.NODE_ENV}#credentials`, "mysql", Object.values(poolObj).filter(x => x.pool && x.connection.id).map(x => x.connection.id).join(", "));

		console.log("MYSql Connections Available: ", Object.keys(poolObj));
	}

	async query(sql, values = null, connectionName = "read") {

		if(connectionName == 'write' && (Config.has('readOnlyMode') ? Config.get('readOnlyMode') : false)) {

			throw(new Error('The panel is currently in read only mode for maintenance. Please try after some time.'));
		}

		if(!poolObj[connectionName]) {

			await MySQL.crateExternalPool();
		}


		if(!poolObj[connectionName]) {

			throw(new Error('Connection not found'));
		}

		if(!poolObj[connectionName].pool) {

			poolObj[connectionName].pool = mysql.createPool(poolObj[connectionName].connection);
		}

		this.pool = poolObj[connectionName].pool;

		return new Promise((resolve, reject) => {

			const q = this.pool.query(sql, values, function (err, result) {

				if (err) {
					console.log(err);

					return reject(err);
				}

				if (!result.hasOwnProperty('length')) {
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

}

// (async () => await MySQL.crateExternalPool())();

exports.MySQL = (() => new MySQL)();
exports.crateExternalPool = MySQL.crateExternalPool;

