const redis = require('redis');
const redisOptions = require('config').get("redisOptions");

const redis_client = redis.createClient(redisOptions);
console.log('connected to redis');
module.exports = redis_client;