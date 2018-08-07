"use strict";

if(typeof window != 'undefined') {
	window.addEventListener('DOMContentLoaded', async () => {

		await Page.setup();

		if(!user || !user.privileges.has('superadmin')) {

			console.log(`%c
						           _ _  _____                  _
						     /\\   | | |/ ____|                | |
						    /  \\  | | | (___  _ __   __ _ _ __| | __
						   / /\\ \\ | | |\\___ \\| '_ \\ / _\` | '__| |/ /
						  / ____ \\| | |____) | |_) | (_| | |  |   <
						 /_/    \\_\\_|_|_____/| .__/ \\__,_|_|  |_|\\_\\
						                     | |
						                     |_|
						   %cWelcome to the source, enjoy your stay.
				Find the entire code at https://github.com/Jungle-Works/AllSpark
			`, 'color: #f33; font-weight: bold;', 'color: #777');
		}

		if(!Page.class)
			return;

		window.page = new (Page.class)();
	});
}

class Page {

	static async setup() {

		AJAXLoader.setup();

		await Page.load();
	}

	static async load() {

		await Storage.load();
		await Account.load();
		await User.load();
		await MetaData.load();

		if(window.account && account.auth_api) {

			const parameters = new URLSearchParams(window.location.search.slice(1));

			if(account && parameters.get('external_parameters') && Array.isArray(account.settings.get('external_parameters'))) {

				User.logout({callback: async () => {

					const parameters_ = {};

					for(const [key, value] of parameters)
						parameters_[key] = value;

					await Storage.set('external_parameters', parameters_);
				}});
			}
		}

		await API.refreshToken();
	}

	constructor() {

		this.container = document.querySelector('main');

		this.account = window.account;
		this.user = window.user;
		this.metadata = window.MetaData;
		this.indexedDb = IndexedDb.instance;
		this.cookies = Cookies;

		this.serviceWorker = new Page.serviceWorker(this);
		this.webWorker = new Page.webWorker(this);

		this.renderPage();
		this.shortcuts();
	}

	renderPage() {

		const
			navList = [
				{url: '/users', name: 'Users', privilege: 'users', icon: 'fas fa-users'},
				{url: '/dashboards-manager', name: 'Dashboards', privilege: 'dashboards', icon: 'fa fa-newspaper'},
				{url: '/reports', name: 'Reports', privilege: 'report', icon: 'fa fa-database'},
				{url: '/connections', name: 'Connections', privilege: 'connections', icon: 'fa fa-server'},
				{url: '/tasks', name: 'Tasks', privilege: 'tasks', icon: 'fas fa-tasks'},
				{url: '/settings', name: 'Settings', privilege: 'administrator', icon: 'fas fa-cog'},
			],
			header = document.querySelector('body > header'),
			navContainer = header.querySelector('.nav-container'),
			nav = header.querySelector('nav'),
			userPopup = header.querySelector('.user-popup'),
			userToggle = header.querySelector('.user-toggle'),
			menuToggle = header.querySelector('.menu-toggle'),
			profileLink = document.createElement('a');

		if(window.account) {

			if(account.settings.get('hideHeader')) {
				header.classList.add('hidden');
				return;
			}

			if(account.icon)
				document.getElementById('favicon').href = account.icon;

			if(account.logo)
				header.querySelector('.logo img').src = account.logo;

			document.title = account.name;
		}

		userToggle.innerHTML = '<i class="fa fa-user"></i>&nbsp; '+ this.user.name;

		profileLink.textContent = 'Profile';
		profileLink.href = `/user/profile/${this.user.user_id}`;
		profileLink.classList.add('profile-link');

		header.querySelector('.name').innerHTML = this.user.name;
		header.querySelector('.email').innerHTML = this.user.email;
		header.querySelector('.user-popup').insertBefore(profileLink, header.querySelector('.logout'));

		userToggle.on('click', e => {
			e.stopPropagation();
			userPopup.classList.toggle('hidden');
			userToggle.classList.toggle('selected');
		});

		document.body.on('click', () => {
			userPopup.classList.add('hidden');
			userToggle.classList.remove('selected');
			navContainer.classList.remove('show');
			menuToggle.classList.remove('selected');
		});

		userPopup.on('click', e => e.stopPropagation());
		navContainer.on('click', e => e.stopPropagation());
		header.querySelector('.logout').on('click', () => User.logout());

		menuToggle.on('click', e => {
			e.stopPropagation();
			navContainer.classList.toggle('show');
			menuToggle.classList.toggle('selected');
		});

		if(user.id)
			navContainer.insertBefore(new GlobalSearch().container, header.querySelector('.user-toggle'));

		for(const item of navList) {

			if(!window.user || !user.privileges.has(item.privilege))
				continue;

			nav.insertAdjacentHTML('beforeend',`
				<a href='${item.url}'>
					<i class="${item.icon}"></i>&nbsp;
					${item.name}
				</a>
			`);
		}

		for(const item of nav.querySelectorAll('a')) {
			if(window.location.pathname.startsWith(new URL(item.href).pathname))
				item.classList.add('selected');
		}
	}

	shortcuts() {

		document.on('keyup', e => {

			if(!e.altKey)
				return;

			// Alt + K
			if(e.keyCode == 75 && document.querySelector('html > head link[href^="/css/custom.css"]'))
				document.querySelector('html > head link[href^="/css/custom.css"]').remove();

			// Alt + L
			if(e.keyCode == 76)
				User.logout();
		});
	}
}

Page.exception = class PageException extends Error {

	constructor(message) {
		super(message);
		this.message = message;
	}
}

Page.serviceWorker = class PageServiceWorker {

	constructor(page) {

		this.page = page;

		this.setup();
	}

	async setup() {

		if(!('serviceWorker' in navigator)) {
			this.status = false;
			return;
		}

		this.worker = await navigator.serviceWorker.register('/service-worker.js');

		if(navigator.serviceWorker.controller)
			navigator.serviceWorker.controller.addEventListener('statechange', e => this.statechange(e));
	}

	statechange(event = {}) {

		if(event.target && event.target.state != 'redundant')
			return;

		setTimeout(() => {

			const message = document.createElement('div');

			message.classList.add('warning', 'site-outdated');

			message.innerHTML = `The site has been updated in the background. Click here to reload the page.`;

			message.on('click', () => {
				window.location.reload();
				message.innerHTML = 'Reloading&hellip;';
			});

			this.page.container.parentElement.insertBefore(message, this.page.container);

		}, 1000);
	}
}

