"use strict";

 class DataStream {

 	constructor(port, request) {

 		this.port = port;
 		this.request = request;
 	}

 	progress(state) {
 		this.port.postMessage({type: 'progress', state});
 	}

 	async load() {

 		this.progress('Fetching');

 		const response = await this.fetch();

 		this.port.postMessage({type: 'complete', response});
 	}

 	async fetch() {
 		return await API.call('reports/engine/report', this.request.params, this.request.options);
 	}
 }