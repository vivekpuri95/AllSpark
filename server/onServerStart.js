const API = require('./utils/api');
const mysql = require('./utils/mysql').MySQL;
const bigquery = require('./www/bigquery').setup;


async function loadAccounts() {

    const accountList = await mysql.query('select * from tb_accounts where status = 1');
    const accountObj = {};

    accountList.map(x => accountObj[x.url] = x);

    global.account = accountObj;
}

async function loadBigquery() {
    // await bigquery();
}

exports.loadAccounts = loadAccounts;
exports.loadBigquery = loadBigquery;
