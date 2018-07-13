"use strict";

if(typeof window != 'undefined') {
	window.addEventListener('DOMContentLoaded', async () => {

		await Page.setup();

		if(!Page.class)
			return;

		window.page = new (Page.class)();
	});
}

class Page {

	static async setup() {

		AJAXLoader.setup();

		await Page.load();

		Page.render();

		Page.setupShortcuts();
	}

	static async load() {

		await IndexedDb.load();
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

					await IndexedDb.instance.set('external_parameters', parameters_);
				}});
			}
		}

		await API.refreshToken();
	}

	static render() {

		const header = document.querySelector('body > header');

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

		Page.navList = [
			{url: '/users', name: 'Users', privilege: 'users', icon: 'fas fa-users'},
			{url: '/dashboards-manager', name: 'Dashboards', privilege: 'dashboards', icon: 'fa fa-newspaper'},
			{url: '/reports', name: 'Reports', privilege: 'reports', icon: 'fa fa-database'},
			{url: '/connections', name: 'Connections', privilege: 'connections', icon: 'fa fa-server'},
			{url: '/tasks', name: 'Tasks', privilege: 'tasks', icon: 'fas fa-tasks'},
			{url: '/settings', name: 'Settings', privilege: 'administrator', icon: 'fas fa-cog'},
		];

		const nav_container = header.querySelector('nav');

		if(window.account && account.settings.get('top_nav_position') == 'left') {

			document.querySelector('.logo-container .left-menu-toggle').classList.remove('hidden');

			nav_container.classList.add('left');
		};

		header.querySelector('.left-menu-toggle').on('click', () => {

			header.querySelector('.left-menu-toggle').classList.toggle('selected');
			nav_container.classList.toggle('show');
			document.querySelector('.nav-blanket').classList.toggle('menu-cover');
		});

		document.querySelector('.nav-blanket').on('click', () => {
			header.querySelector('.left-menu-toggle').classList.toggle('selected');
			nav_container.classList.toggle('show');
			document.querySelector('.nav-blanket').classList.toggle('menu-cover');
		});

		nav_container.classList.remove('hidden');

		header.insertAdjacentHTML('beforeend', `
			<span class="user-name"></span>
			<span class="logout">
				<i class="fa fa-power-off"></i>&nbsp;
				Logout
			</span>
		`);

		const user_name = header.querySelector('.user-name');

		if(user.id) {

			user_name.innerHTML = `<a href="/user/profile/${user.user_id}"><i class="fa fa-user" aria-hidden="true"></i>&nbsp;&nbsp;${user.name}</a>`;
			const search = new GlobalSearch().container;
			search.classList.add('search-header');
			header.insertBefore(search, user_name);
		}
		header.querySelector('.logout').on('click', () => User.logout());

		for(const item of Page.navList) {

			if(!window.user || !user.privileges.has(item.privilege))
				continue;

			nav_container.insertAdjacentHTML('beforeend',`
				<a href='${item.url}'>
					<i class="${item.icon}"></i>&nbsp;
					${item.name}
				</a>
			`);
		}

		for(const item of nav_container.querySelectorAll('a')) {
			if(window.location.pathname.startsWith(new URL(item.href).pathname)) {
				user_name.classList.remove('selected');
				item.classList.add('selected');
			}
		}

		if(window.location.pathname.includes('/user/profile')) {
			Array.from(nav_container.querySelectorAll('a')).map(items => items.classList.remove('selected'));
			user_name.querySelector('a').classList.add('selected');
		}
	}

	static setupShortcuts() {

		document.on('keyup', e => {

			if(!e.altKey)
				return;

			if(['k', 'KeyK'].includes(e.key) && document.querySelector('html > head link[href^="/css/custom.css"]'))
				document.querySelector('html > head link[href^="/css/custom.css"]').remove();
		});
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

class IndexedDb {

	static async load() {

		if(IndexedDb.instance)
			return;

		IndexedDb.instance = new IndexedDb();

		await IndexedDb.instance.open();
	}

	constructor(page) {
		this.page = page;
	}

	open() {

		return new Promise((resolve, reject) => {

			this.request = indexedDB.open('MainDb', 1);

			this.request.onupgradeneeded = e => this.setup(e.target.result);
			this.request.onsuccess = e => {

				this.db = e.target.result;

				this.db.onerror = e => {throw new Page.exception(e);}
				resolve();
			};

			this.request.onerror = reject;
		});
	}

	setup(db) {
		db.createObjectStore('MainStore', {keyPath: 'key'});
	}

	has(key) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore').objectStore('MainStore').get(key);

			request.onsuccess = e => resolve(e.target.result ? true : false);
			request.onerror = e => resolve(false);
		});
	}

	get(key) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore').objectStore('MainStore').get(key);

			request.onsuccess = e => resolve(e.target.result ? e.target.result.value : undefined);
			request.onerror = e => resolve();
		});
	}

	set(key, value) {

		return new Promise((resolve, reject) => {

			const request = this.db.transaction('MainStore', 'readwrite').objectStore('MainStore').put({key, value});

			request.onsuccess = e => resolve(e.result);
			request.onerror = e => reject(e);
		});
	}

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

		if(await IndexedDb.instance.has('account'))
			return await IndexedDb.instance.get('account');

		try {

			await IndexedDb.instance.set('account', await API.call('accounts/get'));

		} catch(e) {
			return null;
		}

		return await IndexedDb.instance.get('account');
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

		const token = await IndexedDb.instance.get('token');

		try {
			user = JSON.parse(atob(token.split('.')[1]));
		} catch(e) {}

		return window.user = new User(user);
	}

	static async logout({next, callback, redirect = true} = {}) {

		const parameters = new URLSearchParams();

		localStorage.clear();

		await IndexedDb.instance.db.transaction('MainStore', 'readwrite').objectStore('MainStore').clear();

		if(next)
			parameters.set('continue', window.location.pathname + window.location.search);

		if(callback)
			await callback();

		if(redirect)
			window.location = '/login?'+parameters.toString();
	}

	constructor(user) {

		for(const key in user)
			this[key] = user[key];

		this.id = this.user_id;
		this.privileges = new UserPrivileges(this);
		this.roles = new UserPrivileges(this);
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
		MetaData.datasets = new Map;
		MetaData.visualizations = new Map;
		MetaData.filterTypes = new Map;
		MetaData.features = new Set;

		if(!user.id)
			return;

		const metadata = await MetaData.fetch();

		MetaData.save(metadata);
	}

	static async fetch() {

		let
			metadata,
			timestamp;

		try {
			({metadata, timestamp} = JSON.parse(localStorage.metadata));
		} catch(e) {}

		if(!timestamp || Date.now() - timestamp > MetaData.timeout) {
			metadata = await API.call('users/metadata');
			localStorage.metadata = JSON.stringify({metadata, timestamp: Date.now()});
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

		MetaData.filterTypes = new Map(metadata.filterTypes.map(x => [x.name.toLowerCase(), x]));
		MetaData.visualizations = new Map(metadata.visualizations.map(v => [v.slug, v]));
		MetaData.datasets = new Map(metadata.datasets.map(d => [d.id, d]));
		MetaData.features = new Map(metadata.features.map(f => [f.feature_id, f]));
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
		catch (e) {
			console.log('Failed to log error', e);
			return;
		}

		ErrorLogs.sending = false;
	}
}

