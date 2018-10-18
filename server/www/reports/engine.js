const API = require("../../utils/api");
const commonFun = require('../../utils/commonFunctions');
const dbConfig = require('config').get("sql_db");
const promisify = require('util').promisify;
const bigQuery = require('../../utils/bigquery').BigQuery;
const constants = require("../../utils/constants");
const vm = require('vm');
const crypto = require('crypto');
const request = require("request");
const auth = require('../../utils/auth');
const redis = require("../../utils/redis").Redis;
const requestPromise = promisify(request);
const config = require("config");
const fetch = require('node-fetch');
const URLSearchParams = require('url').URLSearchParams;
const fs = require("fs");
const mongoConnecter = require("../../utils/mongo").Mongo.query;
const userQueryLogs = require("../accounts").userQueryLogs;
const getRole = require("../object_roles").get;
const ObjectId = require('mongodb').ObjectID;
const oracle = require('../../utils/oracle').Oracle;

// prepare the raw data
class report extends API {

	async load(reportObj, filterList) {

		if (reportObj && filterList) {

			this.reportObj = reportObj;
			this.filterList = filterList;
			this.reportId = reportObj.query_id;
		}

		const objRole = new getRole();

		let reportDetails = [

			this.mysql.query(`
				SELECT
                  q.*,
                  IF(user_id IS NULL AND userDashboard.query_id IS NULL, 0, 1) AS flag,
                  c.type,
				  c.project_name
                FROM
				tb_query q
                JOIN
          			(
                		SELECT
                			query_id
                		FROM
                			tb_visualization_dashboard vd
                		JOIN
                			tb_object_roles r
                			ON vd.dashboard_id = r.owner_id
                		JOIN
                			tb_query_visualizations qv
                			USING(visualization_id)
                		WHERE
                			target_id = ? -- user_id
                			AND query_id = ?
                			AND OWNER = 'dashboard'
                			AND target = 'user'
                			AND qv.is_enabled = 1
                			and qv.is_deleted = 0
                		UNION ALL
                		SELECT
                			NULL AS query_id
                		LIMIT 1
                	) userDashboard
                JOIN
				(
				    SELECT
				        owner_id AS user_id
				    FROM
				        tb_object_roles o
				    WHERE
				        owner_id = ? -- query
				        AND target_id = ? -- user
				        AND OWNER = 'query'
				        AND target = 'user'

				    UNION ALL

				    SELECT
				        NULL AS user_id

					LIMIT 1
				) AS queryUser

				JOIN
					tb_credentials c
				ON
					q.connection_name = c.id

                WHERE
					q.query_id = ?
					AND is_enabled = 1
					AND is_deleted = 0
					AND q.account_id = ?
					AND c.status = 1
				`,

				[this.user.user_id, this.reportId, this.reportId, this.user.user_id, this.reportId, this.account.account_id, this.account.account_id],
			),

			this.mysql.query(`select * from tb_query_filters where query_id = ?`, [this.reportId]),

			objRole.get(this.account.account_id, "query", "role", this.reportId,)
		];

		reportDetails = await Promise.all(reportDetails);
		this.assert(reportDetails[0].length, "Report Id: " + this.reportId + " not found");

		this.reportObj = reportDetails[0][0];
		this.filters = reportDetails[1] || [];

		this.reportObj.roles = [...new Set(reportDetails[2].map(x => x.target_id))];
		this.reportObj.category_id = [...new Set(reportDetails[2].map(x => x.category_id))];

		let [preReportApi] = await this.mysql.query(
			`select value from tb_settings where owner = 'account' and profile = 'pre_report_api' and owner_id = ?`,
			[this.account.account_id],
		);

		if (preReportApi && commonFun.isJson(preReportApi.value)) {

			for (const key of this.account.settings.get("external_parameters")) {

				if ((constants.filterPrefix + key) in this.request.body) {

					this.filters.push({
						placeholder: key.replace(constants.filterPrefix),
						value: this.request.body[key.replace(constants.filterPrefix)],
						default_value: this.request.body[key.replace(constants.filterPrefix)],
					})
				}
			}

			preReportApi = (JSON.parse(preReportApi.value)).value;

			let preReportApiDetails;

			try {
				preReportApiDetails = await requestPromise({

					har: {
						url: preReportApi,
						method: 'GET',
						headers: [
							{
								name: 'content-type',
								value: 'application/x-www-form-urlencoded'
							}
						],
						queryString: this.account.settings.get("external_parameters").map(x => {
							return {
								name: x,
								value: this.request.body[constants.filterPrefix + x],
							}
						})
					},
					gzip: true
				});
			}
			catch (e) {
				return {"status": false, data: "invalid request " + e.message};
			}

			preReportApiDetails = JSON.parse(preReportApiDetails.body).data[0];

			for (const key in preReportApiDetails) {

				this.filters.push({
					placeholder: key,
					value: preReportApiDetails[key] ? preReportApiDetails[key].toString() : '',
					default_value: preReportApiDetails[key] ? preReportApiDetails[key].toString() : '',
				})
			}
		}

		this.reportObj.query = this.request.body.query || this.reportObj.query;
	}