/**
 * A generic key value store that uses IndexedDb.
 *
 * Has support for basic Map based functions and gives
 * access to the database instance for further interaction.
 */
class IndexedDb {

	/**
	 * Set up the database connection if not done already.
	 */
	static async load() {

		if(IndexedDb.instance)
			return;

		IndexedDb.instance = new IndexedDb();

		await IndexedDb.instance.open();
	}

	/**
	 * Save a page's reference for use later.
	 *
	 * @param  Page	page	May be used to reference the current page.
	 */
	constructor(page) {
		this.page = page;
	}

	/**
	 * Open a database connection.
	 *
	 * @return Promise	Resolves when the connection is established successfuly.
	 */
	open() {

		return new Promise((resolve, reject) => {

 			this.request = indexedDB.open('MainDb', 1);

			this.request.onupgradeneeded = e => this.setup(e.target.result);
			this.request.onsuccess = e => {

				this.db = e.target.result;

				this.db.onerror = e => {throw new Page.exception(e);}
				resolve();
			};

			this.request.onerror = e => {
				reject();
			};
		});
	}

	/**
	 * Set up the connection once it's created for the first time.
	 *
	 * This creates a store called MainStore that's the sole sotore that stores any data.
	 *
	 * @param  object	db	The database instance.
	 */
	setup(db) {
		db.createObjectStore('MainStore', {keyPath: 'key'});
	}

	/**
	 * Check if a key exists in the IndexedDb's main store.
	 *
	 * @param  string	key	The key to check.
	 * @return Promise		Resolves with true if the key exists, false otherwise.
	 */
	has(key) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore').objectStore('MainStore').get(key);

			request.onsuccess = e => resolve(e.target.result ? true : false);
			request.onerror = e => resolve(false);
		});
	}

	/**
	 * Get the value stored at a specified key in the main store.
	 *
	 * @param  string	key	The key whose value will be fetched.
	 * @return Promise		Resolves with the value stored in the mian store.
	 */
	get(key) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore').objectStore('MainStore').get(key);

			request.onsuccess = e => resolve(e.target.result ? e.target.result.value : undefined);
			request.onerror = e => resolve();
		});
	}

	/**
	 * Set the value at a specified key in the main store.
	 *
	 * @param string	key		The key of the new value.
	 * @param Object	value	Value for the key being passed.
	 * @return Promise			Resolves with the result when saved. Rejects otherwise.
	 */
	set(key, value) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore', 'readwrite').objectStore('MainStore').put({key, value});

			request.onsuccess = e => resolve(e.result);
			request.onerror = e => reject(e);
		});
	}

	/**
	 * Delete the value stored at the specified key.
	 *
	 * @param  String	key	The key that will be deleted.
	 * @return Promise		That resolves when the item is successfuly deleted.
	 */
	delete(key) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore', 'readwrite').objectStore('MainStore').delete(key);

			request.onsuccess = e => resolve(e.result);
			request.onerror = e => reject(e);
		});
	}
}

/**
 * A generic cookie map interface that lets us do basic CRUD tasks.
 */
class Cookies {

	/**
	 * Sets a new cookie with given name and value and overwrites any previously held values.
	 *
	 * @param  string	key		The name of the cookie being set.
	 * @param  string	Value	The value of the cookie being set.
	 * @return boolean			The status of the set request.
	 */
	static set(key, value) {
		document.cookie = `${key}=${encodeURIComponent(value)}`;
		return true;
	}

	/**
	 * Checks if a cookie with the given name exists.
	 *
	 * @param  string	key	The name of the cookie whose existance is being questioned
	 * @return boolean		Returns true if the cookie exists, false otherwise
	 */
	static has(key) {
		return new Boolean(document.cookie.split(';').filter(c => c.includes(`${key}=`)).length);
	}

	/**
	 * Gets the value of a cookie with the given name.
	 *
	 * @param  string	key	The name of the cookie whose value will be retured.
	 * @return string		The	value of the cookie, null if not found.
	 */
	static get(key) {

		// TODO: Handle the prefix bug, (both foo and barfoo will be matched with current approach)
		const [cookie] = document.cookie.split(';').filter(c => c.includes(`${key}=`));

		if(!cookie)
			return null;

		return decodeURIComponent(cookie.split('=')[1]);
	}
}

/**
 * A generic storage API to store data throughout the project.
 * It switches the storage medium depending on the available media.
 * If IndexedDb is available that will be used. LocalStorage is used otherwise.
 */
class Storage {

	/**
	 * Set up the storage media.
	 * IndexedDb mostly.
	 *
	 * @return Promise	That resolves when the setup is complete.
	 */
	static async load() {

		try {
			await IndexedDb.load();
		} catch(e) {
			Storage.localStorage = true;
		}
	}

	/**
	 * Check if a key exists.
	 *
	 * @param  string	key	The key to check form.
	 * @return Boolean		True if found, false otherwise.
	 */
	static async has(key) {

		if(Storage.localStorage)
			return key in localStorage;

		else return await IndexedDb.instance.has(key);
	}

	/**
	 * Get a key's value.
	 * It takes care of encoding the data if needed (LocalSotorage).
	 *
	 * @param  string	key	The key whose value is being fetched.
	 * @return Object		The value for the key.
	 */
	static async get(key) {

		if(!await Storage.has(key))
			return undefined;

		if(!Storage.localStorage)
			return await IndexedDb.instance.get(key);

		try {
			return JSON.parse(localStorage[key]);
		} catch(e) {}

		return undefined;
	}

	/**
	 * Save a value at the specified key.
	 *
	 * @param string	key		The key that is being set.
	 * @param object	value	The value for the given key.
	 */
	static async set(key, value) {

		if(Storage.localStorage)
			return localStorage[key] = JSON.stringify(value);

		return await IndexedDb.instance.set(key, value);
	}

