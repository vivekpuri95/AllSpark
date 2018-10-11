const fetch = require('node-fetch');
const config = require('config');
const Job = require('./jobs/job');
const Task = require('./jobs/task');
const Contact = require('./jobs/contact');
const mysql = require('./mysql').MySQL;
const GoogleAPIs = require('./oauthConnections').GoogleAPIs;
const constants = require('./constants');

class GoogleAnalytics extends Job {

    constructor(job) {

        super(job, [
            {
                name: 'Fetch GA',
                timeout: 30,
                sequence: 1,
            },
            {
                name: 'Process GA',
                timeout: 30,
                sequence: 2,
                inherit_data: 1
            },
            {
                name: 'Save GA',
                timeout: 30,
                sequence: 3,
                inherit_data: 1
            },
        ]);
    }

    async fetchInfo() {

        if (this.job == parseInt(this.job)) {

            const [job] = await mysql.query(
                "select * from tb_jobs where job_id = ? and is_enabled = 1 and is_deleted = 0",
                [this.job]
            );

            this.job = job;
        }

        if (!this.job || this.tasks) {

            this.error = "job or job tasks not found";
        }

        this.contact = new Contact(this.job.job_id);

        const [account] = global.accounts.filter(x => x.account_id == this.job.account_id);

        this.tasks = [
            new FetchGA({
                job_id: this.job.job_id,
                name: 'Fetch GA',
                timeout: 30,
                sequence: 1,
                config: this.job.config,
            }),
            new ProcessGA({
                job_id: this.job.job_id,
                name: 'Process GA',
                timeout: 30,
                sequence: 2,
                config: this.job.config,
                inherit_data: 1,
            }),
            new SaveGA({
                job_id: this.job.job_id,
                name: 'Save GA',
                timeout: 30,
                sequence: 3,
                config: this.job.config,
                inherit_data: 1,
            })
        ];

        this.tasks.forEach(x => x.account = account);

        this.error = 0;
    }
}

class FetchGA extends Task {

    constructor(task) {

        super(task);

        try {

            this.task.config = JSON.parse(this.task.config);
        }
        catch (e) {

            this.task.config = {};
        }

    }

    async fetchInfo() {

        const test = async () => {

            const [oAuthProvider] = await mysql.query(
                    `SELECT
				c.id connection_id,
				c.access_token,
				c.refresh_token,
				p.*
			FROM
				tb_oauth_connections c
			JOIN
				tb_oauth_providers p USING (provider_id)
			WHERE
				c.id = ? 
				AND c.status = 1`,
                [this.task.config.id]
            );

            if (!oAuthProvider || oAuthProvider.type != 'Google') {

                return {
                    status: false,
                    data: 'Invalid provider Id or provider type'
                };
            }

            const parameters = {};

            for(const param of this.externalParams) {

                parameters[param.placeholder] = param.value;
            }

            const
                connection = new GoogleAPIs(this, oAuthProvider),
                access_token = await connection.test(),
                gaMetrics = [],
                gaDimensions = [],
                startDate = parameters.start_date || new Date().toISOString().substr(0, 10),
                endDate = parameters.end_date || new Date().toISOString().substr(0, 10);

            for (const metric of typeof this.task.config.metrics == 'string' ? [this.task.config.metrics] : this.task.config.metrics) {

                gaMetrics.push({
                    "expression": metric
                });
            }

            for (const dimension of typeof this.task.config.dimensions == 'string' ? [this.task.config.dimensions] : this.task.config.dimensions) {

                gaDimensions.push({
                    "name": dimension
                });
            }

            const
                options = {
                    method: 'POST',
                    body: JSON.stringify({
                        'reportRequests': [
                            {
                                'viewId': this.task.config.viewId,
                                'dateRanges': [{'startDate': startDate, 'endDate': endDate}],
                                'metrics': gaMetrics,
                                "dimensions": gaDimensions
                            }
                        ]
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access_token}`
                    },
                };

            let response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', options);

            response = await response.json();

            return {
                status: true,
                data: response.reports[0]
            };
        }

        this.taskRequest = () => test();

    }
}

class ProcessGA extends Task {

    constructor(task) {

        super(task);

        try {

            this.task.config = JSON.parse(this.task.config);
        }
        catch (e) {

            this.task.config = {};
        }

    }

    async fetchInfo() {

        const test = async () => {

            const processedData = [];

            let response;

            try {

                [response] = this.externalParams.filter(x => x.placeholder == 'data');

                response = JSON.parse(response.value).message.data;
            }
            catch (e) {

                response = []
            }

            let query_columns = {};

            for(const dimension of response.columnHeader.dimensions) {

                query_columns[`\`${dimension}\``] = 'varchar(500) DEFAULT \'\'';
            }

            for(const metric of response.columnHeader.metricHeader.metricHeaderEntries) {

                query_columns[`\`${metric.name}\``] = metric.type == 'INTEGER' ? 'int(11) DEFAULT NULL' : 'varchar(500) DEFAULT \'\'';
            }

            for (const row of response.data.rows) {

                const rowObj = [];

                for (const [i, dimension] of row.dimensions.entries()) {

                    rowObj.push(dimension);
                }

                for (const [i, metric] of row.metrics[0].values.entries()) {

                    rowObj.push(metric);
                }

                processedData.push(rowObj);
            }

            return {
                status: true,
                data: {
                    processedData,
                    query_columns
                }
            }

        }

        this.taskRequest = () => test();

    }

}

