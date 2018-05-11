"use strict";

window.addEventListener('DOMContentLoaded', async () => {

	await Page.setup();

	if(!Page.class)
		return;

	window.page = new (Page.class)();
});

class Page {

	static async setup() {

		AJAXLoader.setup();

		await Page.load();

		Page.render();
	}

	static async load() {

		await Account.load();
		await User.load();
		await MetaData.load();

		if(account && account.auth_api) {

			const parameters = new URLSearchParams(window.location.search.slice(1));

			if(parameters.has('access_token') && parameters.get('access_token')) {
				User.logout();
				localStorage.access_token = parameters.get('access_token');
			}
		}
	}

	static render() {

		if(account) {

			if(account.settings.get('hideHeader')) {
				document.querySelector('body > header').classList.add('hidden');
				return;
			}

			if(account.icon)
				document.getElementById('favicon').href = account.icon;

			if(account.logo)
				document.querySelector('body > header .logo img').src = account.logo;

			document.title = account.name;
		}

		const user_name = document.querySelector('body > header .user-name');

		if(user.id) {

			user_name.innerHTML = `<a href="/user/profile/${user.user_id}"><i class="fa fa-user" aria-hidden="true"></i>&nbsp;&nbsp;${user.name}</a>`;
			const search = new GlobalSearch(document.querySelector('body > header .search')).container;
			document.querySelector('body > header .search').appendChild(search);
		}
		document.querySelector('body > header .logout').on('click', () => User.logout());


		Page.navList = [
			{url: '/users', name: 'Users', privilege: 'users', icon: 'fas fa-users'},
			{url: '/dashboards-manager', name: 'Dashboards', privilege: 'dashboards', icon: 'fa fa-newspaper'},
			{url: '/reports', name: 'Reports', privilege: 'queries', icon: 'fa fa-database'},
			{url: '/connections', name: 'Connections', privilege: 'datasources', icon: 'fa fa-server'},
			{url: '/settings', name: 'Settings', privilege: 'administrator', icon: 'fas fa-cog'},
		];

		const nav_container = document.querySelector('body > header nav');

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

		for(const item of document.querySelectorAll('body > header nav a')) {
			if(window.location.pathname.startsWith(new URL(item.href).pathname)) {
				user_name.classList.remove('selected');
				item.classList.add('selected');
			}
		}

		if(window.location.pathname.includes('/user/profile')) {
			Array.from(document.querySelectorAll('body > header nav a')).map(items => items.classList.remove('selected'));
			user_name.querySelector('a').classList.add('selected');
		}
	}

	constructor() {

		this.container = document.querySelector('main');

		this.account = window.account;
		this.user = window.user;
		this.metadata = window.MetaData;

		this.serviceWorker = new Page.serviceWorker(this);
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

	statechange(event) {

		if(event.target.state != 'redundant')
			return;

		setTimeout(() => {

			const message = document.createElement('div');

			message.classList.add('warning', 'site-outdated');

			message.innerHTML = `The site has been updated in the background. Please <a href="">reload</a> the page.`;

			message.querySelector('a').on('click', () => window.location.reload());

			this.page.container.parentElement.insertBefore(message, this.page.container);

		}, 1000);
	}
}

class GlobalSearch {

	constructor(element) {

		this.container = document.createElement('div');
		this.container.classList.add('global-search');

		this.container.innerHTML = `
			<input class="search-input" placeholder="Search...">
			<ul class="hidden"></ul>
		`;

		this.searchList = this.container.querySelector('ul');
		this.setEvents();

		element.appendChild(this.container);
	}

	setEvents() {

		this.searchInput = this.container.querySelector('input');

		document.querySelector('body').on('click', () => {

			this.hideList();
		});

		this.searchInput.on('click', (e) => {

			if(this.searchInput.value == '') {
				this.hideList();
			}
			else {
				this.viewList();
			}
			e.stopPropagation();
		});

		this.searchInput.on('keyup', async (e) => {

			clearTimeout(GlobalSearch.inputTimeout);
			e.stopPropagation();

			if(this.searchInput.value == '') {
				this.hideList();
				return;
			}

			GlobalSearch.inputTimeout = setTimeout( async () => {
				await this.loadList()
			}, 300);

			}
		);

		// this.container.on('keydown', Page.keyUpDownListenter = e => this.searchUpDown(e));

	}

