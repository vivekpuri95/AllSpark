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

	async query(sql, values = null, connectionName) {

		if (!poolObj[connectionName]) {
			throw new Error("connection " + connectionName + "does not exist");
		}

		this.pool = poolObj[connectionName];
		let result;

		try {

			result = await this.pool.query(sql, values);
		}
		catch (err) {

			console.log(err.stack);
			console.log(err.message)
			return err;
		}

		// result = {
		// 	rows: result.rows,
		// 	instance: {
		// 		sql: sql
		// 	},
		// };

		this.sql = sql;
		result = result.rows;
		result.instance = this;

		return result;

	}
}


(async () => await Postgres.crateExternalPool())();


exports.Postgres = (() => new Postgres)();
exports.crateExternalPool = Postgres.crateExternalPool;