class AJAX {

	static async call(url, parameters, options = {}) {

		AJAXLoader.show();

		parameters = new URLSearchParams(parameters);

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
			throw new API.Exception(e.status, 'API Execution Failed');
		}

		AJAXLoader.hide();

		if(response.status == 401)
			return User.logout({redirect: options.redirectOnLogout});

		return await response.json();
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

		const token = await IndexedDb.instance.get('token');

		if(token) {

			if(typeof parameters == 'string')
				parameters += '&token='+token;

			else
				parameters.token = token;
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

	static async refreshToken() {

		let
			getToken = true,
			token = await IndexedDb.instance.get('token'),
			has_external_parameters = await IndexedDb.instance.has('external_parameters');

		if(!has_external_parameters && Cookies.get('external_parameters')) {

			await IndexedDb.instance.set('external_parameters', JSON.parse(Cookies.get('external_parameters')));
			Cookies.set('external_parameters', '');
		}

		if(Cookies.get('refresh_token')) {

			await IndexedDb.instance.set('refresh_token', Cookies.get('refresh_token'));
			Cookies.set('refresh_token', '');
		}

		if(token) {

			try {

				const user = JSON.parse(atob(token.split('.')[1]));

				if(user.exp && user.exp * 1000 > Date.now())
					getToken = false;

			} catch(e) {}
		}

		if(!(await IndexedDb.instance.has('refresh_token')) || !getToken)
			return;

		const
			parameters = {
				refresh_token: await IndexedDb.instance.get('refresh_token'),
			},
			options = {
				method: 'POST',
				redirectOnLogout: false,
			};

		if(window.account && account.auth_api && Array.isArray(account.settings.get('external_parameters')) && await IndexedDb.instance.get('external_parameters')) {

			const external_parameters = await IndexedDb.instance.get('external_parameters');

			for(const key of account.settings.get('external_parameters')) {

				if(key in external_parameters)
					parameters['ext_' + key] = external_parameters[key];
			}

			parameters.external_parameters = true;
		}

		const response = await API.call('authentication/refresh', parameters, options);

		await IndexedDb.instance.set('token', response);
		Cookies.set('token', response);

		Page.load();
	}
}

API.Exception = class {

	constructor(response) {
		this.status = response.status;
		this.message = response.message;
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

		if(AJAXLoader.timeout)
			clearTimeout(AJAXLoader.timeout);
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

		container.classList.remove('show');

		AJAXLoader.timeout = setTimeout(() => container.classList.add('hidden'), 300);
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
		};

		if(!Format.date.formatter)
			Format.date.formatter = new Intl.DateTimeFormat('en-IN', options);

		if(typeof date == 'string')
			date = Date.parse(date);

		if(typeof date == 'object' && date)
			date = date.getTime();

		if(!date)
			return '';

		return Format.date.formatter.format(date);
	}

