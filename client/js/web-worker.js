importScripts('main.js', 'streams.js')

self.onmessage = async function(e) {

	try {

		if(e.data.action == 'setup') {

			await IndexedDb.load();

			e.ports[0].postMessage({type: 'success'});

			return;
		}

		else if(e.data.action == 'stream') {

			const stream = new DataStream(e.ports[0], e.data);

			await stream.load();
		}

	} catch(error) {

		e.ports[0].postMessage({
			type: 'error',
			error,
		});
	}
}