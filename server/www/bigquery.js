// const gcloud = require('google-cloud');
// const redis = require('./redis');
// const moment = require('moment');
// const mysql = require('./mysql').MySQL;
// const fs = require('fs');
// const commonFun = require('./commonFunctions');

// const gauth = function (project, file) {

//     console.log('Initiating authentication with gcloud..');

//     return gcloud.bigquery({
//         projectId: project,
//         keyFilename: file
//     });

// };

// class BigQuery {

//     static call(queryName, query, callback) {

//         return new Promise(function (resolve, reject) {

//             let queryHash = require('crypto').createHash('md5').update(query).digest("hex"),
//                 uniKey = `bqFresh#${queryName}#${queryHash}`,
//                 getRedis = Promise.resolve();

//             if(queryName)
//                 getRedis = BigQuery.redisGet(uniKey);

//             getRedis.then(function(bqData) {

//                 if(bqData && commonFun.isJson(bqData))
//                     return BigQuery.resolve(JSON.parse(bqData), callback, resolve);

//                 gauth().query(query, function(err, bqData) {

//                     if(err)
//                         return BigQuery.reject(["bqcallnocache", err, query], callback, reject);

//                     BigQuery.resolve(bqData, callback, resolve);

//                     if(queryName)
//                         BigQuery.redisSet(uniKey, JSON.stringify(bqData));
//                 });
//             });
//         });
//     }

//     static resolve(response, callback, resolve) {

//         if (callback)
//             callback(null, response);

//         resolve(response)
//     }

//     static reject(err, callback, reject) {

//         if (callback)
//             callback(err);

//         reject(err)
//     }

//     static redisGet(queryName) {
//         return new Promise((resolve, reject) => {

//             redis.get(queryName, function(err, result) {

//                 if(err)
//                     return reject();

//                 resolve(result);
//             });
//         });
//     }

//     static redisSet(queryName, value) {

//         const expire_time = parseInt(moment().endOf('day').format('X'));

//         return new Promise((resolve, reject) => {

//             redis.set(queryName, value, function(err) {

//                 if(err)
//                     return reject(err);

//                 redis.expireat(queryName, expire_time, function(err) {

//                     if(err)
//                         return reject(err);

//                     console.log('stored in redis: ' + queryName);
//                     resolve();
//                 });
//             });
//         });
//     }

//     static async setup() {
//         const bigQueryConnections = await mysql.query(`
//             select
//                 c.*,
//                 a.name
//             from
//                 tb_credentials c
//             join
//                 tb_accounts a
//                 using(account_id)
//             where
//                 type = 'bigquery'
//                 and c.status = 1
//                 and a.status = 1
//             `);

//         const path = "../../bigquery_files/";

//         for(const con of bigQueryConnections) {

//             if (!fs.existsSync(path + con.name)) {

//                 fs.mkdirSync(path + con.name);
//             }

//             else {

//                 try{

//                     await commonFun.clearDirectory(path + con.name);
//                 }
//                 catch(e) {

//                     console.log(new Error('could not clear directory', e))
//                 }
//             }
//         }

//         for(const con of bigQueryConnections) {

//             try {

//                 await fs.writeFileSync(path + con.name+'/' + con.connection_name + ".json", con.file);
//             }
//             catch(e) {

//                 console.log(new Error('could not load bigquery file: ', con.connection_name, 'for ', con.name))
//             }
//         }
//     }
// }

// exports.setup = BigQuery.setup;
// exports.BigQuery = BigQuery;