	static time(time) {

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		};

		if(!Format.time.formatter)
			Format.time.formatter = new Intl.DateTimeFormat('en-IN', options);

		if(typeof time == 'string')
			time = Date.parse(time);

		if(typeof time == 'object' && time)
			time = time.getTime();

		if(!time)
			return '';

		return Format.time.formatter.format(time);
	}

	static number(number) {

		if(!Format.number.formatter)
			Format.number.formatter = new Intl.NumberFormat('en-IN', {maximumFractionDigits: 2});

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

class Editor {

	constructor(container) {

		this.container = container;
		this.editor = ace.edit(container);

		this.editor.setTheme('ace/theme/monokai');
		this.editor.getSession().setMode('ace/mode/sql');
		this.editor.setFontSize(16);
		this.editor.$blockScrolling = Infinity;
	}

	setAutoComplete(list) {

		this.langTools = ace.require('ace/ext/language_tools');

		this.langTools.setCompleters([{
			getCompletions: (_, __, ___, ____, callback) => callback(null, list),
		}]);

		this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: true,
		});
	}

	get value() {
		return this.editor.getValue();
	}

	set value(value) {
		this.editor.setValue(value || '', 1);
	}
}

class DialogBox {

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

	get body() {

		return this.container.querySelector('.dialog-box .body');
	}

	hide() {

		this.container.classList.add('hidden');
	}

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
		});

		search.on('dblclick', () => {

			if(!this.expand)
				options.classList.add('hidden');
		});

		search.on('keyup', () => this.recalculate());

		options.on('click', e => e.stopPropagation());
		options.querySelector('header .all').on('click', () => this.all());
		options.querySelector('header .clear').on('click', () => this.clear());

		document.body.on('click', () => {

			if(!this.expand)
				options.classList.add('hidden');
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
			input.value = row.value;
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

		if(!this.datalist.length)
			return;

		for(const input of options.querySelectorAll('.list label input')) {

			input.checked = this.selectedValues.has(input.value);

			let hide = false;

			if(search.value && !input.parentElement.textContent.toLowerCase().trim().includes(search.value.toLowerCase().trim()))
				hide = true;

			input.parentElement.classList.toggle('hidden', hide);
			input.parentElement.classList.toggle('selected', input.checked);
		}

		const
			total = options.querySelectorAll('.list label').length,
			hidden = options.querySelectorAll('.list label.hidden').length,
			selected = options.querySelectorAll('.list input:checked').length;

		search.placeholder = `Search... (${selected} selected)`;

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

		this.datalist.map(obj => this.selectedValues.add(obj.value.toString()));

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

if(typeof Node != 'undefined') {
	Node.prototype.on = window.on = function(name, fn) {
		this.addEventListener(name, fn);
	}
}

MetaData.timeout = 5 * 60 * 1000;

if(typeof window != 'undefined')
	window.onerror = ErrorLogs.send;