	/**
	 * Delete a key's value.
	 * @param string	key	The key whose data is bieng deleted.
	 */
	static async delete(key) {

		if(Storage.localStorage)
			return delete localStorage[key];

		return await IndexedDb.instance.delete(key);
	}

	/**
	 * Clear the storage completely.
	 */
	static async clear() {

		localStorage.clear();

		if(!Storage.localStorage)
			await IndexedDb.instance.db.transaction('MainStore', 'readwrite').objectStore('MainStore').clear();
	}
}

if(typeof Worker != 'undefined') {

	Page.webWorker = class PageWebWorker extends Worker {

		constructor(page) {

			super('/js/web-worker.js');

			this.page = page;
			this.requests = new Map();

			this.onmessage = e => this.message(e);
			this.onerror = e => this.error(e);
		}

		send(action, request) {

			const reference = Math.random();

			return new Promise(resolve => {

				this.requests.set(reference, response => resolve(response));

				this.postMessage({reference, action, request});
			});
		}

		message(e) {

			if(!this.requests.has(e.data.reference))
				throw new Page.exception(`Invalid web worker response for reference ${e.data.reference}`, e.data.response);

			this.requests.get(e.data.reference)(e.data.response);
		}

		error(e) {
			throw new Page.exception(e);
		}
	}
}

class GlobalSearch {

	constructor(page) {

		this.page = page
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('global-search');

		container.innerHTML = `
			<input class="search-input" placeholder="Search...">
			<ul class="hidden"></ul>
		`;

		this.searchList = container.querySelector('ul');
		this.setEvents();

		return container;
	}

	setEvents() {

		this.searchInput = this.container.querySelector('input');

		document.body.on('click', () => {
			this.hide();
		});

		this.searchInput.on('click', (e) => {

			if(this.searchInput.value == '') {
				this.hide();
			}
			else {
				this.show();
			}
			e.stopPropagation();
		});

		this.searchInput.on('keyup', async (e) => {

			clearTimeout(GlobalSearch.inputTimeout);
			e.stopPropagation();

			if(this.searchInput.value == '') {
				this.hide();
				return;
			}

			GlobalSearch.inputTimeout = setTimeout( async () => {
				await this.fetch();
			}, 300);

			}
		);

		// this.container.on('keydown', Page.keyUpDownListenter = e => this.searchUpDown(e));
	}

	async fetch() {

		this.searchList.innerHTML = `<li><span class="loading"><i class="fa fa-spinner fa-spin"></i></span></li>`;

		const params = {
			text: this.searchInput.value
		};

		const data = await API.call('search/query', params);
		this.render(data);
		this.show();
	}

	render(data) {

		this.searchList.textContent = null;

		for(const row of data) {

			const list_item = document.createElement('li');

			list_item.setAttribute('tabIndex', 0);

			list_item.innerHTML = `
				<a href="${row.href}" tabindex="-1">
					<span><strong>${row.name}</strong> in <strong>${row.superset}</strong></span>
				</a>
				<span class="li-edit"><i class="far fa-edit"></i></span>
			`;

			list_item.querySelector('.li-edit').on('click', () => {

				const href = {
					Reports : '/reports/configure-report/query_id',
					Dashboards : '/dashboards-manager/id',
					Users : '/users/user_id',
					Datasets : '/settings/datasets/id'
				};

				href[row.superset] = href[row.superset].split('/');
				const suffix = href[row.superset].pop();
				href[row.superset] = href[row.superset].join('/').concat(`/${row[suffix]}`);

				location.href = href[row.superset];

			});

			this.searchList.appendChild(list_item);
		}

		if(!data.length) {
			this.searchList.innerHTML = `<li><a href="#">No results found... :(</a></li>`;
		}
	}

	show() {

		this.searchList.classList.remove('hidden');
		this.searchInput.classList.add('bottom-border');
	}

	hide() {

		this.searchList.classList.add('hidden');
		this.searchInput.classList.remove('bottom-border');
	}

	keyUpDown(e) {

		e.stopPropagation();

		if (e.which == 40) {
			this.active_li = this.active_li.nextElementSibling || this.active_li
		}
		else if (e.which == 38) {
			this.active_li = this.active_li.previousElementSibling || this.active_li;
		}
		else {
			return
		}

		this.active_li.focus();
	}
}

class Account {

	static async load() {

		const account = await Account.fetch();

		return window.account = account ? new Account(account) : null;
	}

	static async fetch() {

		if(await Storage.has('account'))
			return await Storage.get('account');

		try {

			await Storage.set('account', await API.call('accounts/get'));

		} catch(e) {
			return null;
		}

		return await Storage.get('account');
	}

	constructor(account) {

		for(const key in account)
			this[key] = account[key];

		this.settings = new Map;

		if(!Array.isArray(account.settings))
			return;

		for(const setting of account.settings)
			this.settings.set(setting.key, setting.value);
	}
}

class User {

	static async load() {

		let user = null;

		const token = await Storage.get('token');

		try {
			user = JSON.parse(atob(token.body.split('.')[1]));
		} catch(e) {}

		return window.user = new User(user);
	}

	static async logout({next, callback, redirect = true} = {}) {

		try {

			const
				parameter = {
					user_id: user.user_id,
					type: 'logout',
					description: 'Logout from UI.',
				},
				options = {
					method: 'POST',
				};

			API.call('sessionLogs/insert', parameter, options);
		}
		catch(e) {}

		setTimeout(async() => {

			const parameters = new URLSearchParams();

			await Storage.clear();

			if(next)
				parameters.set('continue', window.location.pathname + window.location.search);

			if(callback)
				await callback();

			if(navigator.serviceWorker) {
				for(const registration of await navigator.serviceWorker.getRegistrations())
					registration.unregister();
			}

			if(redirect)
				window.location = '/login?'+parameters.toString();
		}, 100)
	}

	constructor(user) {

		for(const key in user)
			this[key] = user[key];

		this.id = this.user_id;
		this.privileges = new UserPrivileges(this);
		this.roles = new UserRoles(this);
	}
}

class UserPrivileges extends Set {

	constructor(context) {

		super(context.privileges);

		this.context = context;
	}

