const express = require('express');
const router = express.Router();

const api = require('../utils/api');
const account = require('../onServerStart');
const mysql = require("../utils/mysql");
const mssql = require("../utils/mssql");
const postgres = require("../utils/pgsql");
const mongo = require("../utils/mongo");
const oracle = require("../utils/oracle");
let syncServer = require("../utils/sync-server");
const config = require('config');

(async () => {

	syncServer = new syncServer();

	const existingAccounts = await mysql.MySQL.query(
		"SELECT * FROM information_schema.tables WHERE TABLE_NAME = 'tb_accounts' AND TABLE_SCHEMA = ?",
		[config.has('sql_db') && config.get('sql_db').read ? config.get('sql_db').read.database : '']
	);

	if(!existingAccounts.length) {

		return;
	}

	await account.loadAccounts();
	await account.loadBigquery();
	account.executingQueriesMap();
	await api.setup();
	await mysql.crateExternalPool();
	await mssql.crateExternalPool();
	await postgres.crateExternalPool();
	await mongo.crateExternalPool();
	await oracle.crateExternalPool();
})();


router.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	next();
});


/* GET home page. */
router.get('/', function (req, res, next) {
	res.render('index', {title: 'Exprexxo'});
});

router.get('/hello', function (req, res, next) {
	res.render('index', {title: 'hello'});
});


router.get('/v2/*', api.serve());
router.post('/v2/*', api.serve());


module.exports = router;
