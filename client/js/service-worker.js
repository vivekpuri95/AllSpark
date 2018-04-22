const cacheName = 'main';
const now = Date.now();

const offlineCaches = [
	'/',
	'/service-worker.js',
];

self.addEventListener('install', event => {

	event.waitUntil((async () => {

		for(const key of await caches.keys())
			caches.delete(key);

		const cache = await caches.open(cacheName);

		await cache.addAll(offlineCaches);

		self.skipWaiting();
	})());
});

self.addEventListener('activate', async event => {

	clients.claim();
});

self.addEventListener('fetch', async event => {

	event.respondWith((async () => {

		const match = await caches.match(event.request);

		if(match)
			return match;

		const response = await fetch(event.request.clone());

		if(response && response.status == 200 && event.request.method == 'GET') {

			const cache = await caches.open(cacheName);

			cache.put(event.request, response.clone());
		}

		return response;
	})());
});