	has(name) {

		if(name === "superadmin") {

			return Array.from(this).filter(p => p.privilege_name.toLowerCase() == name.toLowerCase()).length;
		}

		return Array.from(this).filter(p => p.privilege_name.toLowerCase() == name.toLowerCase() || p.privilege_id === 0).length;
	}
}

class UserRoles extends Set {

	constructor(context) {

		super(context.roles);

		this.context = context;
	}
}

class MetaData {

	static async load() {

		MetaData.categories = new Map;
		MetaData.privileges = new Map;
		MetaData.roles = new Map;
		MetaData.visualizations = new Map;
		MetaData.filterTypes = new Map;
		MetaData.features = new Set;
		MetaData.spatialMapThemes = new Map;
		MetaData.globalFilters = new Set;

		if(!user.id)
			return;

		const metadata = await MetaData.fetch();

		MetaData.save(metadata);
	}

	static async fetch() {

		let
			metadata,
			timestamp;

		if(await Storage.has('metadata')) {
			try {
				({metadata, timestamp} = (await Storage.get('metadata')) || {});
			} catch(e) {}
		}

		if(!timestamp || Date.now() - timestamp > MetaData.timeout) {

			metadata = await API.call('users/metadata');

			await Storage.set('metadata', {metadata, timestamp: Date.now()})
		}

		return metadata;
	}

	static save(metadata = {}) {

		for(const privilege of metadata.privileges || []) {

			privilege.privilege_id = privilege.owner_id;
			delete privilege['owner_id'];

			MetaData.privileges.set(privilege.privilege_id, privilege);
		}

		for(const role of metadata.roles || []) {

			role.role_id = role.owner_id;
			delete role['owner_id'];

			MetaData.roles.set(role.role_id, role);
		}

		for(const category of metadata.categories || []) {

			category.category_id = category.owner_id;
			delete category['owner_id'];

			MetaData.categories.set(category.category_id, category);
		}

		MetaData.spatialMapThemes =  new Map(metadata.spatialMapThemes.map(x => [x.name, JSON.parse(x.theme)]));
		MetaData.filterTypes = new Map(metadata.filterTypes.map(x => [x.name.toLowerCase(), x]));
		MetaData.visualizations = new Map(metadata.visualizations.map(v => [v.slug, v]));
		MetaData.features = new Map(metadata.features.map(f => [f.feature_id, f]));
		MetaData.globalFilters = new Map(metadata.globalFilters.map(d => [d.id, d]));
	}
}

class ErrorLogs {

	static async send(message, path, line, column, stack) {

		if(ErrorLogs.sending)
			return;

		ErrorLogs.sending = true;

		const
			options = {
			method: 'POST'
			},
			params = {
				message : message,
				description : stack && stack.stack,
				url : path,
				type : 'client',
			};

		try {
			await API.call('errors/log',params, options);
		}
		catch(e) {
			console.log('Failed to log error', e);
			return;
		}

		ErrorLogs.sending = false;
	}
}

class AJAX {

	static async call(url, _parameters, options = {}) {

		AJAXLoader.show();

		const parameters = new URLSearchParams(_parameters);

		if(typeof _parameters == 'object') {
			for(const key in _parameters)
				parameters.set(key, _parameters[key]);
		}

		if(options.method == 'POST') {

			options.body = parameters.toString();

			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
			};
		}

		else
			url += '?' + parameters.toString();

		let response = null;

		try {
			response = await fetch(url, options);
		}
		catch(e) {
			AJAXLoader.hide();
			throw new API.Exception(e.status || e.message || e, 'API Execution Failed');
		}

		AJAXLoader.hide();

		if(response.status == 401)
			return User.logout({redirect: options.redirectOnLogout});

		return response.headers.get('content-type').includes('json') ? await response.json() : await response.text();
	}
}

class API extends AJAX {

	/**
	 * Makes an API call.
	 *
	 * @param  string		endpoint	The endpoint to hit.
	 * @param  parameters	parameters	The api request paramters.
	 * @param  object		options		The options object.
	 * @return Promise					That resolves when the request is completed.
	 */
	static async call(endpoint, parameters = {}, options = {}) {

		if(!endpoint.startsWith('authentication'))
			await API.refreshToken();

		const refresh_token = await Storage.get('refresh_token');

		if(refresh_token) {
			if(typeof parameters == 'string')
				parameters+= '&refresh_token='+refresh_token;
			else
				parameters.refresh_token = refresh_token;
		}

		const token = await Storage.get('token');

		if(token && token.body) {

			if(typeof parameters == 'string')
				parameters += '&token='+token.body;

			else
				parameters.token = token.body;

		}

		// If a form id was supplied, then also load the data from that form
		if(options.form)
			API.loadFormData(parameters, options.form);

		endpoint = '/api/v2/' + endpoint;

		const response = await AJAX.call(endpoint, parameters, options);

		if(response.status)
			return response.data;

		else
			throw new API.Exception(response);
	}

	/**
	 * This function takes a form id and loads all it's inputs data into the parameters object.
	 *
	 * We use FormData here instead of the a
	 * key/value pair object for two reasons:
	 *
	 * * It lets us pick up all form fields and
	 *	 values automatically without listing them
	 *	 here and worrying about conversions etc.
	 *
	 * * It lets us switch to the more advanced
	 *	 form/multipart Content-Type easily in the
	 *	 future, just comment out the later conversion.
	 *
	 * @param  object	parameters	The parameter list.
	 * @param  string	formData	The FormData object whose elements will be picked.
	 */
	static loadFormData(parameters, formData) {

		if(!(formData instanceof FormData))
			throw new Page.exception('The form object is not an instance of FormDat class! :(');

		for(const key of formData.keys()) {

			let value = formData.get(key).trim();

			if(value && !isNaN(value))
				value = parseInt(value);

			parameters[key] = value;
		}
	}

