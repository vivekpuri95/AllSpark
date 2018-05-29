const mysql = require('./utils/mysql').MySQL;
const bigquery = require('./utils/bigquery').setup;


async function loadAccounts() {

	const accountList = await mysql.query(`
		SELECT 
			a.account_id,
			a.name,
			a.url,
			a.icon,
			a.logo,
			a.auth_api,
			f.feature_id,
			f.name AS feature_name,
			f.slug AS feature_slug,
			f.type AS feature_type,
			s.profile,
			s.value as settings
		FROM 
			tb_accounts a
		LEFT JOIN
			tb_settings s
		ON
			a.account_id = s.account_id 
		LEFT JOIN
			tb_account_features af
		ON
			a.account_id = af.account_id
			AND af.status = 1
		LEFT JOIN
			tb_features f
		ON
			af.feature_id = f.feature_id
		WHERE
			a.status = 1
			AND s.status = 1
	`);

	const accountObj = {};

	for (const account of accountList) {

		if (!accountObj[account.url]) {
			accountObj[account.url] = {
				account_id: account.account_id,
				name: account.name,
				url: account.url,
				icon: account.icon,
				logo: account.logo,
				auth_api: account.auth_api
			};
		}

		if (!accountObj[account.url].features) {
			accountObj[account.url].features = new Map();

			accountObj[account.url].features.needs = function (arg) {
				if (this.has(arg))
					return 1;
				throw("This account lack this feature!");
			}
		}

		accountObj[account.url].features.set(account.feature_slug, {
			feature_id: account.feature_id,
			name: account.feature_name,
			slug: account.feature_slug,
			type: account.feature_type
		});

		if(!accountObj[account.url].settings) {

			accountObj[account.url].settings = new Map();
		}

		try {
			account.settings = JSON.parse(account.settings);
		}
		catch(e) {
			account.settings = {}
		}

		for(const setting in account.settings){

			accountObj[account.url].settings.set(setting, account.settings[setting]);
		}

	}

	global.account = accountObj;
}

async function loadBigquery() {

	await bigquery();
}

exports.loadAccounts = loadAccounts;
exports.loadBigquery = loadBigquery;
