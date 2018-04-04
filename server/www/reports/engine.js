const API = require("../../utils/api");
const commonFun = require('../../utils/commonFunctions');
const promisify = require('util').promisify;
const moment = require('moment');
//const BigQuery = require('../../www/bigQuery').BigQuery;
const crypto = require('crypto');
const request = require("request");
const auth = require('../../utils/auth');
const requestPromise = promisify(request);

class report extends API {

	async report() {

		this.queryId = this.request.body.query_id;

		if (!this.queryId)
			throw new API.Exception(404, 'Report not found! :(');

		const fetchedData = await this.fetch();

		this.assert(!fetchedData.error,);
		if (fetchedData.error) {

			return fetchedData;
		}

		const authentication = await auth.report(this.query, this.user);

		this.assert(!authentication.error, authentication.message, 401);

		if (this.query.source.toLowerCase() === 'query') {

			return await new query(this.query, this.filters, this.request).execute();
		}

		else if (this.query.source.toLowerCase() === 'api') {

			return await new api(this.query, this.filters, this.request).execute();
		}

		else if (this.query.source.toLowerCase() === 'big_query') {

			return await new bigquery().execute();
		}

		throw new API.Exception(400, 'Unknown Data Source! :(');
	}

	async fetch() {

		let reportDetails = [
			this.mysql.query(`SELECT
              q.*,
              IF(user_id IS NULL, 0, 1) AS flag
            FROM
                tb_query q
            LEFT JOIN
                 tb_user_query uq ON
                 uq.query_id = q.query_id
                 AND user_id = ?
            WHERE
                q.query_id = ?
                AND is_enabled = 1
                AND is_deleted = 0
                AND account_id = ?`, [this.user.user_id, this.queryId, this.account.account_id]),

			this.mysql.query(`select * from tb_query_filters where query_id = ?`, [this.queryId])
		];

		reportDetails = await Promise.all(reportDetails);
		for (const f of reportDetails[1]) {

			f.value = this.request.body[f.placeholder] || f.default_value;

			if (f.multiple) {

				f.value = f.value.split(',');
			}
		}

		this.query = reportDetails[0][0];
		this.filters = reportDetails[1] || [];

		if (!reportDetails[0][0]) {
			return {
				error: true,
				message: "no report found"
			}
		}

		return {
			error: false,
		}

	}

	applyFiltersCommon() {

		const types = [
			'string',
			'number',
			'date',
			'month',
		];

		for (const filter of this.filters) {

			if (isNaN(parseFloat(filter.offset))) {

				continue;
			}

			if (types[filter.type] == 'date') {

				filter.default_value = new Date(Date.now() + filter.offset * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
				filter.value = this.request.body[filter.placeholder] || filter.default_value;

				if (filter.value === new Date().toISOString().slice(0, 10)) {
					this.has_today = true;

				}
			}

			if (types[filter.type] == 'month') {

				const date = new Date();

				filter.default_value = new Date(Date.UTC(date.getFullYear(), date.getMonth() + filter.offset, 1)).toISOString().substring(0, 7);
				filter.value = this.request.body[filter.placeholder] || filter.default_value;

				if (filter.value === new Date().toISOString().slice(0, 7)) {

					this.has_today = true;
				}
			}
		}
	}

	createRedisKey() {
		this.redisKey = `Reporting#Engine#query_id:${this.query.query_id}#md5:${this.hash}`;
	}

	async execute() {

		await this.applyFiltersCommon();

		this.applyFilters();

		await this.fetchAndStore();

		if (!this.request.body.download && this.result && this.query.source.toLowerCase() === 'query')
			this.result.data = this.result.data.slice(0, 10000);

		return this.result;
	}
}

class query extends report {

	constructor(query, filters, request) {
		super();
		this.query = query;
		this.filters = filters;
		this.request = request
	}