	/**
	 * Makes sure the short term token we have is valid and up to date.
	 */
	static async refreshToken() {

		let
			getToken = true,
			token = await Storage.get('token'),
			has_external_parameters = await Storage.has('external_parameters');

		if(!has_external_parameters && Cookies.get('external_parameters')) {

			await Storage.set('external_parameters', JSON.parse(Cookies.get('external_parameters')));
			Cookies.set('external_parameters', '');
		}

		if(Cookies.get('refresh_token')) {

			await Storage.set('refresh_token', Cookies.get('refresh_token'));
			Cookies.set('refresh_token', '');
		}

		if(token && token.body) {

			try {

				const user = JSON.parse(atob(token.body.split('.')[1]));

				// If the token is about to expire in next few seconds then let it refresh.
				// We're using the difference of expiry and creation here to support casses
				// where users manually change system time and local UTC time gets out of sync with remote UTC time.
				if(Date.now() - token.timestamp + 10000 < (user.exp - user.iat) * 1000)
					getToken = false;

			} catch(e) {}
		}

		if(!(await Storage.has('refresh_token')) || !getToken)
			return;

		const
			parameters = {
				refresh_token: await Storage.get('refresh_token'),
			},
			options = {
				method: 'POST',
				redirectOnLogout: false,
			};

		if(window.account && account.auth_api && Array.isArray(account.settings.get('external_parameters')) && await Storage.get('external_parameters')) {

			const external_parameters = await Storage.get('external_parameters');

			for(const key of account.settings.get('external_parameters')) {

				if(key in external_parameters)
					parameters['ext_' + key] = external_parameters[key];
			}

			parameters.external_parameters = true;
		}

		const response = await API.call('authentication/refresh', parameters, options);

		token = {

			// Save the time we got the token, we can use this later to check if it's about to expire
			timestamp: Date.now(),
			body: response
		};

		await Storage.set('token', token);
		Cookies.set('token', token);

		Page.load();
	}
}

API.Exception = class {

	constructor(response = {}) {

		this.status = response.status || '';
		this.message = response.message || response;
	}
}

class AJAXLoader {

	static setup() {

		this.animateEllipses();

		setInterval(() => this.animateEllipses(), 500);
	}

	/**
	 * Show the working flag.
	 */
	static show() {

		if(typeof document == 'undefined')
			return;

		if(!AJAXLoader.count)
			AJAXLoader.count = 0;

		AJAXLoader.count++;

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available
		if(!container)
			return;

		container.classList.add('show');
		container.classList.remove('hidden');

		clearTimeout(AJAXLoader.timeout);
		clearTimeout(AJAXLoader.timeoutHidden);
	}

	/**
	 * Hide the flag.
	 */
	static hide() {

		if(typeof document == 'undefined')
			return;

		AJAXLoader.count--;

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available or some other request me still be in progress.
		if(!container || AJAXLoader.count)
			return;

		AJAXLoader.timeout = setTimeout(() => {

			container.classList.remove('show');

			AJAXLoader.timeoutHidden = setTimeout(() => container.classList.add('hidden'), 300);
		}, 100);
	}

	static animateEllipses() {

		const container = document.getElementById('ajax-working');

		// Because the container may not always be available or some other request me still be in progress.
		if(!container || AJAXLoader.count)
			return;

		this.ellipsesDots = this.ellipsesDots < 3 ? this.ellipsesDots + 1 : 0;

		container.textContent = 'Working' + (new Array(this.ellipsesDots).fill('.').join(''));
	}
}

class Format {

	static date(date) {

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC',
		};

		if(!Format.date.formatter)
			Format.date.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof date == 'string')
			date = Date.parse(date);

		if(typeof date == 'object' && date)
			date = date.getTime();

		if(!date)
			return '';

		return Format.date.formatter.format(date);
	}

	static month(month) {

		const options = {
			year: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		};

		if(!Format.month.formatter)
			Format.month.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof month == 'string')
			month = Date.parse(month);

		if(typeof month == 'object' && month)
			month = month.getTime();

		if(!month)
			return '';

		return Format.month.formatter.format(month);
	}

	static year(year) {

		const options = {
			year: 'numeric',
			timeZone: 'UTC',
		};

		if(!Format.year.formatter)
			Format.year.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof year == 'string')
			year = Date.parse(year);

		if(typeof year == 'object' && year)
			year = year.getTime();

		if(!year)
			return '';

		return Format.year.formatter.format(year);
	}

	static time(time) {

		const options = {
			hour: 'numeric',
			minute: 'numeric'
		};

		if(!Format.time.formatter)
			Format.time.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof time == 'string')
			time = Date.parse(time);

		if(typeof time == 'object' && time)
			time = time.getTime();

		if(!time)
			return '';

		return Format.time.formatter.format(time);
	}

	static dateTime(dateTime) {

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		};

		if(!Format.dateTime.formatter)
			Format.dateTime.formatter = new Intl.DateTimeFormat(undefined, options);

		if(typeof dateTime == 'string')
			dateTime = Date.parse(dateTime);

		if(typeof dateTime == 'object' && dateTime)
			dateTime = dateTime.getTime();

		if(!dateTime)
			return '';

		return Format.dateTime.formatter.format(dateTime);
	}

	static number(number) {

		if(!Format.number.formatter)
			Format.number.formatter = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2});

		return Format.number.formatter.format(number);
	}
}

class Sections {

	static async show(id) {

		for(const section of document.querySelectorAll('main section.section'))
			section.classList.remove('show');

		const container = document.querySelector(`main section.section#${id}`);

		if(container)
			container.classList.add('show');
	}
}

class CodeEditor {

	constructor({mode = null}) {

		if(!window.ace)
			throw Page.exception('Ace editor not available! :(');

		this.mode = mode;
	}

	get container() {

		const container = this.editor.container;
		container.classList.add('code-editor');

		return container;
	}

	get editor() {

		if(this.instance)
			return this.instance;

		const editor = this.instance = ace.edit(document.createElement('div'));

		editor.setTheme('ace/theme/monokai');

		editor.setFontSize(16);
		editor.$blockScrolling = Infinity;

		if(this.mode)
			editor.getSession().setMode(`ace/mode/${this.mode}`);

		return editor;
	}

	get value() {
		return this.editor.getValue();
	}

	set value(value) {
		this.editor.setValue(value || '', 1);
	}

	setAutoComplete(list) {

		this.langTools = ace.require('ace/ext/language_tools');

		this.langTools.setCompleters([{
			getCompletions: (_, __, ___, ____, callback) => callback(null, list),
		}]);

		this.editor.setOptions({
			enableBasicAutocompletion: true,
		});
	}
}