	async authenticate() {
		this.account.features.needs(this.reportObj.type + '-source');

		const authResponse = await auth.report(this.reportObj, this.user);
		this.assert(!authResponse.error, "user not authorised to get the report");
	}

	prepareFiltersForOffset() {

		//filter fields required = offset, placeholder, default_value

		for (const filter of this.filters) {

			if (isNaN(parseFloat(filter.offset))) {

				continue;
			}

			if (filter.type == 'date') {

				filter.default_value = new Date(Date.now() + filter.offset * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
				filter.value = this.request.body[constants.filterPrefix + filter.placeholder] || filter.default_value;

				if (filter.value >= new Date().toISOString().slice(0, 10)) {
					this.has_today = true;

				}
			}

			if (filter.type == 'month') {

				const date = new Date();

				filter.default_value = new Date(Date.UTC(date.getFullYear(), date.getMonth() + filter.offset, 1)).toISOString().substring(0, 7);
				filter.value = this.request.body[constants.filterPrefix + filter.placeholder] || filter.default_value;

				if (filter.value >= new Date().toISOString().slice(0, 7)) {

					this.has_today = true;
				}
			}

			if (filter.type == 'datetime') {

				filter.default_value = new Date(Date.now() + filter.offset * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
				filter.value = this.request.body[constants.filterPrefix + filter.placeholder] || filter.default_value;

				if (filter.value >= new Date().toISOString().slice(0, 10)) {

					this.has_today = true;
				}
			}
		}

		for (const filter of this.filters) {

			filter.value = this.request.body[constants.filterPrefix + filter.placeholder] || filter.default_value;
		}
	}

	async storeQueryResultSetup() {

		if (this.reportObj.load_saved) {

			const userQueryLogsObj = new userQueryLogs();
			Object.assign(userQueryLogsObj, this);

			await userQueryLogsObj.userQueryLogs();

			this.queryResultDb = this.account.settings.get('load_saved_database');
			this.queryResultConnection = parseInt(this.account.settings.get('load_saved_connection'));

			this.assert(this.queryResultConnection, "connection id for loading saved result is not valid");
		}
	}

	async storeQueryResult(result) {

		if (this.reportObj.load_saved) {

			let [idToUpdate] = await this.mysql.query(
				"select max(id) as id from ??.?? where query_id = ? and type = ?",
				[this.queryResultDb, constants.saveQueryResultTable, this.reportObj.query_id, this.reportObj.type],

				this.queryResultConnection
			);

			if (idToUpdate && idToUpdate.id) {

				idToUpdate = idToUpdate.id;

				return await this.mysql.query(
					"update ??.?? set data = ? where query_id = ? and type = ? and id = ?",
					[this.queryResultDb, constants.saveQueryResultTable,
						JSON.stringify(result), this.reportObj.query_id, this.reportObj.type, idToUpdate],
					this.queryResultConnection
				);
			}

			else {

				return await this.mysql.query(
					"insert into ??.?? (query_id, type, user_id, query, data) values (?, ?, ?, ?, ?)",
					[
						this.queryResultDb, constants.saveQueryResultTable,
						this.reportObj.query_id, this.reportObj.type, this.user.user_id, this.reportObj.query || "",
						JSON.stringify(result)
					],
					this.queryResultConnection
				);
			}
		}

		else {
			return [];
		}
	}

	async report(queryId, reportObj, filterList) {

		this.request.body = {...this.request.body, ...this.request.query};

		this.reportId = this.request.body.query_id || queryId;
		this.reportObjStartTime = Date.now();
		const forcedRun = parseInt(this.request.body.cached) === 0;


		await this.load(reportObj, filterList);
		await this.authenticate();

		await this.storeQueryResultSetup();

		let result;

		if (this.reportObj.load_saved) {

			if (this.request.body.data) {

				this.assert(commonFun.isJson(this.request.body.data), "data for saving is not json");

				this.request.body.data = JSON.parse(this.request.body.data);

				await this.storeQueryResult(this.request.body.data);

				return {
					data: this.request.body.data,
					message: "saved"
				};
			}

			[result] = await this.mysql.query(`
				select
					*
				from
					??.??
				where
					query_id = ?
					and id =
						(
							select
								max(id)
							from
								??.??
							where
								query_id = ?
								and type = ?
						)
			`,
				[
					this.queryResultDb, "tb_save_history", this.reportObj.query_id, this.queryResultDb, "tb_save_history",
					this.reportObj.query_id, this.reportObj.type
				],
				parseInt(this.queryResultConnection),
			);

			if (result && result.data) {

				this.assert(commonFun.isJson(result.data), "result is not a json");

				result.data = JSON.parse(result.data);
				const age = Math.round((Date.now() - Date.parse(result.created_at)) / 1000);
				result = result.data;

				return {
					data: result,
					age: age,
					load_saved: true,
				};
			}
		}

		this.prepareFiltersForOffset();

		let preparedRequest;

		switch (this.reportObj.type.toLowerCase()) {

			case "mysql":
				preparedRequest = new MySQL(this.reportObj, this.filters, this.request.body.token);
				break;
			case "mssql":
				preparedRequest = new MSSQL(this.reportObj, this.filters, this.request.body.token);
				break;
			case "api":
				preparedRequest = new APIRequest(this.reportObj, this.filters, this.request.body.token);
				break;
			case "pgsql":
				preparedRequest = new Postgres(this.reportObj, this.filters, this.request.body.token);
				break;
			case "bigquery":
				preparedRequest = new Bigquery(this.reportObj, this.filters, this.request.body.token);
				break;
			case "mongo":
				preparedRequest = new Mongo(this.reportObj, this.filters);
				break;
			case "oracle":
				preparedRequest = new Oracle(this.reportObj, this.filters);
				break;
			case "file":
				this.assert(false, 'No data found in the file. Please upload some data first.');
				break;
			default:
				this.assert(false, "Report Type " + this.reportObj.type.toLowerCase() + " does not exist", 404);
		}

		preparedRequest = preparedRequest.finalQuery;

		const engine = new ReportEngine(preparedRequest);

		const hash = "Report#report_id:" + this.reportObj.query_id + "#hash:" + engine.hash + '#redis-timeout#' + this.reportObj.is_redis;

		if (this.reportObj.is_redis === "EOD") {

			const d = new Date();
			this.reportObj.is_redis = (24 * 60 * 60) - (d.getHours() * 60 * 60) - (d.getMinutes() * 60) - d.getSeconds();
		}

		let redisData = null;

		if (redis) {
			redisData = await redis.get(hash);
		}

		//Priority: Redis > (Saved Result)

		if (!forcedRun && this.reportObj.is_redis && redisData && !this.has_today) {

			try {

				result = JSON.parse(redisData);

				// await this.storeQueryResult(result);

				await engine.log(this.reportObj.query_id, result.query,
					Date.now() - this.reportObjStartTime, this.reportObj.type,
					this.user.user_id, 1, JSON.stringify({filters: this.filters}), this.user.session_id
				);

				result.cached = {
					status: true,
					age: Date.now() - result.cached.store_time
				};
				return result;
			}
			catch (e) {
				throw new API.Exception(500, "Invalid Redis Data!");
			}
		}

		if (global.executingReports.has(engine.hash)) {

			return await global.executingReports.get(engine.hash).get("execute");
		}

		const engineExecution = engine.execute();

		const queryDetails = new Map;

		queryDetails.set("query", {id: this.reportObj.query_id, name: this.reportObj.name});
		queryDetails.set("account", {id: this.account.account_id, name: this.account.name});
		queryDetails.set("user", {id: this.user.user_id, name: this.user.name});
		queryDetails.set("execution_timestamp", new Date());
		queryDetails.set("params", engine.parameters);
		queryDetails.set("execute", engineExecution);

		global.executingReports.set(engine.hash, queryDetails);

		try {

			result = await engineExecution;
			await this.storeQueryResult(result);

		}
		catch (e) {

			console.error(e.stack);

			if (e.message.includes("<!DOCTYPE")) {

				e.message = e.message.slice(0, e.message.indexOf("<!DOCTYPE")).trim();
			}

			throw new API.Exception(400, e.message);
		}

		finally {

			global.executingReports.delete(engine.hash);
		}

		await engine.log(this.reportObj.query_id, result.query, result.runtime,
			this.reportObj.type, this.user.user_id, 0, JSON.stringify({filters: this.filters}), this.user.session_id
		);

		const EOD = new Date();
		EOD.setHours(23, 59, 59, 999);

		result.cached = {store_time: Date.now()};

		if (redis) {

			await redis.set(hash, JSON.stringify(result));

			if (this.reportObj.is_redis) {
				await redis.expire(hash, this.reportObj.is_redis);
			}
		}

		result.cached = {status: false};

		return result;
	}
}


class SQL {

	constructor(reportObj, filters = [], token = null) {

		this.reportObj = reportObj;
		this.filters = filters;
		this.token = token;
	}

	prepareQuery() {

		this.reportObj.query = (this.reportObj.query || '')
			.replace(/--.*(\n|$)/g, "")
			.replace(/\s+/g, ' ');

		this.filterIndices = {};

		for (const filter of this.filters) {

			this.filterIndices[filter.placeholder] = {

				indices: (commonFun.getIndicesOf(`{{${filter.placeholder}}}`, this.reportObj.query)),
				value: filter.value,
			};
		}

		for (const filter of this.filters) {

			if (filter.type == 'column') {

				this.reportObj.query = this.reportObj.query.replace(new RegExp(`{{${filter.placeholder}}}`, 'g'), "??");
				continue;
			}

			this.reportObj.query = this.reportObj.query.replace(new RegExp(`{{${filter.placeholder}}}`, 'g'), "?");

		}

		this.filterList = this.makeQueryParameters();
	}

	makeQueryParameters() {

		const filterIndexList = [];

		for (const placeholder in this.filterIndices) {

			this.filterIndices[placeholder].indices = this.filterIndices[placeholder].indices.map(x =>

				filterIndexList.push({
					value: this.filterIndices[placeholder].value,
					index: x,
				})
			);
		}

		return (filterIndexList.sort((x, y) => x.index - y.index)).map(x => x.value) || [];
	}
}


class MySQL extends SQL {

	constructor(reportObj, filters = [], token = null) {

		super(reportObj, filters, token);
	}

	get finalQuery() {

		this.prepareQuery();

		return {
			request: [this.reportObj.query, this.filterList || [], this.reportObj.connection_name,],
			type: "mysql"
		};
	}

}


class MSSQL extends SQL {

	constructor(reportObj, filters = [], token = null) {

		super(reportObj, filters, token);
	}

	get finalQuery() {

		this.prepareQuery();

		return {
			request: [this.reportObj.query, this.filterList || [], this.reportObj.connection_name,],
			type: "mssql"
		};
	}

}


class APIRequest {

	constructor(reportObj, filters = [], token) {

		this.reportObj = reportObj;
		this.filters = filters;
		this.token = token;
	}

	get finalQuery() {

		this.prepareQuery();

		if (this.definition.method === "GET") {

			return {
				request: [this.url, {...this.definition}],
				type: "api",
			}
		}

		return {
			request: [this.url, {body: this.parameters, ...this.definition}],
			type: "api",
		}
	}

	prepareQuery() {

		let parameters = new URLSearchParams;

		for (const filter of this.filters) {

			if (filter.value.__proto__.constructor.name === "Array") {

				for (const item of filter.value) {

					parameters.append(filter.placeholder, item);
				}
			}

			else {

				parameters.append(filter.placeholder, filter.value);
			}
		}


		try {

			this.definition = JSON.parse(this.reportObj.definition);
		}

		catch (e) {

			const err = Error("url options is not JSON");
			err.status = 400;
			return err;
		}

		if (!this.filters.filter(f => f.placeholder === 'token').length) {

			parameters.append("token", this.token);
		}

		this.url = this.definition.url;

		if (this.definition.method === 'GET') {

			this.url += "?" + parameters;
		}

		this.parameters = parameters;
	}
}


class Postgres {

	constructor(reportObj, filters = [], token) {

		this.reportObj = reportObj;
		this.filters = filters;
		this.token = token;

	}

	get finalQuery() {

		this.applyFilters();

		return {
			request: [this.reportObj.query, this.values, this.reportObj.connection_name,],
			type: "pgsql",
		};
	}

	applyFilters() {

		this.reportObj.query = this.reportObj.query
			.replace(/--.*(\n|$)/g, "")
			.replace(/\s+/g, ' ');

		this.values = [];
		this.index = 1;

		for (const filter of this.filters) {

			if (filter.value.__proto__.constructor.name === "Array") {

				this.reportObj.query = this.replaceArray(new RegExp(`{{${filter.placeholder}}}`, 'g'), this.reportObj.query, filter.value);
			}

			else {

				this.reportObj.query = this.replaceArray(new RegExp(`{{${filter.placeholder}}}`, 'g'), this.reportObj.query, [filter.value]);
			}
		}
	}

	replaceArray(exp, str, arr) {

		const containerArray = [];

		for (let occurrence = 0; occurrence < (str.match(exp) || []).length; occurrence++) {

			const tempArr = [];

			for (let arrIndex = 0; arrIndex < arr.length; arrIndex++) {

				tempArr.push("$" + this.index++);
			}

			containerArray.push(tempArr);
			this.values = this.values.concat(arr);
		}

		str = str.replace(exp, (() => {
			let number = 0;

			return () => (containerArray[number++] || []).join(", ");

		})());

		return str;
	}
}


class Bigquery {

	constructor(reportObj, filters = []) {

		this.reportObj = reportObj;
		this.filters = filters;

		this.typeMapping = {
			"number": "integer",
			"text": "string",
			"date": "date",
			"month": "string",
			"hidden": "string",
			"datetime": "string"
		};
	}

	get finalQuery() {

		this.prepareQuery();

		return {
			type: "bigquery",
			request: [this.reportObj.query, this.filterList || [], this.reportObj.account_id, this.reportObj.connection_name + ".json", this.reportObj.project_name]
		}
	}

	makeFilters(data, name, type = "STRING", is_multiple = 0,) {


		let filterObj = {
			name: name
		};

		type = this.typeMapping[type];

		if (is_multiple) {

			filterObj.parameterType = {
				"type": "ARRAY",
				"arrayType": {
					"type": type.toUpperCase(),
				}
			};

			filterObj.parameterValue = {
				arrayValues: [],
			};

			if (!Array.isArray(data)) {

				data = [data]
			}

			for (const item of data) {

				filterObj.parameterValue.arrayValues.push({
					value: item
				});
			}
		}

		else {

			filterObj.parameterType = {
				type: type.toUpperCase(),
			};

			filterObj.parameterValue = {
				value: data,
			}
		}

		this.filterList.push(filterObj);
	}

	prepareQuery() {

		this.filterList = [];

		for (const filter of this.filters) {

			this.reportObj.query = this.reportObj.query.replace((new RegExp(`{{${filter.placeholder}}}`, "g")), `@${filter.placeholder}`);

			if (!filter.type) {
				try {

					if ((filter.value.match(/^-{0,1}\d+$/))) {

						filter.type = 'number';
					}
					else {

						filter.type = 'text';
					}
				}
				catch (e) {

					continue;
				}
			}

			this.makeFilters(filter.value, filter.placeholder, filter.type, filter.multiple);
		}
	}
}


class Mongo {

	constructor(reportObj, filters) {

		this.reportObj = reportObj;
		this.filters = filters;

		reportObj.definition = JSON.parse(reportObj.definition);

		this.sandbox = {x: 1, ObjectId};
	}

	get finalQuery() {

		this.applyFilters();
		this.prepareQuery;

		return {
			type: "mongo",
			request: [this.reportObj.query, this.reportObj.definition.collection_name, this.reportObj.connection_name]
		}
	}

	applyFilters() {

		for (const filter of this.filters) {

			const regex = new RegExp(`{{${filter.placeholder}}}`, 'g');

			if (filter.multiple && !Array.isArray(filter.value)) {

				filter.value = [filter.value];
			}

			this.reportObj.query = this.reportObj.query.replace(regex, typeof filter.value == 'object' ? filter.placeholder : `'${filter.value}'`);
			this.sandbox[filter.placeholder] = filter.value;
		}
	}

	get prepareQuery() {

		vm.createContext(this.sandbox);

		const code = `x = ${this.reportObj.query}`;

		try {
			vm.runInContext(code, this.sandbox);
		}

		catch (e) {

			throw new API.Exception(400, {
				message: e.message,
				query: JSON.stringify(this.reportObj.query, 0, 1),
			})
		}

		this.reportObj.query = this.sandbox.x;

		if (!(this.reportObj.definition.collection_name && this.reportObj.query)) {

			throw("something missing in collection and aggregate query");
		}
	}
}


class Oracle {

	constructor(reportObj, filters = []) {

		this.reportObj = reportObj;
		this.filters = filters;
	}

	prepareQuery() {

		let queryParameters = {};

		for (const filter of this.filters) {

			if (!Array.isArray(filter.value)) {

				filter.value = [filter.value];
			}

			queryParameters = {...queryParameters, ...this.prepareParameters(filter)};
		}

		this.queryParameters = queryParameters;
	}


	prepareParameters(filter) {

		const filterObj = {}, containerArray = [];

		const regex = new RegExp(`{{${filter.placeholder}}}`, 'g');

		for (let position = 0; position < (this.reportObj.query.match(regex) || []).length; position++) {

			let tempArray = [];

			for (const [index, value] of filter.value.entries()) {

				const key = `${filter.placeholder}_${position}_${index}`;

				filterObj[key] = value;
				tempArray.push(":" + key);
			}

			containerArray.push(tempArray);
		}

		this.reportObj.query = this.reportObj.query.replace(regex, (() => {

			let number = 0;

			return () => (containerArray[number++] || []).join(", ");
		})());

		return filterObj;
	}

	get finalQuery() {

		this.prepareQuery();

		return {
			type: "oracle",
			request: [this.reportObj.query, this.queryParameters, this.reportObj.connection_name],
		}
	}
}


class ReportEngine extends API {

	constructor(parameters) {

		super();

		ReportEngine.engines = {
			mysql: this.mysql.query,
			pgsql: this.pgsql.query,
			api: fetch,
			bigquery: bigQuery.call,
			mssql: this.mssql.query,
			mongo: mongoConnecter,
			oracle: oracle.query,
		};

		this.parameters = parameters || {};
	}

	get hash() {

		if (this.parameters.type === 'api' && this.parameters.request[1].body) {

			this.parameters.request[1].params = this.parameters.request[1].body.toString();
		}
		return crypto.createHash('md5').update(JSON.stringify(this.parameters) || "").digest('hex');
	}

	async execute() {

		this.executionTimeStart = Date.now();

		if (!Object.keys(this.parameters).length) {

			this.parameters = {
				request: [this.request.body.query, [], this.request.body.connection_id],
				type: this.request.body.type
			}
		}

		let data = await ReportEngine.engines[this.parameters.type](...this.parameters.request);

		let query;

		if (["mysql", "pgsql", "mssql", "oracle"].includes(this.parameters.type)) {

			query = data.instance ? data.instance.sql : data;
		}

		else if (this.parameters.type === "api") {

			query = this.parameters.request;

			data = await data.json();

			if (data && Array.isArray(data.data)) {

				data = data.data;
			}
		}

		else if (this.parameters.type === "mongo") {

			query = JSON.stringify(this.parameters.request[0], 0, 1);
		}

		return {
			data: data,
			runtime: (Date.now() - this.executionTimeStart),
			query: query,
		};
	}

	async log(query_id, result_query, executionTime, type, userId, is_redis, rows, session_id) {

		try {

			if (typeof result_query === "object") {

				query = JSON.stringify(query);
				result_query = JSON.stringify(result_query);
			}

			const db = dbConfig.write.database.concat('_logs');

			await this.mysql.query(`
				INSERT INTO
					${db}.tb_report_logs (
						query_id,
						result_query,
						response_time,
						type,
						user_id,
						session_id,
						cache,
						\`rows\`,
						creation_date
					)
				VALUES
					(?,?,?,?,?,?,?,?, DATE(NOW()))`,
				[query_id, result_query, executionTime, type, userId, session_id, is_redis, rows],
				"write"
			);
		}

		catch (e) {
			console.log(e);
		}
	}
}


class query extends API {

	async query() {

		const [type] = await this.mysql.query("select type from tb_credentials where id = ?", [this.request.body.connection_id]);
		const query = await this.mysql.query("select * from tb_query where query_id = ? and account_id = ? and is_enabled = 1 and is_deleted = 0");

		this.assert(type, "credential id " + this.request.body.connection_id + " not found");

		const objRole = new getRole();

		const possiblePrivileges = ["report.edit", "admin", "superadmin"];

		const categories = (await objRole.get(this.account.account_id, 'query', 'role', this.request.body.query_id)).map(x => x.category_id);

		let userCategories = this.user.privileges.filter(x => possiblePrivileges.includes(x.privilege_name)).map(x => x.category_id);

		let flag = false;

		for(let category of categories) {

			category = category.map(x => x.toString())

			flag = flag || category.every(x => userCategories.includes(x.toString()));
		}

		flag = flag || this.user.privilege.has('superadmin');



		this.parameters = {
			request: [this.request.body.query, [], this.request.body.connection_id],
			type: this.request.body.type || type.type
		};

		const reportEngine = new ReportEngine(this.parameters);

		return await reportEngine.execute();
	}
}


class download extends API {

	static async jsonRequest(obj, url) {

		return new Promise((resolve, reject) => {

				request({
						method: 'POST',
						uri: url,
						json: obj
					},
					function (error, response, body) {
						if (error) {
							return reject(error)
						}
						return resolve({
							response,
							body
						})
					})
			}
		)
	}

	async download() {

		let queryData = this.request.body.data;

		this.assert(this.request.body.visualization);

		let [excel_visualization] = await this.mysql.query("select * from tb_visualizations where slug = ?", [this.request.body.visualization]);

		this.assert(excel_visualization, "visualization does not exist");

		excel_visualization = excel_visualization.excel_format;

		this.assert(commonFun.isJson(excel_visualization), "excel_visualization format issue");

		// queryData = JSON.parse(queryData);
		excel_visualization = JSON.parse(excel_visualization);

		const fileName = `${this.request.body.file_name}_${(new Date().toISOString()).substring(0, 10)}_${(this.user || {}).user_id || ''}`;
		const requestObj = {
			data_obj: [
				{
					series: queryData,
					charts: {
						1: {
							x: {name: this.request.body.bottom},
							y: {name: this.request.body.left},
							x1: {name: this.request.body.top},
							y1: {name: this.request.body.right},
							cols: this.request.body.columns,
							type: !this.request.body.classic_pie && excel_visualization.type == 'pie' ? {"type": "doughnut"} : excel_visualization,
						}
					},
					sheet_name: this.request.body.sheet_name.slice(0, 22) + "...",
					file_name: fileName.slice(0, 22) + "...",
					show_legends: this.request.body.show_legends,
					show_values: this.request.body.show_values,
				},
			]
		};

		if (config.has("allspark_python_base_api")) {

			const data = await download.jsonRequest(requestObj, config.get("allspark_python_base_api") + "xlsx/get");

			this.response.sendFile(data.body.response);
			throw({"pass": true})
		}
	}
}

class executingReports extends API {

	async executingReports() {

		const result = [];
		const superadmin = this.user.privilege.has("superadmin");
		const admin = this.user.privilege.has("admin");

		for (const [_, value] of global.executingReports.entries()) {

			let obj = {};

			if (!(superadmin || admin) && value.get("user_id") !== this.user.user_id) {

				continue;
			}

			if (!superadmin && admin && value.get("account_id") !== this.account.account_id) {

				continue;
			}

			for (const [k, v] of value.entries()) {

				if (k === "execute") {

					continue;
				}

				obj[k] = v;
			}

			result.push(obj)
		}

		return result;
	}
}


exports.query = query;
exports.report = report;
exports.ReportEngine = ReportEngine;
exports.Postgres = Postgres;
exports.APIRequest = APIRequest;
exports.download = download;
exports.executingReports = executingReports;