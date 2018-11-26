class PromiseManager {

	constructor(key) {

		if(!global[key]) {

			global[key] = new Map()
		}

		this.key = key

		this.map = global[key];
	}

	async fetchAndExecute(hash) {

		if (this.map.has(hash)) {

			return await this.map.get(hash).get("execute");
		}
	}

	store(promise, metadata, hash) {

		metadata["execute"] = promise;

		global[this.key].set(hash, metadata);
	}

	remove(hash) {

		global[this.key].delete(hash);
	}

	list() {

		return [...this.map.values()];
	}

	has(hash) {

		return this.map.has(hash);
	}
}

exports.promiseManager = PromiseManager;