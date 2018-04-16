const mysql = require('../utils/mysql');
const bigquery = require('./bigquery').BigQuery;
const API = require('../utils/api');

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('connection');

		const response = await this.mysql.query(
			'INSERT INTO tb_credentials(account_id, connection_name, host, port, user, password, db, `limit`, type, file, project_name) VALUES (?)',
			[[
				this.account.account_id,
				this.request.body.connection_name,
				this.request.body.host,
				this.request.body.port,
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

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}

exports.list = class extends API {

	async list() {
		return await this.mysql.query(
			'SELECT * FROM tb_credentials WHERE account_id = ? AND status = 1',
			[this.account.account_id]
		);
	}
}

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('connection');

		const response = await this.mysql.query(
			'UPDATE tb_credentials SET status = 0 WHERE id = ? AND account_id = ?',
			[this.request.body.id, this.account.account_id],
			'write'
		);

		await mysql.crateExternalPool(this.request.body.id);

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}

exports.update = class extends API {

	async update() {

		let id = this.request.body['id'];

		delete this.request.body.id;
		delete this.request.body.token;

		const response = await this.mysql.query(
			'UPDATE tb_credentials SET ? WHERE id = ?',
			[this.request.body, id],
			'write'
		);

		await mysql.crateExternalPool(this.request.body.id);

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}


exports.testConnections = class extends API {

	async testConnections() {

		var conConfig = await this.mysql.query(
			'SELECT * FROM tb_credentials WHERE id = ?',
			[this.request.body['id']]
		);

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
					result[0]['time'] = endTime - startTime;
					return resolve(result);
				});
			});
		});
	}
}

exports.schema = class extends API {

	async schema() {

		const databases = [];
		let [typeOfConnection] = await this.mysql.query("select type from tb_credentials where id = ?", [this.request.query.id]);

		if (!typeOfConnection) {

			return "not found"
		}

		typeOfConnection = typeOfConnection.type;
		let columns;

		let selectQuery = `
			SELECT 
				table_schema as table_schema, 
				table_name as table_name,
				column_name as column_name,
				column_type as column_type
			FROM 
				information_schema.columns `;

		switch (typeOfConnection) {
			case "mysql":
				columns = await this.mysql.query(selectQuery, [], this.request.query.id);

				break;
			case "pgsql":
				columns = await this.pgsql.query(selectQuery.replace(/column_type/g, "data_type"), [], this.request.query.id);

				break;
			default:
				return "type not found";
		}

		for (const column of columns) {

			if (column.table_schema == 'information_schema')
				continue;

			let foundDatabase = false;

			for (const database of databases) {
				if (database.name == column.table_schema)
					foundDatabase = true;
			}

			if (!foundDatabase) {

				const database = {
					name: column.table_schema,
					tables: []
				};

				databases.push(database);
			}

			for (const database of databases) {
				if (database.name == column.table_schema) {
					foundDatabase = database;
				}
			}


			let foundTable = false;

			for (const table of foundDatabase.tables) {
				if (table.name == column.table_name)
					foundTable = true;
			}

			if (!foundTable) {

				const table = {
					name: column.table_name,
					columns: []
				};

				foundDatabase.tables.push(table);
			}

			for (const table of foundDatabase.tables) {
				if (table.name == column.table_name) {
					foundTable = table;
				}
			}

			let foundColumns = false;

			for (const column of foundTable.columns) {
				if (column.name == column.column_name)
					foundColumns = true;
			}

			if (!foundColumns) {

				const columns = {
					name: column.column_name,
					type: column.column_type || column.data_type,
				};

				foundTable.columns.push(columns);
			}

			for (const column of foundTable.columns) {
				if (column.name == columns.column_name) {
					foundColumns = column;
				}
			}
		}

		return databases;
	}
}