/**
 * A generic implementation for a modal box.
 *
 * It has the following features.
 *
 * - Lets users set the heading, body content and footer of the dialog.
 * - Provides a clean interface with user controlled show and hide features.
 */
class DialogBox {

	/**
	 * The main container of the Dialog Box.
	 *
	 * @return	HTMLElement	A div that has the entire content.
	 */
	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('dialog-box-blanket');

		container.innerHTML = `
			<section class="dialog-box">
				<header><h3></h3><span class="close"><i class="fa fa-times"></i></span></header>
				<div class="body"></div>
			</section>
		`;

		container.querySelector('.dialog-box header span.close').on('click', () => this.hide());

		container.querySelector('.dialog-box').on('click', e => e.stopPropagation());

		container.on('click', () => this.hide());

		this.hide();

		document.querySelector('main').appendChild(container);

		return container;
	}

	/**
	 * Update the heading of the dialog box
	 *
	 * @param	dialogHeading	The new heading
	 */
	set heading(dialogHeading) {

		const heading = this.container.querySelector('.dialog-box header h3');

		if(dialogHeading instanceof HTMLElement) {

			heading.textContent = null;
			heading.appendChild(dialogHeading);
		}
		else if(typeof dialogHeading == 'string') {

			heading.innerHTML = dialogHeading;
		}
		else {

			throw Page.exception('Invalid heading format');
		}
	}

	/**
	 *
	 * @return HTMLElement	reference to the dialog box body container to set the content of the dialog box.
	 */
	get body() {

		return this.container.querySelector('.dialog-box .body');
	}

	/**
	 * Hides the dialog box container
	 */
	hide() {

		this.container.classList.add('hidden');
	}

	/**
	 * Displays the dialog box container
	 */
	show() {

		this.container.classList.remove('hidden');
	}
}

/**
 * A generic implementation for a multiple select dropdown.
 *
 * It has the following features.
 *
 * - Takes a list of possible values in a specific format [{name, value}]
 * - Lets users select one or multiple of these values.
 * - Provides a clean interface with a value getter and setter.
 * - The input can be disabled as well.
 */
class MultiSelect {

	/**
	 * Create a new instance for the MultiSelect.
	 *
	 * @param  Array	options.datalist			The set of possible values for the MultiSelect.
	 * @param  Boolean	options.multiple			Toggle for allowing the user to select multiple values.
	 * @param  Boolean	options.expand				Wether the dropdown should float and show when needed or if it should take it's own place and always be visible.
	 * @param  String	options.dropDownPosition	The position for the dropdown, can be 'top' or 'bottom'.
	 * @return MultiSelect							The object reference for MultiSelect
	 */
	constructor({datalist = [], multiple = true, expand = false, dropDownPosition = 'bottom'} = {}) {

		this.datalist = datalist;
		this.multiple = multiple;
		this.expand = expand;
		this.dropDownPosition = ['top', 'bottom'].includes(dropDownPosition) ? dropDownPosition : 'bottom';

		this.selectedValues = new Set();
		this.inputName = 'multiselect-' + Math.floor(Math.random() * 10000);
	}

	/**
	 * The main container of the MultiSelect.
	 *
	 * @return HTMLElement	A div that has the entire content.
	 */
	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('multi-select');

		container.innerHTML = `
			<input type="search" placeholder="Search...">
			<div class="options hidden">
				<header>
					<a class="all">All</a>
					<a class="clear">Clear</a>
				</header>
				<div class="list"></div>
				<div class="no-matches NA hidden">No matches found! :(</div>
				<footer class="hidden"></footer>
			</div>
		`;

		const
			options = container.querySelector('.options'),
			search = container.querySelector('input[type=search]');

		if(this.expand) {

			options.classList.remove('hidden');
			container.classList.add('expanded');
		}

		container.classList.add(this.dropDownPosition);

		this.render();

		search.on('click', e => {

			e.stopPropagation();

			if(!container.classList.contains('expanded')) {

				for(const option of document.querySelectorAll('.multi-select .options'))
					option.classList.add('hidden');
			}

			options.classList.remove('hidden');
			this.container.querySelector('input[type=search]').placeholder = 'Search...';
		});

		search.on('dblclick', () => {

			if(!this.expand)
				options.classList.add('hidden');

			search.value = '';
			this.recalculate();
		});

		search.on('keyup', () => this.recalculate());

		options.on('click', e => e.stopPropagation());
		options.querySelector('header .all').on('click', () => this.all());
		options.querySelector('header .clear').on('click', () => this.clear());

		document.body.on('click', () => {

			if(!this.expand)
				options.classList.add('hidden');

			search.value = '';
			this.recalculate();
		});

