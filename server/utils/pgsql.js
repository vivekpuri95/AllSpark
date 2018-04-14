const {Pool} = require('pg');
const mysql = require("./mysql").MySQL;

const poolObj = {};

class Postgres {

	static async crateExternalPool(id = -1) {

		const query = `select * from tb_credentials c where c.status = 1 and type = 'pgsql'`;

		const credentials = await mysql.query(query);

		for (const credential of credentials) {

			poolObj[credential.id] = new Pool({
				user: credential.user,
				host: credential.host,
				password: credential.password,
				database: credential.db,
				port: credential.port || 5439,
			});

		}
		console.log("Postgres Connections Available: ", Object.keys(poolObj));
	}

	async query(sql, values = [], connectionName) {

		if (!poolObj[connectionName]) {

			throw new Error("connection " + connectionName + "does not exist");
		}

		this.pool = poolObj[connectionName];
		let result;
		let replacedSql = sql;

		for (let valueIndex = 0; valueIndex < values.length ; valueIndex++) {

			replacedSql = replacedSql.replace("$" + (valueIndex + 1), `'${values[valueIndex]}'`);
		}

		try {

			result = await this.pool.query({
				text: sql,
				values: values,
				rowMode: 'object',
			});
		}
		catch (err) {

			console.log({...err, message: err.message, sql: replacedSql});
			throw {...err, message: err.message, sql: replacedSql};
		}

		this.sql = replacedSql;
		this.originalSql = sql;
		result = result.rows;
		result.instance = this;

		return result;

	}
}


(async () => await Postgres.crateExternalPool())();


exports.Postgres = (() => new Postgres)();
exports.crateExternalPool = Postgres.crateExternalPool;