	searchUpDown(e) {

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

	async loadList() {

		this.container.removeEventListener('keydown', Page.keyUpDownListenter);
		this.active_li = this.searchList.querySelector('li');

		const params = {
			text: this.searchInput.value
		};

		this.listElements = await API.call('search/query', params);
		this.viewList();
	}

	set listElements(data) {

		this.searchList.innerHTML = null;

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

	get searchContainer() {

		return this.container;
	}

	viewList() {

		this.searchList.classList.remove('hidden');
	}

	hideList() {

		this.searchList.classList.add('hidden');
	}
}

class Account {

	static async load() {

		let account = null;

		try {
			account = JSON.parse(localStorage.account);
		} catch(e) {}

		if(!account)
			account = await Account.fetch();

		localStorage.account = JSON.stringify(account);

		return window.account = account ? new Account(account) : null;
	}

	static async fetch() {

		try {

			return await API.call('accounts/get');

		} catch(e) {
			return null;
		}
	}

	constructor(account) {

		for(const key in account)
			this[key] = account[key];

		this.settings = new Map;

		if(account.settings && account.settings[0]) {

			for(const key in account.settings[0].value)
				this.settings.set(key, account.settings[0].value[key]);
		}
	}
}

class User {

	static async load() {

		let user = null;

		try {
			user = JSON.parse(atob(localStorage.token.split('.')[1]));
		} catch(e) {}

		return window.user = new User(user);
	}

	static logout(next) {

		const parameters = new URLSearchParams();

		localStorage.clear();

		if(next)
			parameters.set('continue', window.location.pathname + window.location.search);

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

		MetaData.visualizations = new Map(metadata.visualizations.map(v => [v.slug, v]));
		MetaData.datasets = new Map(metadata.datasets.map(d => [d.id, d]));
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
			return User.logout();

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

		if(localStorage.token) {

			if(typeof parameters == 'string')
				parameters += '&token='+localStorage.token;

			else
				parameters.token = localStorage.token;
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
	 * @param  string	form		The id of the form whose elements will be picked.
	 */
	static loadFormData(parameters, form) {

		for(const key of form.keys()) {

			let value = form.get(key).trim();

			if(value && !isNaN(value))
				value = parseInt(value);

			parameters[key] = value;
		}
	}

	static async refreshToken() {

		let getToken = true;

		if(localStorage.token) {

			try {

				const user = JSON.parse(atob(localStorage.token.split('.')[1]));

				if(user.exp && user.exp * 1000 > Date.now())
					getToken = false;

			} catch(e) {}
		}

		if(!localStorage.refresh_token || !getToken)
			return;

		const
			parameters = {
				refresh_token: localStorage.refresh_token
			},
			options = {
				method: 'POST',
			};

		if(account.auth_api && parameters.access_token)
			parameters.access_token = localStorage.access_token;

		const response = await API.call('authentication/refresh', parameters, options);

		localStorage.token = response;

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

		if(typeof date == 'string')
			date = Date.parse(date);

		if(typeof date == 'object' && date)
			date = date.getTime();

		if(!date)
			return '';

		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		};

		return new Intl.DateTimeFormat('en-IN', options).format(date);
	}

	static number(number) {
		return new Intl.NumberFormat('en-IN').format(number);
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

	constructor(report) {

		this.report = report;

		this.setContainer();

		this.setEvents();
		document.querySelector('main').appendChild(this.container);
	}

	setContainer() {

		this.container = document.createElement('div');
		this.container.classList.add('dialog-box-blanket');

		this.container.innerHTML = `
			<section class="dialog-box">
				<header><h3></h3><span class="close"><i class="fa fa-times"></i></span></header>
				<div class="body"></div>
			</section>
		`;

		this.hide();
	}

	setEvents() {

		this.container.querySelector('.dialog-box header span.close').on('click', () => this.hide());

		this.container.querySelector('.dialog-box').on('click', e => e.stopPropagation());

		this.container.on('click', () => this.hide());
	}

	set heading(dialogHeading) {

		const heading = this.container.querySelector('.dialog-box header h3');

		if(typeof dialogHeading == 'object') {

			heading.textContent = null;
			heading.appendChild(dialogHeading);
		}
		else {

			heading.innerHTML = dialogHeading;
		}
	}

	set body(dialogBody) {

		const body = this.container.querySelector('.dialog-box .body');

		if(typeof dialogBody == 'object') {

			body.textContent = null;
			body.appendChild(dialogBody);
		}
		else {

			body.innerHTML = dialogBody;
		}
	}

	hide() {

		this.container.classList.add('hidden');
	}

	show() {

		this.container.classList.remove('hidden');
	}
}

Node.prototype.on = window.on = function(name, fn) {
	this.addEventListener(name, fn);
}

MetaData.timeout = 5 * 60 * 1000;

window.onerror = ErrorLogs.send;