		return container;
	}

	/**
	 * Update the value of a MultiSelect.
	 * This will also take care of updating the UI and fire any change callbacks if needed.
	 *
	 * @param  Array	values	The array of new values that must match the datalist.
	 */
	set value(values = []) {

		this.selectedValues.clear();

		if(!Array.isArray(values))
			values = [values];

		for(const value of values) {
			if(this.datalist && this.datalist.some(r => r.value == value))
				this.selectedValues.add(value.toString());
		}

		if(this.changeCallback)
			this.changeCallback();

		this.recalculate();
	}

	/**
	 * Get the current value of the MultiSelect.
	 *
	 * @return Array	An array of 'value' properties of the datalist.
	 */
	get value() {
		return Array.from(this.selectedValues);
	}

	/**
	 * Change the disabled state of the MultiSelect.
	 *
	 * @param  boolean value The new state of the disabled property.
	 */
	set disabled(value) {

		this._disabled = value;
		this.render();
	}

	/**
	 * Get the disabled status of the MultiSelect.
	 */
	get disabled() {
		return this._disabled;
	}

	/**
	 * Render the datalist to the MultiSelect.
	 * Call this externally if you have just updated the datalist after object construction.
	 */
	render() {

		this.container.querySelector('input[type=search]').disabled = this.disabled || false;

		const optionList = this.container.querySelector('.options .list');
		optionList.textContent = null;

		if(!this.datalist || !this.datalist.length) {
			optionList.innerHTML = '<div class="NA">No data found... :(</div>';
			return;
		}

		if(this.datalist.length != (new Set(this.datalist.map(x => x.value))).size)
			throw new Error('Invalid datalist format. Datalist values must be unique.');

		for(const row of this.datalist) {

			const
				label = document.createElement('label'),
				input = document.createElement('input'),
				text = document.createElement('div');

			text.classList.add('option-name');
			text.innerHTML = `<span>${row.name}</span>`;

			if(row.subtitle && row.subtitle != '') {

				const subtitle = document.createElement('span');
				subtitle.classList.add('subtitle');

				subtitle.innerHTML = row.subtitle;
				text.appendChild(subtitle);
			}

			input.name = this.inputName;
			input.value = row.value == null ? '' : row.value;
			input.type = this.multiple ? 'checkbox' : 'radio';

			label.appendChild(input);
			label.appendChild(text);

			label.setAttribute('title', row.value);

			input.on('change', () => {

				if(!this.multiple) {
					this.selectedValues.clear();
					this.selectedValues.add(input.value.toString());
				}
				else {
					input.checked ? this.selectedValues.add(input.value.toString()) : this.selectedValues.delete(input.value.toString());
				}

				if(this.changeCallback)
					this.changeCallback();

				this.recalculate();
			});

			row.input = input;
			if(this.disabled)
				input.disabled = true;

			label.on('dblclick', e => {

				e.stopPropagation();

				this.clear();
				label.click();
			});

			optionList.appendChild(label);
		}

		this.recalculate();
	}

	/**
	 * Recalculate shown items from the datalist based on any value in search box and their summary numbers in the footer.
	 */
	recalculate() {

		if(!this.containerElement)
			return;

		const
			search = this.container.querySelector('input[type=search]'),
			options = this.container.querySelector('.options');

		if(!this.datalist && !this.datalist.length)
			return;

		for(const row of this.datalist) {

			row.input.checked = this.selectedValues.has(row.input.value);

			let hide = false;

			if(search.value && !row.name.toLowerCase().trim().includes(search.value.toLowerCase().trim()))
				hide = true;

			row.input.parentElement.classList.toggle('hidden', hide);
			row.input.parentElement.classList.toggle('selected', row.input.checked);
		}

		const
			total = options.querySelectorAll('.list label').length,
			hidden = options.querySelectorAll('.list label.hidden').length,
			selected = options.querySelectorAll('.list input:checked').length,
			firstSelected = options.querySelector('.list label.selected div > span');

		search.placeholder = 'Search...';

		if(firstSelected && options.classList.contains('hidden'))
			search.placeholder = selected > 1 ? `${firstSelected.textContent} and ${selected - 1} more` : firstSelected.textContent;

		const footer = options.querySelector('footer');

		footer.classList.remove('hidden');
		footer.innerHTML = `
			<span>Total: <strong>${total}</strong></span>
			<span>Showing: <strong>${total - hidden}</strong></span>
			<span>Selected: <strong>${selected}</strong></span>
		`;

		options.querySelector('.no-matches').classList.toggle('hidden', total != hidden);

		if(this.changeCallback)
			this.changeCallback();
	}

	/**
	 * Assign a callback to the MultiSelect.
	 *
	 * @param  string	event		The type of event. Only 'change' supported for now.
	 * @param  Function	callback	The callback to call when the selected value in the multiselect changes.
	 */
	on(event, callback) {

		if(event != 'change')
			throw new Page.exception('Only Change event is supported...');

		this.changeCallback = callback;
	}

	/**
	 * Select all inputs of the MultiSelect, if applicable.
	 * May not be applicable if multiple is set to false.
	 */
	all() {

		if(!this.multiple || this.disabled || !this.datalist)
			return;

		this.datalist.map(obj => this.selectedValues.add(obj.value ? obj.value.toString() : ''));

		if(this.changeCallback)
			this.changeCallback();

		this.recalculate();
	}

	/**
	 * Clear the MultiSelect.
	 */
	clear() {

		if(this.disabled)
			return;

		this.selectedValues.clear();

		if(this.changeCallback)
			this.changeCallback();

		this.recalculate();
	}
}

class ObjectRoles {

	constructor(owner, owner_id, allowedTargets = []) {

		this.targets = {
			user: {
				API: 'users/list',
				name_fields: ['first_name', 'middle_name', 'last_name'],
				value_field: 'user_id',
				subtitle: 'email',
				data: [],
				ignore_categories: true,
			},

			role: {
				API: 'roles/list',
				name_fields: ['name'],
				value_field: 'role_id',
				data: [],
			},
		};

		this.owner = owner;
		this.ownerId = owner_id;
		this.allowedTargets = allowedTargets.length ? allowedTargets.filter(x => x in this.targets) : Object.keys(this.targets);
		this.alreadyVisible = [];
	}

	async load() {

		this.data = [];

		const listRequestParams = new URLSearchParams();

		listRequestParams.append('owner', this.owner);
		listRequestParams.append('owner_id', this.ownerId);

		for (const target of this.allowedTargets) {
			listRequestParams.append('target[]', target);
		}

		this.alreadyVisible = await API.call('object_roles/list', listRequestParams.toString());

		for (const target of this.allowedTargets) {

			const data = await API.call(this.targets[target].API);

			this.targets[target].data = [];

			for (const row of data) {

				this.targets[target].data.push({
					name: this.targets[target].name_fields.map(x => row[x]).filter(x => x).join(' '),
					value: row[this.targets[target].value_field || 'id'],
					subtitle: row[this.targets[target].subtitle],
				});
			}
		}

		for (const target in this.targets) {

			this.targets[target].multiSelect = new MultiSelect({
				datalist: this.targets[target].data,
				multiple: false,
				dropDownPosition: 'top',
			});
		}

		this.combine();
		this.container;
		this.shareButton;
	}

	render() {

		if(!this.getContainer)
			this.container;

		const table = this.getContainer.querySelector('.object-roles > table');
		table.innerHTML = null;
		table.appendChild(this.table);
		this.multiSelect.render();
	}

	get container() {

		if(this.getContainer)
			return this.getContainer;

		const container = document.createElement('div');

		container.classList.add('object-roles');

		container.appendChild(this.table);
		container.appendChild(this.form);

		this.getContainer = container;

		return container;
	}

