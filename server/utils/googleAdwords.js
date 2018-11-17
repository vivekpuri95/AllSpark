const fetch = require('node-fetch');
const config = require('config');
const constants = require('./constants');
const fs = require('fs');
const Job = require('./jobs/job');
const Task = require('./jobs/task');
const Contact = require('./jobs/contact');
const mysql = require('./mysql').MySQL;
const URLSearchParams = require('url').URLSearchParams;
const OauthProvider = require('../www/oauth/connections').get;
const commonFunc = require('./commonFunctions');

class GoogleAdwords extends Job {

	constructor(job) {

		super(job, [
			{
				name: 'Authenticate Saved Connection',
				timeout: 30,
				sequence: 1,
				fatal: 1
			},
			{
				name: 'Fetch Adwords',
				timeout: 30,
				sequence: 2,
				fatal: 1
			},
			{
				name: 'Process Adwords',
				timeout: 30,
				sequence: 3,
				inherit_data: 1,
				fatal: 1
			},
			{
				name: 'Save Adwords',
				timeout: 30,
				sequence: 4,
				inherit_data: 1,
				fatal: 1
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

		const taskClasses = [Authenticate, FetchAdwords, ProcessAdwords, SaveAdwords];

		this.tasks = this.tasks.map((x, i) => {
			return new taskClasses[i]({...x, account, config: this.job.config, job_id: this.job.job_id});
		});

		this.error = 0;
	}

}

class Authenticate extends Task {

	async fetchInfo() {

		this.taskRequest = () => (async () => {

			if (!this.task.account.settings.get("load_saved_connection")) {

				return {
					status: false,
					message: "save connection missing"
				};
			}

			return {
				status: true
			};

		})();
	}
}

class FetchAdwords extends Task {

	constructor(task) {

		super(task);

		this.task.config = commonFunc.isJson(this.task.config) ? JSON.parse(this.task.config) : {};
	}

	async fetchInfo() {

		this.taskRequest = () => (async () => {

			let provider = new OauthProvider();

			[provider] = await provider.get({connection_id: this.task.config.connection_id});

			if(!provider || provider.type != 'Google') {

				return {
					status: false,
					data: 'Invalid provider Id or provider type'
				}
			}

			let credentails = fs.readFileSync('server/www/oauth/cred.yaml', 'utf8');

			const extParameters = {};

			for(const param of this.externalParams) {

				extParameters[param.placeholder] = param.value;
			}

			const
				parameters = new URLSearchParams(),
				options = {
					method: 'POST',
					body: parameters,
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				},
				startDate = extParameters.start_date ? extParameters.start_date : new Date().toISOString().substr(0, 10),
				endDate = extParameters.end_date ? extParameters.end_date : new Date().toISOString().substr(0, 10);

			credentails = credentails
				.replace('DEVELOPER_TOKEN', this.task.config.developer_token)
				.replace('CLIENT_CUSTOMER_ID', this.task.config.client_id)
				.replace('CLIENT_ID', provider.client_id)
				.replace('CLIENT_SECRET', provider.client_secret)
				.replace('REFRESH_TOKEN', provider.refresh_token);

			parameters.set('report', this.task.config.report);
			parameters.set('startDate', startDate.replace(/-/g, ''));
			parameters.set('endDate', endDate.replace(/-/g, ''));
			parameters.set('credentials', credentails);
			parameters.set('provider_id', provider.provider_id);

			for(const column of this.task.config.columns) {

				parameters.append('columns', column)
			}

			let adwordsData = await fetch(config.get("allspark_python_base_api") + "adwords/data", options);

			adwordsData = await adwordsData.json();

			this.assert(adwordsData.status, 'Unable to fetch adwords data');

			adwordsData = adwordsData.response;

			return {
				status: true,
				data: adwordsData
			};
		})();
	}
}

class ProcessAdwords extends Task {

	constructor(task) {

		super(task);

		this.task.config = commonFunc.isJson(this.task.config) ? JSON.parse(this.task.config) : {};
	}

	async fetchInfo() {

		this.taskRequest = () => (async () => {

			const
				campaigns = [],
				labels = [],
				clicks = [],
				camp_labels = []
			;

			let [data] = this.externalParams.filter(x => x.placeholder == 'data');

			data = data.value && commonFunc.isJson(data.value) ? JSON.parse(data.value).message.data : [];

			for(const row of data) {

				campaigns.push([
					row['Campaign ID'],
					row['Campaign'],
					row['Campaign state'],
					row['Day'],
					this.task.config.client_id,
					0
				]);

				clicks.push([
					this.task.config.client_id,
					row['Campaign ID'],
					row['Day'],
					row['Clicks'],
					row['Impressions'],
					row['Cost'],
					row['All conv.']
				]);

				row['Labels'] = commonFunc.isJson(row['Labels']) ? JSON.parse(row['Labels']) : [];
				row['Label IDs'] = commonFunc.isJson(row['Label IDs']) ? JSON.parse(row['Label IDs']) : [];

				if(row['Label IDs']) {

					for(const [i, v] of row['Label IDs'].entries()) {

						labels.push([v, row['Labels'] ? row['Labels'][i] : null]);

						camp_labels.push([row['Campaign ID'], v]);
					}
				}
			}

			return {
				status: true,
				data: {
					campaigns,labels, clicks, camp_labels
				}
			};

		})();
	}
}

class SaveAdwords extends Task {

	async fetchInfo() {

		this.taskRequest = () => (async () => {

			let
				[data] = this.externalParams.filter(x => x.placeholder == 'data'),
				conn = this.task.account.settings.get("load_saved_connection"),
				savedDatabase = this.task.account.settings.get("load_saved_database");

            data = data.value && commonFunc.isJson(data.value) ? JSON.parse(data.value).message.data : {};

			savedDatabase = savedDatabase || constants.saveQueryResultDb;

			let [db, databaseTables] = await Promise.all([
				mysql.query(
					"show databases",
					[],
					conn
				),
				mysql.query(
					"SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
					[savedDatabase],
					conn
				)
			]);

			[db] = db.filter(x => x.Database === savedDatabase);
			databaseTables = databaseTables.map(x => x.table_name);

			if (!db) {

				await mysql.query(
					`CREATE DATABASE IF NOT EXISTS ${savedDatabase}`,
					[],
					conn
				);
			}

			const
				tableQuery = [
					{
						name: "tb_adwords_campaigns",
						query: `
							CREATE TABLE IF NOT EXISTS ??.tb_adwords_campaigns (
								campaign_id int(11) NOT NULL,
								campaign_name varchar(1000) NOT NULL,
								campaign_status varchar(10) NOT NULL,
								campaign_date date NOT NULL,
								client_id varchar(50) NOT NULL,
								category_id int(11) NOT NULL,
								created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
								updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
							PRIMARY KEY (campaign_id),
							KEY campaign_name (campaign_name)
							) ENGINE=InnoDB DEFAULT CHARSET=latin1
						`
					},
					{
						name: "tb_adwords_labels",
						query: `
							CREATE TABLE IF NOT EXISTS ??.tb_adwords_labels (
								label_id bigint(20) NOT NULL,
								label_name varchar(100) DEFAULT '',
								created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
								updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
								PRIMARY KEY (label_id)
							) ENGINE=InnoDB DEFAULT CHARSET=latin1
						`
					},
					{
						name: "tb_adwords_campaigns_performance",
						query: `
							CREATE TABLE IF NOT EXISTS ??.tb_adwords_campaigns_performance (
								id int(11) unsigned NOT NULL AUTO_INCREMENT,
								client_id varchar(50) DEFAULT NULL,
								campaign_id int(11) NOT NULL,
								campaign_date date NOT NULL,
								clicks int(11) NOT NULL,
								impressions int(11) NOT NULL,
								cost bigint(20) NOT NULL,
								conversions float NOT NULL,
								created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
								updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
							PRIMARY KEY (id),
							UNIQUE KEY date_2 (campaign_id, campaign_date, client_id),
							KEY campaign_id (campaign_id),
							KEY created_at (created_at),
							KEY campaign_date (campaign_date)
							) ENGINE=InnoDB DEFAULT CHARSET=latin1
						`
					},
					{
						name: "tb_adwords_campaigns_labels",
						query: `
							CREATE TABLE IF NOT EXISTS ??.tb_adwords_campaigns_labels (
								campaign_id int(11) NOT NULL,
								label_id bigint(20) NOT NULL,
								created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
								updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
								is_enabled int(11) NOT NULL DEFAULT '0',
								KEY label_id (label_id),
								KEY campaign_id (campaign_id)
							) ENGINE=InnoDB DEFAULT CHARSET=latin1
						`
					}
				],
				requiredTables = [];

			for(const table of tableQuery) {

				if(!databaseTables.includes(table.name)) {

					requiredTables.push(table);
				}
			}

			const
				tables = await Promise.all(
					requiredTables.map(x => mysql.query(x.query, [savedDatabase], conn))
				),
				queries = [
					`insert ignore into ??.tb_adwords_campaigns
						(campaign_id, campaign_name, campaign_status, campaign_date, client_id, category_id) values ? 
					ON DUPLICATE KEY UPDATE 
						campaign_name = VALUES(campaign_name), 
						campaign_status = VALUES(campaign_status), 
						campaign_date = VALUES(campaign_date), 
						client_id = VALUES(client_id), 
						category_id = VALUES(category_id)
					`,
					`insert ignore into ??.tb_adwords_labels
						(label_id, label_name) values ?
					ON DUPLICATE KEY UPDATE
						label_name = VALUES(label_name)
					`,
					`insert ignore into ??.tb_adwords_campaigns_performance
						(client_id, campaign_id, campaign_date, clicks, impressions, cost, conversions) values ?
					`,
					`insert into ??.tb_adwords_campaigns_labels(campaign_id,label_id) values ?`
				],
				query_data = [
					data.campaigns,
					data.labels,
					data.clicks,
					data.camp_labels
				];

			const insertResponse = await Promise.all(queries.map((q, i) => mysql.query(q, [savedDatabase, query_data[i]])));

			return {
				status:true,
				data: insertResponse
			};

		})();

	}
}

module.exports = GoogleAdwords;