class SaveGA extends Task {

    constructor(task) {

        super(task);

        try {

            this.task.config = JSON.parse(this.task.config);
        }
        catch (e) {

            this.task.config = {};
        }

    }

    async fetchInfo() {

        const test = async () => {

            if (!this.account.settings.has("load_saved_connection")) {

                return {
                    status: false,
                    data: "save connection missing"
                }
            }

            let response;

            try {

                [response] = this.externalParams.filter(x => x.placeholder == 'data');

                response = JSON.parse(response.value).message.data;
            }
            catch (e) {

                response = []
            }

            let
                conn = this.account.settings.get("load_saved_connection"),
                savedDatabase = this.account.settings.get("load_saved_database"),
                db = await mysql.query("show databases", [], conn);

            savedDatabase = savedDatabase || constants.saveQueryResultDb;

            [db] = db.filter(x => x === savedDatabase);

            if (!db) {

                await mysql.query(
                    `CREATE DATABASE IF NOT EXISTS ${savedDatabase}`,
                    [],
                    conn
                );
            }

            let table_query = '';

            for(const key in response.query_columns) {

                table_query = table_query.concat(`${key} ${response.query_columns[key]},`);
            }

            const query = `
                CREATE TABLE IF NOT EXISTS ??.?? (
                    id int(11) unsigned NOT NULL AUTO_INCREMENT,
                    ${table_query}
                    \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                    \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (\`id\`),
                    KEY \`created_at\` (\`created_at\`)
				) ENGINE=InnoDB DEFAULT CHARSET=latin1
            `;

            constants.saveQueryResultTable = constants.saveQueryResultTable.concat(`_job_${this.task.job_id}`);

            await mysql.query(
                query,

                [savedDatabase, constants.saveQueryResultTable],
                conn,
            );

            const insertResponse = await mysql.query(
                `INSERT INTO ??.?? (${Object.keys(response.query_columns)}) VALUES ?`,
                [savedDatabase, constants.saveQueryResultTable, response.processedData],
                this.account.settings.get("load_saved_connection")
            );

            return {
                status: true,
                data: {
                    message: `Data saved in the table ${constants.saveQueryResultTable}`,
                    response: insertResponse
                }
            }


        }

        this.taskRequest = () => test();
    }

}

module.exports = GoogleAnalytics;