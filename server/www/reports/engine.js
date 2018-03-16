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

        if(!this.queryId) {
            return {
                status: false,
                message: "report Not found"
            }
        }

        const fetchedData = await this.fetch();

        if(fetchedData.error) {

            return fetchedData;
        }


        const authentication = auth.report(this.query, this.user);

        if(authentication.error) {

            return authentication;
        }

        let result = null;

        if(this.query.source.toLowerCase() === 'query') {

            result = await new query(this.query, this.filters, this.request).execute();
        }

        else if (this.query.source.toLowerCase() === 'api') {

            result = await new api(this.query, this.filters, this.request).execute();
        }

        else if (this.query.source.toLowerCase() === 'big_query') {

            //return await new bigquery().execute();
        }

        else {

            return {
                status: false,
                message: "unknown source",
            }
        }

        return {
            status: result ? true : false,
            data: result,
        }
    }

    async fetch() {

        let reportDetails  = [
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

            this.mysql.query(`select * from tb_filters where query_id = ?`, [this.queryId])
        ];

        reportDetails = await Promise.all(reportDetails);
        for(const f of reportDetails[1]) {

            f.value = this.request.body[f.placeholder] || f.default_value;
            //
            // if(f.placeholder.slice(-2) === '[]') {
            //     f.is_list = true;
            //     f.value = f.value.split(',').map(x => x.trim());
            // }

        }

        this.query = reportDetails[0][0];
        this.filters = reportDetails[1] || [];


        if(!reportDetails[0][0]) {
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

        // console.log(this.filters)
        for(const filter of this.filters) {

            if(isNaN(parseFloat(filter.offset))) {

                continue;
            }

            if(types[filter.type] == 'date') {

                filter.default_value = new Date(Date.now() + filter.offset * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
                filter.value = this.request.body[filter.placeholder] || filter.default_value;

                if(filter.value === new Date().toISOString().slice(0,10)) {
                    this.has_today = true;

                }
            }

            if(types[filter.type] == 'month') {
                const date = new Date();
                filter.default_value = new Date(Date.UTC(date.getFullYear(), date.getMonth() + filter.offset, 1)).toISOString().substring(0, 7);
                filter.value = this.request.body[filter.placeholder] || filter.default_value;

                if(filter.value === new Date().toISOString().slice(0,7)) {
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

        if (!this.request.body.download && this.result && this.query.source.toLowerCase() === 'query') {

            this.result = this.result.slice(0, 10000);
        }
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

        for(const filter of this.filters) {

            this.query.query = this.query.query.replace(new RegExp(`{{${filter.placeholder}}}`, 'g'), `'${filter.value}'`);
        }
        this.hash = crypto.createHash('md5').update(this.query.query).digest('hex');
        this.createRedisKey();
    }

    async fetchAndStore () {

        const redisData = await commonFun.redisGet(this.redisKey);

        if(this.query.is_redis && redisData && !this.has_today) {

            try {

                this.result = JSON.parse(redisData);
                return;
            }

            catch(e) {

                throw("redis data is not json, redisKey: " + this.redisKey);
            }
        }

        this.result = await this.mysql.query(this.query.query, [], this.query.connection_name);

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

        for(const filter of this.filters) {

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

        if(this.har.method == 'GET') {

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

        if(!this.filters.filter(f => f.placeholder == 'token').length) {

            this.har.queryString.push({
                name: 'token',
                value: this.request.body.token,
            });
        }
    }

    async fetchAndStore() {

        const redisData = await commonFun.redisGet(this.redisKey);
        if(this.query.is_redis && redisData && !this.has_today) {

            try {

                this.result = JSON.parse(redisData);
                return;
            }

            catch(e) {

                throw("redis data is not json, redisKey: " + this.redisKey);
            }
        }

        const result = await requestPromise({
            har: this.har,
            gzip: true,
        });

        if(commonFun.isJson(result.body)) {

            this.result = JSON.parse(result.body)
        }

        else {

            this.result = JSON.parse(result.body)
        }

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