	applyFilters() {

		this.query.query = this.query.query
			.replace(/--.*(\n|$)/g, "")
			.replace(/\s+/g, ' ');

		this.filterIndices = {};

		for (const filter of this.filters) {

			this.filterIndices[filter.placeholder] = {

				indices: (commonFun.getIndicesOf(`{{${filter.placeholder}}}`, this.query.query)),
				value: filter.value,
			};

			this.query.query = this.query.query.replace(new RegExp(`{{${filter.placeholder}}}`, 'g'), "?");

		}

		this.hash = crypto.createHash('md5').update(this.query.query + JSON.stringify(this.filterIndices)).digest('hex');
		this.createRedisKey();
	}

	async makeQueryParameters() {

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

	async fetchAndStore() {

		const redisData = await commonFun.redisGet(this.redisKey);

		if (this.query.is_redis && redisData && !this.has_today) {

			try {

				this.result = JSON.parse(redisData);
				return;
			}

			catch (e) {
				throw new API.Exception(500, "Invalid Redis Data! :(");
			}
		}


		const data = await this.mysql.query(this.query.query, await this.makeQueryParameters(), this.query.connection_name);

		this.result = {
			data,
			query: data.instance.formatted_sql,
		};

		await commonFun.redisStore(this.redisKey, JSON.stringify(this.result), parseInt(moment().endOf('day').format('X')));
	}
}


class api extends report {

	constructor(query, filters, request) {

		super();
		this.query = query;
		this.filters = filters;
		this.request = request
	}

	applyFilters() {

		const parameters = [];

		for (const filter of this.filters) {

			parameters.push({
				name: filter.placeholder,
				value: filter.value
			});
		}

		this.har = JSON.parse(this.query.url_options);
		this.har.queryString = [];
		this.har.headers = [
			{
				name: 'content-type',
				value: 'application/x-www-form-urlencoded'
			}
		];
		this.har.url = this.query.url;

		if (this.har.method == 'GET') {

			this.har.queryString = parameters;
		}

		else {

			this.har.postData = {
				mimeType: 'application/x-www-form-urlencoded',
				params: parameters,
			};
		}

		this.hash = crypto.createHash('md5').update(JSON.stringify(this.har)).digest('hex');
		this.createRedisKey();

		if (!this.filters.filter(f => f.placeholder == 'token').length) {

			this.har.queryString.push({
				name: 'token',
				value: this.request.body.token,
			});
		}
	}

	async fetchAndStore() {

		const redisData = await commonFun.redisGet(this.redisKey);

		if (this.query.is_redis && redisData && !this.has_today) {

			try {

				this.result = JSON.parse(redisData);
				return;
			}

			catch (e) {
				throw new API.Exception(500, "Invalid Redis Data! :(");
			}
		}

		const result = await requestPromise({
			har: this.har,
			gzip: true,
		});

		this.result = {
			data: JSON.parse(result.body),
			query: JSON.stringify(this.har, 0, 1),
		};

		await commonFun.redisStore(this.redisKey, JSON.stringify(this.result), parseInt(moment().endOf('day').format('X')));
	}
}

// class bigquery extends query {
//
//     constructor(query, filters, request) {
//
//         super();
//         this.query = query;
//         this.filters = filters;
//         this.request = request
//     }
//     async fetchAndStore () {
//
//         const redisData = await commonFun.redisGet(this.redisKey);
//         if(this.query.is_redis && redisData && !this.has_today) {
//
//             try {
//
//                 this.result = JSON.parse(redisData);
//                 return;
//             }
//
//             catch(e) {
//
//                 throw("redis data is not json, redisKey: " + this.redisKey);
//             }
//         }
//
//         const connectionData =(await this.mysql.query('select * from tb_credentials where id = ?', [this.query.connection_name]))[0];
//
//         if(!connectionData) {
//             throw {
//                 status: false,
//                 message: "",
//             }
//         }
//
//         const fileFath = `${config.get('bigquery_files_destination')}/${this.account.name}/${this.query.connection_name}`;
//
//         const bq = new BigQuery
//         this.result = BigQuery.call(this.redisKey, this.query.query);
//
//     }
// }

exports.report = report;
