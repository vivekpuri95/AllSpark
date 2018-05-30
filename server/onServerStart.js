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
			AND s.status = 1
			AND s.owner = 'account'
			AND s.profile = 'main' 
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

				const e = new Error("Insufficient feature privileges: " + arg);
				e.status = 400;
				throw e;
			}
		}

		accountObj[account.url].features.set(account.feature_slug + '-' + account.feature_type, {

			feature_id: account.feature_id,
			name: account.feature_name,
			slug: account.feature_slug,
			type: account.feature_type
		});

		if(!account.settings)
			account.settings = [];

		try {
			account.settings = JSON.parse(account.settings);
		}
		catch(e) {
			account.settings = [];
		}

		if(!accountObj[account.url].settings) {

			accountObj[account.url].settings = new AccountProfileSettings();
		}

		for(const setting of account.settings) {

			accountObj[account.url].settings.set(setting.key, setting.value);
		}

	}

	global.account = accountObj;
}

async function loadBigquery() {

	await bigquery();
}

class AccountProfileSettings extends Map {

	constructor() {

		super();
	}
}

exports.loadAccounts = loadAccounts;
exports.loadBigquery = loadBigquery;
