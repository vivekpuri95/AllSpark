importScripts('main.js', 'streams.js')

self.onmessage = async function(e) {

	await IndexedDb.load();

	let message = {
		reference: e.data.reference,
	};

	if(e.data.action == 'loadDataStream')
		message.response = await dataStreamWorker.load(e.data.request);

	else
		throw 'Invalid Web Worker action!';

	self.postMessage(message);
}

class DataStreamWorker {

	constructor() {
		this.streams = new DataStreams();
	}

	async load(id) {

		await this.streams.load();

		const stream = new DataStream(this.streams.get(id));

		await stream.fetch();

		return stream;
	}
}

const dataStreamWorker = new DataStreamWorker();