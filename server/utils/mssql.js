const mysql = require("./mysql").MySQL;
const Sequelize = require('sequelize');

const poolObj = {};

class MsSql {

	static async crateExternalPool(id = -1) {

		const query = `select * from tb_credentials c where c.status = 1 and type = 'mssql'`;

		const credentials = await mysql.query(query);

		for (const credential of credentials) {

			poolObj[credential.id] = new Sequelize(credential.db, credential.user, credential.password, {
				host: credential.host,
				dialect: 'mssql',
				operatorsAliases: false,

				pool: {
					max: 10,
					min: 0,
					acquire: 30000,
					idle: 10000
				},

			});
		}

		console.log("MSSql Connections Available: ", Object.keys(poolObj));
	}

	async query(sqlQuery, parameters = [], connectionName) {

		if (!poolObj[connectionName]) {

			throw new Error("connection " + connectionName + "does not exist");
		}
		this.pool = poolObj[connectionName];

		const result = await this.pool.query(sqlQuery, {
			replacements: parameters || [] ,
			type: Sequelize.QueryTypes.SELECT,
			logging: (replacedQuery) => this.sql = replacedQuery
		});

		result.instance = this;

		return result;
	}
}


exports.MsSql = (() => new MsSql)();
exports.crateExternalPool = MsSql.crateExternalPool;

