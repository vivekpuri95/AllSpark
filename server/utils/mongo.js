const mysql = require("./mysql").MySQL;
const {MongoClient} = require('mongodb');
const {flattenObject} = require('./commonFunctions');

const poolObj = {};

class Mongo {

	static async crateExternalPool() {

		const query = `select * from tb_credentials c where c.status = 1 and type = 'mongo'`;

		const credentials = await mysql.query(query);

		for (const credential of credentials) {

			const connectionString = `mongodb://${credential.user ? credential.user + ':' + credential.password + '@': ''}${credential.host}:${credential.port || 27017}/${credential.db}`;
			poolObj[credential.id] = (await MongoClient.connect(connectionString, {useNewUrlParser: true})).db(credential.db);
		}

		console.log("Mongo Connections Available: ", Object.keys(poolObj));
	}

	async query(aggregationQuery, collectionName, connectionName) {

		this.pool = poolObj[connectionName];

		return (await ((this.pool).collection(collectionName).aggregate(aggregationQuery).toArray())).map(x => flattenObject(x));
	}
}


exports.Mongo = (() => new Mongo)();
exports.crateExternalPool = Mongo.crateExternalPool;