	get form() {

		if(this.submitForm)
			return this.submitForm;

		const form = document.createElement('form');

		const submitButton = document.createElement('button');
		submitButton.type = 'submit';
		submitButton.innerHTML = `<i class="fa fa-paper-plane"></i> Share`;

		this.categorySelect = this.selectDropDown([...MetaData.categories.values()].map(x => {

			return {
				value: x.category_id,
				text: x.name,
			}
		}));

		this.targetSelectDropdown = this.selectDropDown(this.allowedTargets.map(x => {

			return {
				value: x,
				text: x.charAt(0).toUpperCase() + x.slice(1),
			}
		}));

		this.multiSelect = this.targets[this.targetSelectDropdown.value].multiSelect;

		if (this.targets[this.targetSelectDropdown.value].ignore_categories) {

			this.categorySelect.classList.add('hidden');
			this.categorySelect.value = 0;
		}

		else {

			this.targetSelectDropdown.classList.remove('hidden');
			this.categorySelect.value = this.categorySelect.options.length ? this.categorySelect.options[0] : 0;
		}

		this.targetSelectDropdown.addEventListener('change', (e) => {

			this.multiSelect.container.remove();

			this.multiSelect = this.targets[e.target.value].multiSelect;
			form.insertBefore(this.multiSelect.container, submitButton);

			if (this.targets[e.target.value].ignore_categories) {

				this.categorySelect.classList.add('hidden');
				this.categorySelect.value = 0;
			}
			else {
				this.categorySelect.classList.remove('hidden');
				this.categorySelect.value = this.categorySelect.options.length ? this.categorySelect.options[0].value : 0;
			}
		});

		form.appendChild(this.targetSelectDropdown);
		form.appendChild(this.categorySelect);
		form.appendChild(this.multiSelect.container);
		form.appendChild(submitButton);
		form.addEventListener('submit', (e) => this.insert(e));

		this.submitForm = form;

		return form
	}

	selectDropDown(pairedData) {

		this.selectedType = document.createElement('select');

		for (const target of pairedData) {

			const option = document.createElement('option');
			option.value = target.value;
			option.text = target.text;
			this.selectedType.appendChild(option);
		}

		return this.selectedType;
	}

	get shareButton() {

		if (this.button) {

			return this.button;
		}

		const container = document.createElement('div');
		container.classList.add('object-roles');

		const button = document.createElement('button');
		button.classList.add('share-button');
		button.textContent = `Share ${this.owner}`;

		container.appendChild(button);
		this.button = container;


		button.addEventListener('click', () => {

			const heading = this.allowedTargets.length === 1 ?
				this.allowedTargets[0] :
				`${this.allowedTargets.slice(0, -1).join(', ')} or ${this.allowedTargets[this.allowedTargets.length - 1]}.`;

			const dialougeBox = new DialogBox();
			dialougeBox.heading = `Share this ${this.owner} with any ${heading}`;
			dialougeBox.body.appendChild(this.container);
			dialougeBox.show();
		});

		return this.button;
	}

	get table() {

		const table = document.createElement('table');

		table.innerHTML = `
			<thead>
				<tr>
					<th>Shared With</th>
					<th>Category</th>
					<th>Name</th>
					<th class="action">Delete</th>
				</tr>
			</thead>
			<tbody></tbody>
		`;

		const tbody = table.querySelector('tbody');

		for(const row of this.alreadyVisible) {

			const tr = document.createElement('tr');

			tr.innerHTML = `
				<td>${row.target.charAt(0).toUpperCase() + row.target.slice(1)}</td>
				<td>${row.category.charAt(0).toUpperCase() + row.category.slice(1)}</td>
				<td>${row.name}</td>
				<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
			`;

			tbody.appendChild(tr);
			tr.querySelector('.red').addEventListener('click', () => this.delete(row.id));
		}

		if(!this.alreadyVisible.length)
			tbody.innerHTML = '<tr class="NA"><td colspan="4">Not shared with anyone yet! :(</td></tr>'

		return table;
	}

	async insert(e) {

		if (e && e.preventDefault) {
			e.preventDefault();
		}

		if (
			this.alreadyVisible.filter(x =>
				x.owner == this.owner
				&& x.owner_id == this.ownerId
				&& x.target == this.selectedType.value
				&& x.target_id == [...this.multiSelect.selectedValues][0]
				&& x.category_id == (parseInt(this.categorySelect.value) || 0)
			).length) {

			window.alert('Already exists');
			return;
		}

		const
			parameters = {
				owner_id: this.ownerId,
				owner: this.owner,
				target: this.selectedType.value,
				target_id: [...this.multiSelect.selectedValues][0],
				category_id: this.categorySelect.value || null,
			},

			options = {
				method: 'POST',
			};

		await API.call('object_roles/insert', parameters, options);
		await this.load();

		this.render();
	}

	async delete(id) {

		if (!confirm('Are you sure?')) {
			return;
		}

		const
			parameters = {
				id: id,
			},

			options = {
				method: 'POST',
			};

		await API.call('object_roles/delete', parameters, options);
		await this.load();
		this.render();
	}

	combine() {

		this.mapping = {};
		for (const target of this.allowedTargets) {

			for (const row of this.targets[target].data) {

				if (!this.mapping[target]) {
					this.mapping[target] = {};
				}

				this.mapping[target][row.value] = row;
			}
		}

		this.alreadyVisible = this.alreadyVisible.filter(row => row.target_id in this.mapping[row.target]);

		for (const row of this.alreadyVisible) {

			row.name = this.mapping[row.target][row.target_id].name;
			row.category = (MetaData.categories.get(row.category_id) || {name: ''}).name
		}
	}
}

if(typeof Node != 'undefined') {
	Node.prototype.on = window.on = function(name, fn) {
		this.addEventListener(name, fn);
	}
}

Date.nowUTC = function() {

	const today = new Date();

	return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), today.getMinutes(), today.getSeconds())).getTime();
}

Date.prototype.getTimeUTC = function() {
	return new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds())).getTime();
}

MetaData.timeout = 5 * 60 * 1000;

if(typeof window != 'undefined')
	window.onerror = ErrorLogs.send;