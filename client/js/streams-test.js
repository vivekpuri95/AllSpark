Page.class = class StreamTest extends Page {

	constructor() {

		super();

		this.load();
	}

	async load() {

		const response = await this.webWorker.send('loadDataStream', 20);

		console.log(response);
	}
}