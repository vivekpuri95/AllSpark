const API = require('../../utils/api');
const fetch = require('node-fetch');
const config = require('config');
const constants = require('../../utils/constants');
const fs = require('fs');

class GoogleAdwords extends API {

	async getData({startDate, endDate, report, columns, connection_id, developer_token, client_id} = {}) {

		const [oAuthProvider] = await this.mysql.query(
			`SELECT
				c.id connection_id,
				c.refresh_token,
				p.*
			FROM
				tb_oauth_connections c
			JOIN
				tb_oauth_providers p USING (provider_id)
			WHERE
				c.id = ? 
				AND c.status = 1`,
			[connection_id]
		);

		this.assert(oAuthProvider, 'Invalid connection id');

		let credentails = fs.readFileSync('server/www/oauth/cred.yaml', 'utf8');

		const
			parameters = new URLSearchParams(),
			options = {
				method: 'POST',
				body: parameters,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			};

		credentails = credentails
			.replace('DEVELOPER_TOKEN', developer_token)
			.replace('CLIENT_CUSTOMER_ID', client_id)
			.replace('CLIENT_ID', oAuthProvider.client_id)
			.replace('CLIENT_SECRET', oAuthProvider.client_secret)
			.replace('REFRESH_TOKEN', oAuthProvider.refresh_token);

		parameters.set('report', report);
		parameters.set('startDate', startDate.replace(/-/g, ''));
		parameters.set('endDate', endDate.replace(/-/g, ''));
		parameters.set('credentials', credentails);

		for(const column of columns) {

			parameters.append('columns', column)
		}

		let adwordsData = await fetch(config.get("allspark_python_base_api") + "adwords/data", options);

        adwordsData = await adwordsData.json();

        adwordsData = adwordsData.response;

        const campaigns = [], labels = [], clicks = [], camp_labels = [];

        for(const row of adwordsData) {

    		campaigns.push([row['Campaign ID'], row['Campaign'], row['Campaign state'], row['Day'], client_id, 0]);
            clicks.push([client_id, row['Campaign ID'], row['Day'], row['Clicks'], row['Impressions'], row['Cost'], row['All conv.']]);

            try {

            	row['Labels'] = JSON.parse(row['Labels']);
			}
			catch (e) {

                row['Labels'] = []
            }

            try {

                row['Label IDs'] = JSON.parse(row['Label IDs']);
            }
            catch (e) {

                row['Label IDs'] = []
            }

            if(row['Label IDs']) {

                for(const [i, v] of row['Label IDs'].entries()) {

                	labels.push([v, row['Labels'] ? row['Labels'][i] : null]);

                	camp_labels.push([row['Campaign ID'], v]);
                }
            }
        }

        if(!this.account.settings.has("load_saved_connection")) {

            return {
                status: true,
                data: "save connection missing"
            }
        }
        else {

            const
                database = await this.initializeDb(),
                queries = [
                    `insert into ??.tb_adwords_campaigns
                        (campaign_id, campaign_name, campaign_status, campaign_date, client_id, category_id) values ? 
                    ON DUPLICATE KEY UPDATE 
                        campaign_name = VALUES(campaign_name), 
                        campaign_status = VALUES(campaign_status), 
                        campaign_date = VALUES(campaign_date), 
                        client_id = VALUES(client_id), 
                        category_id = VALUES(category_id)
                    `,
                    `insert into ??.tb_adwords_labels
                        (label_id, label_name) values ?
                    ON DUPLICATE KEY UPDATE
                        label_name = VALUES(label_name)
                    `,
                    `insert into ??.tb_adwords_campaigns_performance
                    	(client_id, campaign_id, campaign_date, clicks, impressions, cost, conversions) values ?
                    `,
                    `insert into ??.tb_adwords_campaigns_labels(campaign_id,label_id) values ?`
                ];
            const data = [
                campaigns,
                labels,
                clicks,
                camp_labels
            ];

            const insertResponse = await Promise.all(queries.map((q, i) => this.mysql.query(q, [database, data[i]])));

            return {
                status: true,
                data: {
                    message: `Data saved in the table ${constants.saveQueryResultTable}`,
                    response: insertResponse
                }
            }
        }
	}

    async initializeDb() {

        let
            conn = this.account.settings.get("load_saved_connection"),
            savedDatabase = this.account.settings.get("load_saved_database"),
            db = await this.mysql.query("show databases", [], conn);

        savedDatabase = savedDatabase || constants.saveQueryResultDb;

        [db] = db.filter(x => x === (savedDatabase));

        if (!db) {

            await this.mysql.query(
                `CREATE DATABASE IF NOT EXISTS ${savedDatabase}`,
                [],
                conn
            );
        }

        const tables = await Promise.all([
            this.mysql.query(`
				CREATE TABLE IF NOT EXISTS tb_adwords_campaigns (
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
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`,
				[savedDatabase],
				conn,
            ),
			this.mysql.query(
				`CREATE TABLE IF NOT EXISTS ??.tb_adwords_labels (
					label_id int(11) NOT NULL,
					label_name varchar(100) DEFAULT '',
					created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (label_id)
				) ENGINE=InnoDB DEFAULT CHARSET=latin1;`,
				[savedDatabase],
                conn,
			),
			this.mysql.query(
				`CREATE TABLE IF NOT EXISTS tb_adwords_campaigns_performance (
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
                ) ENGINE=InnoDB AUTO_INCREMENT=332527 DEFAULT CHARSET=latin1;`,
				[savedDatabase],
				conn
			),
			this.mysql.query(
				`CREATE TABLE IF NOT EXISTS tb_adwords_campaigns_labels (
					campaign_id int(11) NOT NULL,
					label_id int(11) NOT NULL,
					created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					is_enabled int(11) NOT NULL DEFAULT '0',
					KEY label_id (label_id),
					KEY campaign_id (campaign_id)
				) ENGINE=InnoDB DEFAULT CHARSET=latin1;`,
				[savedDatabase],
				conn
			)
		]);

        if (!this.account.settings.get("load_saved_database")) {

            await this.mysql.query(
                `update tb_credentials set db = ? where id = ?`,
                [savedDatabase, conn],
                "write"
            );
        }

       return savedDatabase;
	}
}

exports.getData = GoogleAdwords;