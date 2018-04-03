const config = require('config');

if(!config.has('redisOptions'))
	return;

const redis = require('redis');
const redisOptions = config.get("redisOptions");

const redis_client = redis.createClient(redisOptions);
console.log('Connected to redis');
module.exports = redis_client;