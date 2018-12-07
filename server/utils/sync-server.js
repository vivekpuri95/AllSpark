const Redis = require("./redis").Redis;
const account = require("../onServerStart");
const constants = require('./constants');

class Servers {

	constructor() {

		const keys = [
			`${constants.lastUpdatedKeys.connection}.mysql`,
			`${constants.lastUpdatedKeys.connection}.pgsql`,
			`${constants.lastUpdatedKeys.connection}.mssql`,
			`${constants.lastUpdatedKeys.connection}.mongo`,
			`${constants.lastUpdatedKeys.connection}.oracle`,
			`${constants.lastUpdatedKeys.account}`,
		];

		global.lastUpdated = {};

		for(const key of keys) {
			global.lastUpdated[key] = Date.now();
		}
	}

	static async set(key) {

		global.lastUpdated[key] = Date.now();

		await Redis.hset('lastUpdated', key, global.lastUpdated[key]);
	}

	static async get(key) {

		return await Redis.hget('lastUpdated', key);
	}

	static async status(key) {

		const time = await Servers.get(key);

		if(!time) {
			return false;
		}

		if(parseInt(time) > global.lastUpdated[key]) {
			return true;
		}

		return false;
	}

	static async call(type) {

		await Servers.list.get(type.name.toLowerCase()).call(type.object);
	}
}

Servers.list = new Map;

Servers.list.set('connection.mysql', class {

	static async call(mysql) {

		global.lastUpdated['connection.mysql'] = await Redis.hget('lastUpdated', 'connection.mysql');

		await mysql.crateExternalPool(true);

		console.log('###### Updated mysql');
	}
});

Servers.list.set('connection.pgsql', class {

	static async call(pgsql) {

		global.lastUpdated['connection.pgsql'] = await Redis.hget('lastUpdated', 'connection.pgsql');

		await pgsql.crateExternalPool();

		console.log('###### Updated pgsql');
	}
});

Servers.list.set('connection.mssql', class {

	static async call(mssql) {

		global.lastUpdated['connection.mssql'] = await Redis.hget('lastUpdated', 'connection.mssql');

		await mssql.crateExternalPool();

		console.log('###### Updated mssql');
	}
});

Servers.list.set('connection.mongo', class {

	static async call(mongo) {

		global.lastUpdated['connection.mongo'] = await Redis.hget('lastUpdated', 'connection.mongo');

		await mongo.crateExternalPool();

		console.log('###### Updated mongo');
	}
});

Servers.list.set('connection.oracle', class {

	static async call(oracle) {

		global.lastUpdated['connection.oracle'] = await Redis.hget('lastUpdated', 'connection.oracle');

		await oracle.crateExternalPool();

		console.log('###### Updated oracle');
	}
});

Servers.list.set('account', class {

	static async call() {

		global.lastUpdated['account'] = await Redis.hget('lastUpdated', 'account');

		await account.loadAccounts();

		console.log('###### Updated account');
	}
});

module.exports = Servers;