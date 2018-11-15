class PromiseManager {

	constructor(key) {

		if(!global[key]) {

			global[key] = new Map()
		}

		this.map = global[key];
	}

	async fetchAndExecute(hash) {

		if (this.map.has(hash)) {

			return await this.map.get(hash).get("execute");
		}
	}

	store(promise, metadata, hash) {

		metadata["execute"] = promise;

		this.map.set(hash, metadata);
	}

	remove(hash) {

		this.map.delete(hash);
	}

	list() {

		return [...this.map.values()];
	}

	has(hash) {

		return this.map.has(hash);
	}
}

exports.promiseManager = PromiseManager;