const config = require('config');
const promisify = require("util").promisify;

if (!config.has('redisOptions')) {
	return;
}

const redis = require('redis');
const redisOptions = config.get("redisOptions");

const redis_client = redis.createClient(redisOptions);


class Redis {

	constructor() {

		console.log("initializing redis");
	}

	static async get(keyPattern) {

		const getPromisified = promisify(redis_client.get).bind(redis_client);
		console.log("getting key: ", keyPattern);

		return await getPromisified(keyPattern);
	}

	static async keys(keyPattern) {

		const keysPromisified = promisify(redis_client.keys).bind(redis_client);
		console.log("getting list of keys like:", keyPattern);

		return await keysPromisified(keyPattern);
	}

	static async set(key, value) {

		const setPromisified = promisify(redis_client.set).bind(redis_client);
		console.log("string in redis key:", key);

		return await setPromisified(key, value);
	}

	static async expire(key, seconds) {

		const expirePromisified = promisify(redis_client.expire).bind(redis_client);
		console.log("setting expiration of key", key, "for", seconds, "seconds");

		return await expirePromisified(key, seconds);
	}

	static async expireat(key, expireUnixTimestampSeconds) {

		const expireatPromisified = promisify(redis_client.expireat).bind(redis_client);
		console.log("setting expire unixtimestamp for", key);

		return await expireatPromisified(key, expireUnixTimestampSeconds);
	}

	static async del(key) {

		const deletePromisified = promisify(redis_client.del).bind(redis_client);
		console.log("deleting key", key);

		return await deletePromisified(key);
	}

}

console.log('Connected to redis');
(async () => {
	console.log(await Redis.keys("*"))
})();

exports.redis = redis_client;
exports.Redis = Redis;
