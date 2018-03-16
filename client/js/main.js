"use strict";

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

		window.account = {APIHost: `https://${window.location.host}:${window.location.hostname == 'localhost' ? '3002' : '3000'}/`}

		try {

			const accounts = await API.call('v2/accounts/list');

			return accounts.filter(a => a.url == window.location.host)[0];

		} catch(e) {
			return null;
		}
	}

	constructor(account) {

		for(const key in account)
			this[key] = account[key];

		this.APIHost = `https://${this.url}:${window.location.hostname == 'localhost' ? '3002' : '3000'}/`;
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

		localStorage.clear();

		const parameters = new URLSearchParams();

		if(next)
			parameters.set('continue', window.location.pathname + window.location.search);

		window.location = '/login?'+parameters.toString();
	}

	constructor(user) {

		for(const key in user)
			this[key] = user[key];

		this.privileges = new UserPrivileges(this);
		this.roles = new UserPrivileges(this);
	}
}

class UserPrivileges extends Set {

	constructor(context) {

		super(context.privileges);

		this.context = context;
	}
}

class UserRoles extends Set {

	constructor(context) {

		super(context.roles);

		this.context = context;
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

		if(!account)
			throw 'Account not found!'

		if(!endpoint.startsWith('v2/authentication'))
			await API.refreshToken();

		if(localStorage.token)
			parameters.token = localStorage.token;

		// If a form id was supplied, then also load the data from that form
		if(options.form)
			API.loadFormData(parameters, options.form);

		endpoint = account.APIHost + endpoint;

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

				if(user.exp && Date.parse(user.exp) > Date.now())
					getToken = false;

			} catch(e) {}
		}

		if(!localStorage.refresh_token || !getToken)
			return;

		const response = await API.call('v2/authentication/refresh', {refresh_token: localStorage.refresh_token});

		localStorage.token = response.token;
		localStorage.metadata = JSON.stringify(response.metadata);

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

	static show(id) {

		for(const section of document.querySelectorAll('main section.section'))
			section.classList.remove('show');

		const container = document.querySelector(`main section.section#${id}`);

		if(container)
			container.classList.add('show');
	}
}

class MetaData {

	static load() {

		MetaData.privileges = new Map;
		MetaData.roles = new Map;
		MetaData.categories = new Map;

		if(!localStorage.metadata)
			return;

		let metadata = null;

		try {
			metadata = JSON.parse(localStorage.metadata);
		} catch(e) {
			return;
		}

		for(const privilege of metadata.privileges || []) {

			privilege.id = privilege.privilege_id;

			MetaData.privileges.set(privilege.id, privilege);
		}

		for(const role of metadata.roles || []) {

			role.id = role.role_id;

			MetaData.roles.set(role.id, role);
		}

		for(const category of metadata.categories || []) {

			category.id = category.category_id;

			MetaData.categories.set(category.id, category);
		}

		return MetaData;
	}
}

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
	}

	static render() {

		if(account && account.icon)
			document.getElementById('favicon').href = account.icon;

		if(account && account.logo)
			document.querySelector('body > header .logo img').src = account.logo;

		if(window.user)
			document.querySelector('body > header .user-name').textContent = user.name;

		document.querySelector('body > header .logout').on('click', () => User.logout());


		Page.navList = [
			{url: '/users', name: 'Users', id: 'user'},
			{url: '/dashboards', name: 'Dashboards', id: 'dashboards'},
			{url: '/reports', name: 'Reports', id: 'queries'},
			{url: '/connections', name: 'Connections', id: 'datasources'},
		];

		const nav_container = document.querySelector('body > header nav');

		for(const item of Page.navList) {

			if(!window.user)
				continue;

			nav_container.insertAdjacentHTML('beforeend',`<a href='${item.url}'>${item.name}</a>`);
		}

		for(const item of document.querySelectorAll('body > header nav a')) {
			if(window.location.pathname.startsWith(new URL(item.href).pathname))
				item.classList.add('selected');
		}
	}
}

class DataSource {

	static async load(force = false) {

		if(DataSource.list && !force)
			return;

		const response = await API.call('v2/reports/report/list');

		DataSource.list = [];
		DataSource.dashboards = new Map;

		for(const report of response || [])
			DataSource.list.push(new DataSource(report));
	}

	constructor(source) {

		for(const key in source)
			this[key] = source[key];

		this.tags = this.tags || '';
		this.tags = this.tags.split(',').filter(a => a.trim());

		this.filters = new Map;
		this.columns = new DataSourceColumns(this);
		this.visualizations = [];

		if(source.filters && source.filters.length)
			this.filters = new Map(source.filters.map(filter => [filter.placeholder, new DataSourceFilter(filter, this)]));

		if(!source.visualizations)
			source.visualizations = [];

		if(!source.visualizations.filter(v => v.type == 'table').length)
			source.visualizations.push({ name: 'Table', visualization_id: 0, type: 'table' });

		this.visualizations = source.visualizations.map(v => new (Visualization.list.get(v.type))(v, this));
		this.postProcessors = new DataSourcePostProcessors(this);
	}

	async fetch(parameters = {}) {

		parameters.query_id = this.query_id;
		parameters.email = user.email;

		for(const filter of this.filters.values()) {
			if(!parameters.hasOwnProperty(filter.placeholder))
				parameters[filter.placeholder] = this.filters.form.elements[filter.placeholder].value;
		}

		let response = null;

		const options = {
			method: 'POST',
		};

		if(this.container.querySelector('pre.warning'))
			this.container.removeChild(this.container.querySelector('pre.warning'));

		try {
			response = await API.call('v2/reports/engine/report', parameters, options);
		}

		catch(e) {

			this.container.insertAdjacentHTML('beforeend', `
				<pre class="warning">${e.message}</pre>
			`);

			response = {};
		}

		if(parameters.download)
			return response;

		this.originalResponse = response;

		this.container.querySelector('.share-link input').value = this.link;

		this.columns.update();
		this.postProcessors.update();

		this.columns.render();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('section');

		const container = this.containerElement;

		container.classList.add('data-source');

		container.innerHTML = `
			<header>
				<h2 title="${this.name}"><i class="fa fa-chart-line"></i>&nbsp; ${this.name}</h2>
				<button class="filters-toggle"><i class="fa fa-filter"></i>&nbsp; Filters</button>
				<button class="description-toggle" title="Description">&nbsp;<i class="fa fa-info"></i>&nbsp;</button>
				<button class="share-link-toggle" title="Share Report"><i class="fa fa-share-alt"></i></button>
				<button class="download" title="Download CSV"><i class="fa fa-download"></i></button>
				<button class="edit" title="Edit Report"><i class="fas fa-pencil-alt"></i></button>
			</header>
			<form class="filters form toolbar hidden"></form>
			<div class="columns"></div>
			<div class="description hidden">
				<div class="body">${this.description}</div>
				<div class="footer">
					<span>
						<span class="NA">Role:</span>
						<span>${this.roles || ''}</span>
					</span>
					<span>
						<span class="NA">Added On:</span>
						<span>${Format.date(this.created_at)}</span>
					</span>
					<span class="right">
						<span class="NA">Added By:</span>
						<span>${this.added_by || ''}</span>
					</span>
					<span>
						<span class="NA">Requested By:</span>
						<span>${this.requested_by || ''}</span>
					</span>
				</div>
			</div>
			<div class="share-link hidden">
				<input type="url" value="${this.link}" readonly>
			</div>
		`;

		this.filters.form = container.querySelector('.filters');

		container.querySelector('.filters-toggle').on('click', () => {
			container.querySelector('.filters').classList.toggle('hidden');
			container.querySelector('.filters-toggle').classList.toggle('selected');
		});

		container.querySelector('.description-toggle').on('click', () => {
			container.querySelector('.description').classList.toggle('hidden');
			container.querySelector('.description-toggle').classList.toggle('selected');
		});

		container.querySelector('.share-link-toggle').on('click', () => {
			container.querySelector('.share-link').classList.toggle('hidden');
			container.querySelector('.share-link-toggle').classList.toggle('selected');
			container.querySelector('.share-link input').select();
		});

		container.querySelector('.download').on('click', () => this.download());
		container.querySelector('.edit').on('click', () => window.location = `/reports/${this.query_id}`);

		this.filters.form.on('submit', e => this.visualizations.selected.load(e));

		for(const filter of this.filters.values())
			this.filters.form.appendChild(filter.label);

		this.filters.form.insertAdjacentHTML('beforeend', `
			<label class="right">
				<button type="reset">
					<i class="fa fa-undo"></i>&nbsp; Reset
				</button>
			</label>
			<label>
				<button type="submit">
					<i class="fa fa-sync"></i>&nbsp; Submit
				</button>
			</label>
		`);

		if(this.visualizations.length) {

			const select = document.createElement('select');

			select.classList.add('change-visualization')

			for(const v of this.visualizations)
				select.insertAdjacentHTML('beforeend', `<option value="${v.visualization_id}">${v.name}</option>`);

			select.on('change', async () => {

				container.removeChild(container.querySelector('.visualization'));

				this.visualizations.selected = this.visualizations.filter(v => v.id == select.value)[0];

				container.appendChild(this.visualizations.selected.container);

				await this.visualizations.selected.load();
			});

			this.visualizations.selected = this.visualizations.filter(v => v.id == select.value)[0];

			if(this.visualizations.length > 1)
				container.querySelector('header').appendChild(select);

			if(this.visualizations.selected)
				container.appendChild(this.visualizations.selected.container);
		}

		if(!this.filters.size)
			container.querySelector('.filters-toggle').classList.add('hidden');

		container.querySelector('header').insertBefore(this.postProcessors.container, container.querySelector('.description-toggle'));

		return container;
	}

	get response() {

		if(!this.originalResponse.data)
			return [];

		let response = [];

		this.originalResponse.groupedAnnotations = new Map;

		for(const _row of this.originalResponse.data) {

			const row = new DataSourceRow(_row, this);

			if(!row.skip)
				response.push(row);
		}

		if(this.postProcessors.selected)
			response = this.postProcessors.selected.processor(response);

		if(response.length && this.columns.sortBy && response[0].has(this.columns.sortBy.key)) {
			response.sort((a, b) => {

				const
					first = a.get(this.columns.sortBy.key).toString().toLowerCase(),
					second = b.get(this.columns.sortBy.key).toString().toLowerCase();

				let result = 0;

				if(!isNaN(first) && !isNaN(second))
					result = first - second;

				else if(first < second)
					result = -1;

				else if(first > second)
					result = 1;

				if(!this.columns.sortBy.sort)
					result *= -1;

				return result;
			});
		}

		return response;
	}

	async download() {

		const response = await this.fetch({download: 1});

		let str = [];

		for (let i = 0; i < response.length; i++) {

			const line = [];

			for(const index in response[i])
				line.push(JSON.stringify(String(response[i][index])));

			str.push(line.join());
		}

		str = Object.keys(response.data[0]).join() + '\r\n' + str.join('\r\n');

		const
			a = document.createElement('a'),
			blob = new Blob([str], {type: 'application\/octet-stream'}),
			fileName = [
				this.name,
			];

		if(this.filters.has('Start Date'))
			fileName.push(this.filters.form.elements[this.filters.get('Start Date').placeholder].value);

		if(this.filters.has('End Date'))
			fileName.push(this.filters.form.elements[this.filters.get('End Date').placeholder].value);

		if(fileName.length == 1)
			fileName.push(new Intl.DateTimeFormat('en-IN', {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}).format(new Date));

		a.href = window.URL.createObjectURL(blob);
		a.download = fileName.join(' - ') + '.csv';
		a.click();
	}

	get link() {

		const link = window.location.origin + '/report/' + this.query_id;

		const parameters = new URLSearchParams();

		for(const [_, filter] of this.filters) {
			if(this.filters.form)
				parameters.set(filter.placeholder, this.filters.form.elements[filter.placeholder].value);
		}

		return link + '?' + parameters.toString();
	}
}

class DataSourceRow extends Map {

	constructor(row, source) {

		super();

		for(const key in row)
			this.set(key, row[key]);

		this.source = source;

		if(!row) {
			this.annotations = new Set();
			return;
		}

		this.clear();

		const
			columnsList = this.source.columns.list,
			columnKeys = [...columnsList.keys()];

		for(const [key, column] of columnsList) {

			if(column.formula) {

				let formula = column.formula;

				for(const column of columnsList.values()) {

					if(!formula.includes(column.key))
						continue;

					let value = parseFloat(row[column.key]);

					if(isNaN(value))
						value = `'${row[column.key]}'` || '';

					formula = formula.replace(new RegExp(column.key, 'gi'), value);
				}

				try {

					row[key] = eval(formula);

					if(!isNaN(parseFloat(row[key])))
						row[key] = parseFloat(row[key]);

				} catch(e) {
					row[key] = null;
				}
			}

			if(column.filtered) {

				if(!row[key])
					this.skip = true;

				if(!DataSourceColumn.searchTypes[parseInt(column.searchType) || 0].apply(column.searchQuery, row[key] === null ? '' : row[key]))
					this.skip = true;
			}

			this.set(key, row[key] || '');
		}

		// Sort the row by position of their columns in the source's columns map
		const values = [...this.entries()].sort((a, b) => columnKeys.indexOf(a[0]) - columnKeys.indexOf(b[0]));

		this.clear();

		for(const [key, value] of values)
			this.set(key, value);

		this.annotations = new Set();
	}
}

class DataSourceColumns extends Map {

	constructor(source) {

		super();

		this.source = source;
	}

	update() {

		if(!this.source.originalResponse.data || !this.source.originalResponse.data.length)
			return;

		for(const column in this.source.originalResponse.data[0]) {
			if(!this.has(column))
				this.set(column, new DataSourceColumn(column, this.source));
		}
	}

	render() {

		const container = this.source.container.querySelector('.columns');

		container.textContent = null;

		for(const column of this.values())
			container.appendChild(column.container);
	}

	get list() {

		const result = new Map;

		for(const [key, column] of this) {

			if(!column.disabled)
				result.set(key, column);
		}

		return result;
	}
}

class DataSourceColumn {

	constructor(column, source) {

		DataSourceColumn.colors = [
			'#8595e1',
			'#ef6692',
			'#d6bcc0',
			'#ffca05',
			'#8dd593',
			'#ff8b75',
			'#2a0f54',
			'#d33f6a',
			'#f0b98d',
			'#6c54b5',
			'#bb7784',
			'#b5bbe3',
			'#0c8765',
			'#ef9708',
			'#1abb9c',
			'#9da19c',
		];

		DataSourceColumn.searchTypes = [
			{
				name: 'Contains',
				apply: (q, v) => v.toString().toLowerCase().includes(q.toString().toLowerCase()),
			},
			{
				name: 'Not Contains',
				apply: (q, v) => !v.toString().toLowerCase().includes(q.toString().toLowerCase()),
			},
			{
				name: '=',
				apply: (q, v) => v.toString().toLowerCase() == q.toString().toLowerCase(),
			},
			{
				name: '!=',
				apply: (q, v) => v.toString().toLowerCase() != q.toString().toLowerCase(),
			},
			{
				name: '>',
				apply: (q, v) => v > q,
			},
			{
				name: '<',
				apply: (q, v) => v < q,
			},
			{
				name: '>=',
				apply: (q, v) => v >= q,
			},
			{
				name: '<=',
				apply: (q, v) => v <= q,
			},
			{
				name: 'Regular Expression',
				apply: (q, v) => q.toString().match(new RegExp(q, 'i')),
			},
		];

		DataSourceColumn.accumulationTypes = [
			{
				name: 'sum',
				apply: (rows, column) => Format.number(rows.reduce((c, v) => c + parseFloat(v.get(column)), 0)),
			},
			{
				name: 'average',
				apply: (rows, column) => Format.number(rows.reduce((c, v) => c + parseFloat(v.get(column)), 0) / rows.length),
			},
			{
				name: 'max',
				apply: (rows, column) => Format.number(Math.max(...rows.map(r => r.get(column)))),
			},
			{
				name: 'min',
				apply: (rows, column) => Format.number(Math.min(...rows.map(r => r.get(column)))),
			},
			{
				name: 'distinct',
				apply: (rows, column) => Format.number(new Set(rows.map(r => r.get(column))).size),
			},
		];

		this.key = column;
		this.source = source;
		this.name = this.key.split('_').map(w => w.trim()[0].toUpperCase() + w.trim().slice(1)).join(' ');
		this.disabled = 0;
		this.color = DataSourceColumn.colors[this.source.columns.size];
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('div'),
			searchTypes = DataSourceColumn.searchTypes.map((type, i) => `<option value="${i}">${type.name}</option>`).join('');

		container.classList.add('column');

		container.innerHTML = `
			<span class="color" style="background: ${this.color}"></span>
			<span class="name">${this.name}</span>

			<div class="blanket hidden">
				<form class="block form">

					<h3>Column Properties</h3>

					<label>
						<span>Name</span>
						<input type="text" name="name">
					</label>

					<label>
						<span>Key</span>
						<input type="text" name="key" disabled readonly>
					</label>

					<label>
						<span>Search</span>
						<div class="search">
							<select name="searchType">
								${searchTypes}
							</select>
							<input type="search" name="searchQuery">
						</div>
					</label>

					<label>
						<span>Sort</span>
						<select name="sort">
							<option value="-1">None</option>
							<option value="0">Descending</option>
							<option value="1">Ascending</option>
						</select>
					</label>

					<label>
						<span>Disabled</span>
						<select name="disabled">
							<option value="0">No</option>
							<option value="1">Yes</option>
						</select>
					</label>

					<label>
						<span>Formula</span>
						<input type="text" name="formula">
						<small></small>
					</label>

					<label>
						<input type="Submit" value="Submit">
					</label>
				</form>
			</div>
		`;

		this.blanket = container.querySelector('.blanket');
		this.form = container.querySelector('form');

		this.form.elements.formula.on('keyup', async () => {

			if(this.formulaTimeout)
				clearTimeout(this.formulaTimeout);

			this.formulaTimeout = setTimeout(() => this.validateFormula(), 200);
		});

		this.form.on('submit', async e => this.save(e));

		this.blanket.on('click', () => this.blanket.classList.add('hidden'));
		this.form.on('click', e => e.stopPropagation());

		container.querySelector('.name').on('click', async () => {

			this.disabled = !this.disabled;

			this.source.columns.render();

			await this.update();
		});

		return container;
	}

	edit() {

		for(const element of this.form.elements) {
			if(this.hasOwnProperty(element.name))
				element.value = this[element.name];
		}

		if(this.source.columns.sortBy != this)
			this.form.elements.sort.value = -1;

		this.blanket.classList.remove('hidden');
		this.source.container.querySelector('.columns').classList.remove('hidden');

		this.validateFormula();

		this.form.elements.name.focus();
	}

	async save(e) {

		if(e)
			e.preventDefault();

		this.validateFormula();

		for(const element of this.form.elements)
			this[element.name] = isNaN(element.value) ? element.value || null : element.value == '' ? null : parseFloat(element.value);

		this.filtered = this.searchQuery !== null;

		if(this.form.elements.sort.value >= 0)
			this.source.columns.sortBy = this;

		await this.update();
	}

	async update() {

		this.container.querySelector('.name').textContent = this.name;

		this.blanket.classList.add('hidden');

		this.container.classList.toggle('disabled', this.disabled);
		this.container.classList.toggle('filtered', this.filtered ? true : false);
		this.container.classList.toggle('error', this.form.elements.formula.classList.contains('error'));

		this.source.columns.render();
		await this.source.visualizations.selected.render();
	}

	validateFormula() {

		let formula = this.form.elements.formula.value;

		for(const column of this.source.columns.values()) {

			if(formula.includes(column.key))
				formula = formula.replace(new RegExp(column.key, 'gi'), 1);
		}

		try {
			eval(formula);
		}

		catch(e) {

			this.form.elements.formula.classList.add('error');
			this.form.elements.formula.parentElement.querySelector('small').textContent = e.message;

			return;
		}

		this.form.elements.formula.classList.remove('error');
		this.form.elements.formula.parentElement.querySelector('small').innerHTML = '&nbsp;';
	}

	setDragAndDrop() {

		const container = this.container;

		container.setAttribute('draggable', 'true');

		container.on('dragstart', e => {
			this.source.columns.beingDragged = this;
			e.effectAllowed = 'move';
			container.classList.add('being-dragged');
			this.source.container.querySelector('.columns').classList.add('being-dragged');
		});

		container.on('dragend', () => {
			container.classList.remove('being-dragged');
			this.source.container.querySelector('.columns').classList.remove('being-dragged');
		});

		container.on('dragenter', e => {
			container.classList.add('drag-enter');
		});

		container.on('dragleave', () =>  {
			container.classList.remove('drag-enter');
		});

		// To make the targate droppable
		container.on('dragover', e => e.preventDefault());

		container.on('drop', e => {

			container.classList.remove('drag-enter');

			if(this.source.columns.beingDragged == this)
				return;

			this.source.columns.delete(this.source.columns.beingDragged.key);

			const columns = [...this.source.columns.values()];

			this.source.columns.clear();

			for(const column of columns) {

				if(column == this)
					this.source.columns.set(this.source.columns.beingDragged.key, this.source.columns.beingDragged);

				this.source.columns.set(column.key, column);
			}

			this.source.visualizations.selected.render();
			this.source.columns.render();
		});
	}

	get search() {

		if(this.searchContainer)
			return this.searchContainer;

		const
			container = this.searchContainer = document.createElement('th'),
			searchTypes = DataSourceColumn.searchTypes.map((type, i) => `<option value="${i}">${type.name}</option>`).join('');

		container.innerHTML = `
			<div>
				<select class="search-type">${searchTypes}</select>
				<input type="search" class="query" placeholder="${this.name}">
			</div>
		`;

		const
			select = container.querySelector('.search-type'),
			query = container.querySelector('.query');

		select.on('change', () => {
			this.searchType = select.value;
			this.searchQuery = query.value;
			this.filtered = this.searchQuery !== null && this.searchQuery !== '';
			this.accumulation.run();
			this.source.visualizations.selected.render();
			setTimeout(() => select.focus());
		});

		query.on('keyup', () => {
			this.searchType = select.value;
			this.searchQuery = query.value;
			this.filtered = this.searchQuery !== null && this.searchQuery !== '';
			this.accumulation.run();
			this.source.visualizations.selected.render();
			setTimeout(() => query.focus());
		});

		return container;
	}

	get accumulation() {

		if(this.accumulationContainer)
			return this.accumulationContainer;

		const
			container = this.accumulationContainer = document.createElement('th'),
			accumulationTypes = DataSourceColumn.accumulationTypes.map((type, i) => `
				<option>${type.name}</option>
			`).join('');

		container.innerHTML = `
			<div>
				<select>
					<option>&#402;</option>
					${accumulationTypes}
				</select>
				<span class="result"></span>
			</div>
		`;

		const
			select = container.querySelector('select'),
			result = container.querySelector('.result');

		select.on('change', () => container.run());

		container.run = () => {

			const
				data = this.source.response,
				accumulation = DataSourceColumn.accumulationTypes.filter(a => a.name == select.value);

			if(select.value && accumulation.length) {

				const value = accumulation[0].apply(data, this.key);

				result.textContent = value == 'NaN' ? '' : value;
			}

			else result.textContent = '';
		}

		return container;
	}

	get heading() {

		if(this.headingContainer)
			return this.headingContainer;

		const container = this.headingContainer = document.createElement('th');

		container.classList.add('heading');

		container.innerHTML = `
			<span class="name">${this.name}</span>
			<span class="sort"><i class="fa fa-sort"></i></span>
		`;

		container.on('click', () => {
			this.source.columns.sortBy = this;
			this.sort = !this.sort;
			this.source.visualizations.selected.render();
		});

		return container;
	}
}

class DataSourceFilter {

	static setup() {

		DataSourceFilter.types = {
			1: 'text',
			0: 'number',
			2: 'date',
			3: 'month',
			4: 'city',
		};
	}

	constructor(filter, source) {

		for(const key in filter)
			this[key] = filter[key];

		this.source = source;
	}

	get label() {

		if(this.labelContainer)
			return this.labelContainer;

		this.labelContainer = document.createElement('label');

		let input = document.createElement('input');

		input.type = DataSourceFilter.types[this.type];
		input.name = this.placeholder;

		if(input.name.toLowerCase() == 'sdate' || input.name.toLowerCase() == 'edate')
			input.max = new Date().toISOString().substring(0, 10);

		input.value = this.default_value;

		if(!isNaN(parseFloat(this.offset))) {

			if(DataSourceFilter.types[this.type] == 'date')
				input.value = new Date(Date.now() + this.offset * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

			if(DataSourceFilter.types[this.type] == 'month') {
				const date = new Date();
				input.value = new Date(Date.UTC(date.getFullYear(), date.getMonth() + this.offset, 1)).toISOString().substring(0, 7);
			}
		}

		if(this.dataset && DataSource.datasets && DataSource.datasets.has(this.dataset)) {

			input = document.createElement('select');
			input.name = this.placeholder;

			input.insertAdjacentHTML('beforeend', `<option value="">All</option>`);

			for(const row of DataSource.datasets.get(this.dataset))
				input.insertAdjacentHTML('beforeend', `<option value="${row.value}">${row.name}</option>`);
		}

		this.labelContainer.innerHTML = `<span>${this.name}<span>`;

		this.labelContainer.appendChild(input);

		return this.labelContainer;
	}
}

class DataSourcePostProcessors {

	constructor(source) {

		this.source = source;

		this.list = new Map;

		for(const [name, processor] of DataSourcePostProcessors.processors)
			this.list.set(name, new processor(this.source));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const
			container = this.containerElement = document.createDocumentFragment(),
			processors = document.createElement('select');

		processors.classList.add('postprocessors', 'hidden');

		for(const [key, processor] of this.list) {

			processors.insertAdjacentHTML('beforeend', `<option value="${key}">${processor.name}</option>`);

			container.appendChild(processor.container);
		}

		processors.on('change', () => {

			this.selected = this.list.get(processors.value);

			for(const [key, processor] of this.list)
				processor.container.classList.toggle('hidden', key == 'Orignal' || key != processors.value);

			this.source.visualizations.selected.render();
		});

		container.appendChild(processors);


		return container;
	}

	update() {
		this.source.container.querySelector('.postprocessors').classList.toggle('hidden', !this.source.columns.has('timing'));
	}
}

class DataSourcePostProcessor {

	constructor(source) {
		this.source = source;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('select');

		container.classList.add('hidden');

		for(const [value, name] of this.domain)
			container.insertAdjacentHTML('beforeend', `<option value="${value}">${name}</option>`);

		container.on('change', () => this.source.visualizations.selected.render());

		return container;
	}
}

DataSourcePostProcessors.processors = new Map;

DataSourcePostProcessors.processors.set('Orignal', class extends DataSourcePostProcessor {

	get name() {
		return 'No Filter';
	}

	get domain() {
		return new Map();
	}

	processor(response) {
		return response;
	}
});

DataSourcePostProcessors.processors.set('Weekday', class extends DataSourcePostProcessor {

	get name() {
		return 'Weekday';
	}

	get domain() {
		return new Map([
			[0, 'Sunday'],
			[1, 'Monday'],
			[2, 'Tuesday'],
			[3, 'Wednesday'],
			[4, 'Thursday'],
			[5, 'Friday'],
			[6, 'Saturday'],
		]);
	}

	processor(response) {
		return response.filter(r => new Date(r.get('timing')).getDay() == this.container.value)
	}
});

DataSourcePostProcessors.processors.set('CollapseTo', class extends DataSourcePostProcessor {

	get name() {
		return 'Collapse To';
	}

	get domain() {

		return new Map([
			['week', 'Week'],
			['month', 'Month'],
		]);
	}

	processor(response) {

		const result = new Map;

		for(const row of response) {

			let period;

			const periodDate = new Date(row.get('timing'));

			// Week starts from monday, not sunday
			if(this.container.value == 'week')
				period = periodDate.getDay() ? periodDate.getDay() - 1 : 6;

			else if(this.container.value == 'month')
				period = periodDate.getDate() - 1;

			const timing = new Date(Date.parse(row.get('timing')) - period * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

			if(!result.has(timing)) {

				result.set(timing, new DataSourceRow(null, this.source));

				let newRow = result.get(timing);

				for(const key of row.keys())
					newRow.set(key, 0);
			}

			const newRow = result.get(timing);

			for(const [key, value] of row) {

				if(!isNaN(value))
					newRow.set(key, newRow.get(key) + parseFloat(value));

				else newRow.set(key, value);
			}

			newRow.set('timing', row.get('timing'));

			// Copy over any annotations from the old row
			for(const annotation of row.annotations) {
				annotation.row = newRow;
				newRow.annotations.add(annotation);
			}
		}

		return Array.from(result.values());
	}
});

DataSourcePostProcessors.processors.set('RollingAverage', class extends DataSourcePostProcessor {

	get name() {
		return 'Rolling Average';
	}

	get domain() {

		return new Map([
			[7, '7 Days'],
			[14, '14 Days'],
			[30, '30 Days'],
		]);
	}

	processor(response) {

		const
			result = new Map,
			copy = new Map;

		for(const row of response)
			copy.set(Date.parse(row.get('timing')), row);

		for(const [timing, row] of copy) {

			if(!result.has(timing)) {

				result.set(timing, new DataSourceRow(null, this.source));

				let newRow = result.get(timing);

				for(const key of row.keys())
					newRow.set(key, 0);
			}

			const newRow = result.get(timing);

			for(let i = 0; i < this.container.value; i++) {

				const element = copy.get(timing - i * 24 * 60 * 60 * 1000);

				if(!element)
					continue;

				for(const [key, value] of newRow)
					newRow.set(key,  value + (element.get(key) / this.container.value));
			}

			newRow.set('timing', row.get('timing'));

			// Copy over any annotations from the old row
			for(const annotation of row.annotations) {
				annotation.row = newRow;
				newRow.annotations.add(annotation);
			}
		}

		return Array.from(result.values());
	}
});

DataSourcePostProcessors.processors.set('RollingSum', class extends DataSourcePostProcessor {

	get name() {
		return 'Rolling Sum';
	}

	get domain() {

		return new Map([
			[7, '7 Days'],
			[14, '14 Days'],
			[30, '30 Days'],
		]);
	}

	processor(response) {

		const
			result = new Map,
			copy = new Map;

		for(const row of response)
			copy.set(Date.parse(row.get('timing')), row);

		for(const [timing, row] of copy) {

			if(!result.has(timing)) {

				result.set(timing, new DataSourceRow(null, this.source));

				let newRow = result.get(timing);

				for(const key of row.keys())
					newRow.set(key, 0);
			}

			const newRow = result.get(timing);

			for(let i = 0; i < this.container.value; i++) {

				const element = copy.get(timing - i * 24 * 60 * 60 * 1000);

				if(!element)
					continue;

				for(const [key, value] of newRow)
					newRow.set(key,  value + element.get(key));
			}

			newRow.set('timing', row.get('timing'));

			// Copy over any annotations from the old row
			for(const annotation of row.annotations) {
				annotation.row = newRow;
				newRow.annotations.add(annotation);
			}
		}

		return Array.from(result.values());
	}
});

class Visualization {

	constructor(visualization, source) {

		for(const key in visualization)
			this[key] = visualization[key];

		this.id = this.visualization_id;

		this.source = source;
	}
}

Visualization.list = new Map;
Visualization.animationDuration = 750;

Visualization.list.set('table', class Table extends Visualization {

	constructor(visualization, source) {

		super(visualization, source);

		this.rowLimit = 40;
		this.rowLimitMultiplier = 1.75;
	}

	async load(e) {

		if(e)
			e.preventDefault();

		this.container.querySelector('.container').innerHTML = `
			<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
		`;

		await this.source.fetch();

		this.render();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('section');

		container.classList.add('visualization', 'table');

		container.innerHTML = `
			<div class="container overflow">
				<div class="blanket"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
			<div id="row-count"></div>
		`;

		return container;
	}

	render() {

		const
			container = this.container.querySelector('.container'),
			rows = this.source.response;

		container.textContent = null;

		const
			table = document.createElement('table'),
			thead = document.createElement('thead'),
			search = document.createElement('tr'),
			accumulation = document.createElement('tr'),
			headings = document.createElement('tr');

		search.classList.add('search');
		accumulation.classList.add('accumulation');

		for(const column of this.source.columns.list.values()) {

			search.appendChild(column.search);
			accumulation.appendChild(column.accumulation);
			headings.appendChild(column.heading);
		}

		thead.appendChild(search);
		thead.appendChild(accumulation);
		thead.appendChild(headings);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');

		for(const [position, row] of rows.entries()) {

			if(position > this.rowLimit)
				break;

			const tr = document.createElement('tr');

			for(const [key, column] of this.source.columns.list) {

				const td = document.createElement('td');

				td.textContent = row.get(key);

				tr.appendChild(td);
			}

			tr.on('click', () => tr.classList.toggle('selected'));

			tbody.appendChild(tr);
		}

		if(rows.length > this.rowLimit) {

			const tr = document.createElement('tr');

			tr.classList.add('show-rows');

			tr.innerHTML = `
				<td colspan="${this.source.columns.list.size}">
					<i class="fa fa-angle-down"></i>
					<span>Show ${parseInt(this.rowLimit * this.rowLimitMultiplier - this.rowLimit)} more rows</span>
					<i class="fa fa-angle-down"></i>
				</td>
			`;

			tr.on('click', () => {
				this.rowLimit *= this.rowLimitMultiplier;
				this.source.visualizations.selected.render();
			});

			tbody.appendChild(tr);
		}

		if(!rows || !rows.length)
			table.insertAdjacentHTML('beforeend', `<caption class="NA">${this.source.originalResponse.message || 'No rows found! :('}</caption>`);

		table.appendChild(tbody);
		container.appendChild(table);

		this.container.querySelector('#row-count').innerHTML = `
			<span>
				<span class="label">Showing:</span>
				<span title="Number of rows currently shown on screen">
					${Format.number(Math.min(this.rowLimit, rows.length))}
				</span>
			</span>
			<span>
				<span class="label">Filtered:</span>
				<span title="Number of rows that match any search or grouping criterion">
					${Format.number(rows.length)}
				</span>
			</span>
			<span>
				<span class="label">Total:</span>
				<span title="Total number of rows in the dataset">
					${Format.number(this.source.originalResponse.data ? this.source.originalResponse.data.length : 0)}
				</span>
			</span>
		`;
	}
});

Visualization.list.set('line', class Line extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'line');
		container.innerHTML = `
			<div id="line-${this.source.query_id}" class="container">
				<div class="blanket"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(e) {

		e && e.preventDefault && e.preventDefault();

		this.container.querySelector('.container').innerHTML = `<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>`;

		await this.source.fetch();

		this.render();
	}

	render() {

		const
			series = {},
			rows = this.source.response;

		for(const row of rows) {

			row.date = Format.date(row.get('timing'));

			for(const [key, value] of row) {

				if(key == 'timing')
					continue;

				if(!series[key]) {
					series[key] = {
						label: this.source.columns.get(key).name,
						color: this.source.columns.get(key).color,
						data: []
					};
				}

				series[key].data.push({
					date: row.date,
					x: null,
					y: value,
				});
			}
		}

		this.draw({
			series: Object.values(series),
			rows: rows,
			divId: `#line-${this.source.query_id}`,
			chart: {},
		});
	}

	draw(obj) {

		const rows = obj.rows;

		d3.selectAll(obj.divId)
			.on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null);

		var chart = {};

		var data = obj.series;

		var tickNumber = 5;

		// Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 40, left: 50},
			width = (this.container.clientWidth || 600) - margin.left - margin.right,
			height = (obj.chart.height || 500) - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangePoints([0, width], 0.1, 0);

		var y = d3.scale.linear().range([height, margin.top]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		//Defining yAxis location at left the axes
		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.orient("left");

		//graph type line and
		var line = d3.svg.line()
			.x(d => x(d.date))
			.y(d => y(d.y));

		var disbleHover = false;

		var rawData = JSON.parse(JSON.stringify(data));
		var series = data,
			zoom = true;

		//chart function to create chart
		chart.plot = (resize) => {

			//Empty the container before loading
			d3.selectAll(obj.divId+" > *").remove();

			//Adding chart and placing chart at specific location using translate
			var svg = d3.select(obj.divId)
				.append("svg")
				.append("g")
				.attr("class", "chart")
				.attr("transform", `translate(${margin.left}, ${margin.top})`);

			// Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", width / 2)
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", (width / 2) - 2)
				.attr("y", -10)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			d3.select(obj.divId + " > svg > g > g[class='resetZoom']")
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", 4)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			//Click on reset zoom function
			d3.select(obj.divId+" > svg > g > g[class='resetZoom']").on("mousedown", function () {
				data.forEach((d, i) => d.data = rawData[i].data);
				zoom = true;
				chart.plot()
			});

			//check if the data is present or not
			if(!rows.length) {

				return svg.append('g').attr('class','noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y",  (height / 2))
					.attr("text-anchor", "middle")
					.attr("class", "NA")
					.attr("fill", "#999")
					.text(this.source.originalResponse.message || 'No data found! :(');
			}

			//setting the upper an d lower limit in x - axis
			x.domain(series[0].data.map(d => d.date));

			//var mult = Math.max(1, Math.floor(width / x.domain().length));
			x.rangePoints([0, width], 0.1, 0);

			y.domain([
				d3.min(series, c => d3.min(c.data, v => Math.floor(v.y))),
				d3.max(series, c => d3.max(c.data, v => Math.ceil(v.y)))
			]);

			if(window.innerWidth <= 768)
				tickNumber = 2;

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter((d, i) => !(i % tickInterval));

			xAxis.tickValues(ticks);
			yAxis.innerTickSize(-width);

			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis);

			//Appending line in chart
			svg.selectAll(".city")
				.data(series)
				.enter().append("g")
				.attr("class", "city")
				.append("path")
				.attr("class", "line")
				.attr("d", d => line(d.data))
				.style("stroke", d => d.color);

			// Selecting all the paths
			var path = svg.selectAll("path");

			if(!resize) {
				path[0].forEach(path => {
					var length = path.getTotalLength();

					path.style.strokeDasharray = length + ' ' + length;
					path.style.strokeDashoffset = length;
					path.getBoundingClientRect();

					path.style.transition  = `stroke-dashoffset ${Visualization.animationDuration}ms ease-in-out`;
					path.style.strokeDashoffset = '0';
				});
			}

			// For each line appending the circle at each point
			for(const data of series) {

				svg.selectAll("dot")
					.data(data.data)
					.enter().append("circle")
					.attr('class', (d, i) => rows[i].annotations.size ? 'clips annotations' : 'clips')
					.attr('id', (d, i) => i)
					.attr("r", (d, i) => rows[i].annotations.size ? 4 : 0)
					.style('fill', (d, i) => rows[i].annotations.size ? '#666' : data.color)
					.attr("cx", d => x(d.date))
					.attr("cy", d => y(d.y))
			}

			var lastXpos;
			var that = this;

			d3.selectAll(obj.divId)
			.on('mousemove', function() {

				var cord = d3.mouse(this);
				var rows = obj.rows;

				if(disbleHover)
					return Tooltip.hide(that.container);

				d3.selectAll(obj.divId+' > svg > g > circle[class="clips"]').attr('r', 0);
				d3.selectAll(obj.divId+' > svg > g > circle[class="clips annotations"]').attr('r', 4);

				var xpos = parseInt((cord[0] - 50) / (width / series[0].data.length));

				var row = rows[xpos];

				if(!row)
					return;

				d3.selectAll(`${obj.divId} > svg > g > circle[id='${xpos}'][class="clips"]`).attr('r', 6);
				d3.selectAll(`${obj.divId} > svg > g > circle[id='${xpos}'][class="clips annotations"]`).attr('r', 6);

				const tooltip = [];

				for(const [key, value] of row.entries()) {

					if(key == 'timing')
						continue;

					tooltip.push(`
						<li>
							<span class="circle" style="background:${row.source.columns.get(key).color}"></span>
							<span>${row.source.columns.get(key).name}</span>
							<span class="value">${Format.number(value)}</span>
						</li>
					`);
				}

				const content = `
					<header>${row.date}</header>
					<ul class="body">
						${tooltip.join('')}
					</ul>
				`;

				Tooltip.show(that.container, cord, content, row);
			})
			.on('mouseout', function () {

				Tooltip.hide(that.container);

				d3.selectAll(obj.divId+' > svg > g > circle[class="clips"]').attr('r', 0);
			});

			//zoming function
			d3.selectAll(obj.divId)
			.on("click", function () {

				var cord = d3.mouse(this);
				var rows = obj.rows;

				var xpos = parseInt(Math.max(0, cord[0]) / (width / series[0].data.length)) - 2;

				var row = rows[xpos];

				row.annotations.show();

				Tooltip.hide(that.container);
			})
			.on("mousedown", function () {

				//remove all the rectangele created before
				d3.selectAll(obj.divId + " > rect[class='zoom']").remove();

				//assign this toe,
				var e = this,
					origin = d3.mouse(e),   // origin is the array containing the location of cursor from where the rectangle is created
					rect = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
				d3.select("body").classed("noselect", true);  //disable select
				//find the min between the width and and cursor location to prevent the rectangle move out of the chart
				origin[0] = Math.max(0, Math.min(width, (origin[0] - margin.left)));
				disbleHover = true;

				//if the mouse is down and mouse is moved than start creating the rectangle
				d3.select(window)
				.on("mousemove.zoomRect", function () {
					//current location of mouse
					var m = d3.mouse(e);
					//find the min between the width and and cursor location to prevent the rectangle move out of the chart
					m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));

					//asign width and height to the rectangle
					rect.attr("x", Math.min(origin[0], m[0]))
						.attr("y", margin.top)
						.attr("width", Math.abs(m[0] - origin[0]))
						.attr("height", height - margin.top);
				})
				.on("mouseup.zoomRect", function () {  //function to run mouse is released

					d3.select(window).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);

					//allow selection
					d3.select("body").classed("noselect", false);
					var m = d3.mouse(e);

					//the position where the mouse the released
					m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));
					//check that the origin location on x axis of the mouse should not be eqaul to last
					if (m[0] !== origin[0] && series.length != 0) {

						//starting filtering data
						data.forEach(function (d) {

							//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
							if (d.data.length > 50) {
								d.data = d.data.filter(function (a) {
									if (m[0] < origin[0]) {
										return x(a.date) >= m[0] && x(a.date) <= origin[0];
									} else {
										return x(a.date) <= m[0] && x(a.date) >= origin[0];
									}
								});
							}
						});
						zoom = false;
						//calling the chart function to update the graph
						chart.plot();
					}
					disbleHover = false;
					rect.remove();
				}, true);

				d3.event.stopPropagation();
			});

			//When in mouse is over the line than focus the line
			path.on('mouseover', function (d) {

				if(disbleHover)
					return;

				if(d)
					d.hover = true;

				svg.selectAll("path").classed("line-hover", d => d.hover);
			});

			//When in mouse is put the line than focus the line
			path.on('mouseout', function (d) {

				if(d)
					d.hover = false;

				svg.selectAll("path").classed("line-hover", d => d.hover);
			});
		};

		chart.plot();

		window.addEventListener('resize', () => {
			if(width !== (this.container.clientWidth - margin.left - margin.right)) {
				width = this.container.clientWidth - margin.left - margin.right;
				chart.plot(true);
			}
		});

		return chart;
	}
});

Visualization.list.set('bar', class Bar extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'bar');
		container.innerHTML = `
			<div id="bar-${this.source.query_id}" class="container">
				<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(e) {

		e && e.preventDefault && e.preventDefault();

		this.container.querySelector('.container').innerHTML = `<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>`;

		await this.source.fetch();

		this.render();
	}

	render() {
		const
			series = {},
			rows = this.source.response;

		for(const row of rows) {

			row.date = Format.date(row.get('timing'));

			for(const [key, value] of row) {

				if(key == 'timing')
					continue;

				if(!series[key]) {
					series[key] = {
						label: this.source.columns.get(key).name,
						color: this.source.columns.get(key).color,
						data: []
					};
				}

				series[key].data.push({
					date: row.date,
					x: null,
					y: parseFloat(value),
				});
			}
		}

		this.draw({
			series: Object.values(series),
			rows: rows,
			divId: `#bar-${this.source.query_id}`,
			chart: {},
		});
	}

	draw(obj) {

		const rows = obj.rows;

		d3.selectAll(obj.divId)
			.on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null);

		var chart = {};

		var data = obj.series;

		var tickNumber = window.innerWidth < 300 ? 3 : 5;

		// Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 40, left: 50},
			width = (this.container.clientWidth || 600) - margin.left - margin.right,
			height = (obj.chart.height || 500) - margin.top - margin.bottom;

		var y = d3.scale.linear().range([height,margin.top]);

		var x0 = d3.scale.ordinal()
			.rangeBands([0, width], .2);

		var x1 = d3.scale.ordinal()
			.rangeBands([0, x0.rangeBand()], .5);

		var xAxis = d3.svg.axis()
			.scale(x0)
			.orient('bottom');

		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.orient('left');

		var disbleHover = false;

		var series = data,
			zoom = true;

		var rawData = JSON.parse(JSON.stringify(data))

		chart.plot = (resize) => {

			d3.selectAll(obj.divId+' > *').remove();

			var svg = d3.select(obj.divId)
				.append('svg')
				.append('g')
				.attr('class', 'chart')
				.attr('transform', `translate(${margin.left}, ${margin.top})`);

			// Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed('toggleReset', zoom)
				.attr('x', width / 2)
				.attr('y', -10)
				.style('z-index', 1000)
				.append('rect')
				.attr('width', 80)
				.attr('height', 20)
				.attr('x', (width / 2) - 2)
				.attr('y', -10)
				.attr('rx', 2)
				.style('fill', '#f2f2f2')
				.style('stroke', '#666666')
				.style('stroke-width', '1px');

			d3.select(obj.divId + ' > svg > g > g[class="resetZoom"]')
				.append('text')
				.attr('x', ((width / 2) + 40))
				.attr('y', 4)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.text('Reset Zoom');

			//Click on reset zoom function
			d3.select(obj.divId+' > svg > g > g[class="resetZoom"]').on("mousedown", function () {
				series.forEach(function (d, i) {
					d.data = rawData[i].data;
				});
				zoom = true;
				chart.plot()
			});

			//check if the data is present or not
			if(!rows.length) {

				return svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.attr("class", "NA")
					.attr("fill", "#999")
					.text(this.source.originalResponse.message || 'No data found! :(');
			}

			y.domain([0, d3.max(series, c => d3.max(c.data, v => Math.ceil(v.y)))]).nice();
			x0.domain(series[0].data.map(d => d.date));
			x0.rangeBands([0, width], 0.1, 0);

			var tickInterval = parseInt(x0.domain().length / tickNumber);
			var ticks = x0.domain().filter((d, i) => !(i % tickInterval));
			xAxis.tickValues(ticks);

			x1.domain(data.map(d => d.label)).rangeBands([0, x0.rangeBand()]);

			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text");

			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			let bars = svg.append("g").selectAll("g")
				.data(series)
				.enter().append("g")
				.style("fill", d => d.color)
				.attr("transform", d => `translate(${x1(d.label)}, 0)`)
				.selectAll("rect")
				.data(d => d.data)
				.enter()
				.append("rect")
				.attr("width", x1.rangeBand())
				.attr("x", d => x0(d.date));

			if(!resize) {
				bars = bars
					.attr("height", d => 0)
					.attr("y", d => height)
					.transition()
					.duration(Visualization.animationDuration)
					.ease("quad-in");
			}

			bars
				.attr("height", d => height - y(d.y))
				.attr("y", d => y(d.y));

			var that = this;

			d3.selectAll(obj.divId)
			.on('mousemove', function (d) {

				var rows = obj.rows

				var cord = d3.mouse(this);

				if(disbleHover)
					return Tooltip.hide(that.container);

				var xpos = parseInt((cord[0] - 50) / (width / series[0].data.length));

				var row = rows[xpos];

				if(!row)
					return;

				const tooltip = [];

				for(const [key, value] of row) {

					if(key == 'timing')
						continue;

					tooltip.push(`
						<li>
							<span class="circle" style="background:${row.source.columns.get(key).color}"></span>
							<span>${row.source.columns.get(key).name}</span>
							<span class="value">${Format.number(value)}</span>
						</li>
					`);
				}

				const content = `
					<header>${row.date}</header>
					<ul class="body">
						${tooltip.join('')}
					</ul>
				`;

				Tooltip.show(that.container, cord, content, row);
			})
			.on('mouseout', () => Tooltip.hide(this.container));

			//zoming function
			d3.selectAll(obj.divId)
			.on("mousedown", function (d) {
				//remove all the rectangele created before
				d3.selectAll(obj.divId + " > rect[class='zoom']").remove();
				//assign this toe,
				var e = this,
					origin = d3.mouse(e),   // origin is the array containing the location of cursor from where the rectangle is created
					rectSelected = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
				d3.select("body").classed("noselect", true);  //disable select
				//find the min between the width and and cursor location to prevent the rectangle move out of the chart
				origin[0] = Math.max(0, Math.min(width, (origin[0] - margin.left)));
				disbleHover = true;

				//if the mouse is down and mouse is moved than start creating the rectangle
				d3.selectAll(obj.divId)
					.on("mousemove.zoomRect", function (d) {
						//current location of mouse
						var m = d3.mouse(e);
						//find the min between the width and and cursor location to prevent the rectangle move out of the chart
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));
						//asign width and height to the rectangle
						rectSelected.attr("x", Math.min(origin[0], m[0]))
							.attr("y", (margin.top))
							.attr("width", Math.abs(m[0] - origin[0]))
							.attr("height", height-margin.top);
					})
					.on("mouseup.zoomRect", function (d) {  //function to run mouse is released
						//stop above event listner
						d3.select(obj.divId).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
						//allow selection
						d3.select("body").classed("noselect", false);
						var m = d3.mouse(e);
						//the position where the mouse the released
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));
						//check that the origin location on x axis of the mouse should not be eqaul to last
						if (m[0] !== origin[0] && series[0].data.length > 20) {
							series.forEach(function (d) {
								//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
								if (d.data.length > 10) {
									d.data = d.data.filter(function (a) {
										if (m[0] < origin[0]) {
											return x0(a.date) >= m[0] && x0(a.date) <= origin[0];
										} else {
											return x0(a.date) <= m[0] && x0(a.date) >= origin[0];
										}
									});
								}
							});
							zoom = false;
							chart.plot();
						}
						disbleHover = false;
						rectSelected.remove();
					}, true);
				d3.event.stopPropagation();
			});
		};

		chart.plot();

		window.addEventListener('resize', () => {
			if(width !== (this.container.clientWidth - margin.left - margin.right)) {
				width = this.container.clientWidth - margin.left - margin.right;
				chart.plot(true);
			}
		});

		return chart;
	}
});

Visualization.list.set('stacked', class Bar extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'stacked');
		container.innerHTML = `
			<div id="stacked-${this.source.query_id}" class="container">
				<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(e) {

		e && e.preventDefault && e.preventDefault();

		this.container.querySelector('.container').innerHTML = `<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>`;

		await this.source.fetch();

		this.render();
	}

	render() {
		const
			series = {},
			rows = this.source.response;

		for(const row of rows) {

			row.date = Format.date(row.get('timing'));

			for(const [key, value] of row) {

				if(key == 'timing')
					continue;

				if(!series[key]) {
					series[key] = {
						label: this.source.columns.get(key).name,
						color: this.source.columns.get(key).color,
						data: []
					};
				}

				series[key].data.push({
					date: row.date,
					x: null,
					y: parseFloat(value),
					label: this.source.columns.get(key).name,
					color: this.source.columns.get(key).color,
				});
			}
		}

		this.draw({
			series: Object.values(series),
			rows: rows,
			divId: `#stacked-${this.source.query_id}`,
			chart: {},
		});
	}

	draw(obj) {

		const rows = obj.rows;

		d3.selectAll(obj.divId)
			.on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null);

		var chart = {};

		var data = obj.series;

		var tickNumber = 5;

		// Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 40, left: 50},
			width = (this.container.clientWidth || 600) - margin.left - margin.right,
			height = (obj.chart.height || 500) - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangePoints([0, width], 0.1, 0);

		var y = d3.scale.linear().range([height, margin.top]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		//Defining yAxis location at left the axes
		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.orient("left");

		var disbleHover = false;

		var series = data,
			zoom = true;

		series = d3.layout.stack()(series.map(d => d.data));

		var rawData = JSON.parse(JSON.stringify(series));

		chart.plot = (resize) => {

			d3.selectAll(obj.divId + " > *").remove();

			var svg = d3.select(obj.divId)
				.append("svg")
				.append("g")
				.attr("class", "chart")
				.attr("transform", `translate(${margin.left}, ${margin.top})`);

			// Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", width / 2)
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", (width / 2) - 2)
				.attr("y", -10)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			d3.select(obj.divId + " > svg > g > g[class='resetZoom']")
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", 4)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			//Click on reset zoom function
			d3.select(obj.divId+" > svg > g > g[class='resetZoom']").on("mousedown", function () {
				series.forEach(function (d, i) {
					series[i] = rawData[i];
				});
				zoom = true;
				chart.plot();
			});

			//check if the data is present or not
			if(!rows.length) {

				return svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.attr("class", "NA")
					.attr("fill", "#999")
					.text(this.source.originalResponse.message || 'No data found! :(');
			}

			x.domain(series[0].map(d => d.date));
			x.rangeBands([0, width], 0.1, 0);
			y.domain([0, d3.max(series, c => d3.max(c, v => Math.ceil(v.y0 + v.y))) + 4]).nice();

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter((d, i) => !(i % tickInterval));
			xAxis.tickValues(ticks);

			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis);

			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			var layer = svg.selectAll(".layer")
				.data(series)
				.enter().append("g")
				.attr("class", "layer")
				.style("fill", d => d[0].color);

			let bars = layer.selectAll("rect")
				.data(d => d)
				.enter().append("rect")
				.attr("x",  d => x(d.date))
				.attr("width", x.rangeBand());

			if(!resize) {
				bars = bars
					.attr("height", d => 0)
					.attr("y", d => height)
					.transition()
					.duration(Visualization.animationDuration)
					.ease('quad-in')
			}

			bars
				.attr("height", d => y(d.y0) - y(d.y + d.y0))
				.attr("y", d => y(d.y + d.y0));

			var that = this;

			d3.selectAll(obj.divId)
			.on('mousemove', function (d) {

				var rows = obj.rows;

				var cord = d3.mouse(this);

				if(disbleHover)
					return Tooltip.hide(that.container);

				var xpos = parseInt((cord[0] - 50) / (width / series[0].length));

				var row = rows[xpos];

				if(!row)
					return;

				const tooltip = [];

				for(const [key, value] of row) {

					if(key == 'timing')
						continue;

					tooltip.push(`
						<li>
							<span class="circle" style="background:${row.source.columns.get(key).color}"></span>
							<span>${row.source.columns.get(key).name}</span>
							<span class="value">${Format.number(value)}</span>
						</li>
					`);
				}

				let total = 0;

				for(const [key, value] of row) {
					if(key != 'timing')
						total += parseFloat(value);
				}

				const content = `
					<header>${row.date}</header>
					<ul class="body">
						${tooltip.join('')}
					</ul>
					<footer>
						<span>Total</span>
						<span class="value">${Format.number(total)}</span>
					</footer>
				`;

				Tooltip.show(that.container, cord, content, row);
			})
			.on('mouseout', () => Tooltip.hide(this.container));


			//zoming function
			d3.selectAll(obj.divId)
				.on("mousedown", function (d) {
					//remove all the rectangele created before
					d3.selectAll(obj.divId + " > rect[class='zoom']").remove();
					//assign this toe,
					var e = this,
						origin = d3.mouse(e),   // origin is the array containing the location of cursor from where the rectangle is created
						rectSelected = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
					d3.select("body").classed("noselect", true);  //disable select
					//find the min between the width and and cursor location to prevent the rectangle move out of the chart
					origin[0] = Math.max(0, Math.min(width, (origin[0] - margin.left)));
					disbleHover = true;

					//if the mouse is down and mouse is moved than start creating the rectangle
					d3.selectAll(obj.divId)
					.on("mousemove.zoomRect", function (d) {
						//current location of mouse
						var m = d3.mouse(e);
						//find the min between the width and and cursor location to prevent the rectangle move out of the chart
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));

						//asign width and height to the rectangle
						rectSelected.attr("x", Math.min(origin[0], m[0]))
							.attr("y", margin.top)
							.attr("width", Math.abs(m[0] - origin[0]))
							.attr("height", height - margin.top);
					})
					.on("mouseup.zoomRect", function (d) {  //function to run mouse is released

						//stop above event listner
						d3.select(obj.divId).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);

						//allow selection
						d3.select("body").classed("noselect", false);
						var m = d3.mouse(e);

						//the position where the mouse the released
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));

						//check that the origin location on x axis of the mouse should not be eqaul to last
						if (m[0] !== origin[0] && series[0].length > 20) {

							series.forEach(function (d, i) {

								//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
								if (d.length > 10) {
									series[i] = d.filter(function (a) {
										if (m[0] < origin[0]) {
											return x(a.date) >= m[0] && x(a.date) <= origin[0];
										} else {
											return x(a.date) <= m[0] && x(a.date) >= origin[0];
										}
									});
								}
							});
							zoom = false;
							chart.plot();
						}
						disbleHover = false;
						rectSelected.remove();
					}, true);
					d3.event.stopPropagation();
				});
		};

		chart.plot();

		window.addEventListener('resize', () => {
			if(width !== (this.container.clientWidth - margin.left - margin.right)) {
				width = this.container.clientWidth - margin.left - margin.right;
				chart.plot(true);
			}
		});

		return chart;
	}
});

Visualization.list.set('area', class Area extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'area');
		container.innerHTML = `
			<div id="area-${this.source.query_id}" class="container">
				<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(e) {

		e && e.preventDefault && e.preventDefault();

		this.container.querySelector('.container').innerHTML = `<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>`;

		await this.source.fetch();

		this.render();
	}

	render() {

		const
			series = {},
			rows = this.source.response;

		for(const row of rows) {

			row.date = Format.date(row.get('timing'));

			for(const [key, value] of row) {

				if(key == 'timing')
					continue;

				if(!series[key]) {
					series[key] = {
						label: this.source.columns.get(key).name,
						color: this.source.columns.get(key).color,
						data: []
					};
				}

				series[key].data.push({
					date: Format.date(row.get('timing')),
					x: null,
					y: parseFloat(value),
				});
			}
		}

		this.draw({
			series: Object.values(series),
			rows: rows,
			divId: `#area-${this.source.query_id}`,
			chart: {},
		});
	}

	draw(obj) {

		const rows = obj.rows;

		d3.selectAll(obj.divId)
			.on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null);

		var chart = {};

		var data = obj.series;

		var tickNumber = window.innerWidth < 300 ? 3 : 5;

		// Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 40, left: 50},
			width = (this.container.clientWidth || 600) - margin.left - margin.right,
			height = (obj.chart.height || 500) - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangePoints([0, width], 0.1, 0);

		var y = d3.scale.linear().range([height, margin.top]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		//Defining yAxis location at left the axes
		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.orient("left");

		//graph type line and
		var line = d3.svg.line()
			.x(d => x(d.date))
			.y(d => y(d.y));

		var disbleHover = false;

		var stack = d3.layout.stack()
			.offset("zero")
			.values(d => d.data)
			.x(d => x(d.date))
			.y(d => d.y);

		var area = d3.svg.area()
			.x(d => x(d.date))
			.y0(d => y(d.y0))
			.y1(d => y(d.y0 + d.y));

		var rawData = JSON.parse(JSON.stringify(data));
		var series = data,
			zoom = true;

		//chart function to create chart
		chart.plot = (resize) => {

			//Empty the container before loading
			d3.selectAll(obj.divId+" > *").remove();

			//Adding chart and placing chart at specific location using translate
			var svg = d3.select(obj.divId)
				.append('svg')
				.append('g')
				.attr('class', 'chart')
				.attr('transform', `translate(${margin.left}, ${margin.top})`);

			// Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed('toggleReset', zoom)
				.attr('x', width / 2)
				.attr('y', -10)
				.style('z-index', 1000)
				.append('rect')
				.attr('width', 80)
				.attr('height', 20)
				.attr('x', (width / 2) - 2)
				.attr('y', -10)
				.attr('rx', 2)
				.style('fill', '#f2f2f2')
				.style('stroke', '#666666')
				.style('stroke-width', '1px');

			d3.select(obj.divId + ' > svg > g > g[class="resetZoom"]')
				.append('text')
				.attr('x', ((width / 2) + 40))
				.attr('y', 4)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.text('Reset Zoom');

			//Click on reset zoom function
			d3.select(obj.divId+" > svg > g > g[class='resetZoom']").on("mousedown", function () {
				data.forEach((d, i) => d.data = rawData[i].data);
				zoom = true;
				chart.plot()
			});

			//check if the data is present or not
			if(!rows.length) {

				return svg.append('g').attr('class','noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y",  (height / 2))
					.attr("text-anchor", "middle")
					.attr("class", "NA")
					.attr("fill", "#999")
					.text(this.source.originalResponse.message || 'No data found! :(');
			}

			stack(series);

			//setting the upper an d lower limit in x - axis
			x.domain(series[0].data.map(d => d.date));

			//var mult = Math.max(1, Math.floor(width / x.domain().length));
			x.rangePoints([0, width], 0.1, 0);

			//setting the upper an d lower limit in y - axis
			y.domain([
				d3.min(series, c => d3.min(c.data, v => Math.floor(v.y0))),
				d3.max(series, c => d3.max(c.data, v => Math.ceil(v.y0+ v.y)))+4
			]);

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter((d, i) => !(i % tickInterval));

			xAxis.tickValues(ticks);
			yAxis.innerTickSize(-width);

			//Appending x - axis
			svg.append('g')
				.attr('class', 'x axis')
				.attr('transform', 'translate(0,' + height + ')')
				.call(xAxis);

			//Appending y - axis
			svg.append('g')
				.attr('class', 'y axis')
				.call(yAxis);

			//Appending line in chart
			let areas = svg.selectAll('.city')
				.data(series)
				.enter().append('g')
				.attr('class', 'city')
				.append('path')
				.attr('d', d => area(d.data))
				.style('fill', d => d.color);

			if(!resize) {
				areas = areas
					.style('opacity', 0)
					.transition()
					.duration(Visualization.animationDuration)
					.ease("quad-in");
			}

			areas
				.style('opacity', 0.75);

			//selecting all the paths
			var path = svg.selectAll('path');
			//For each line appending the circle at each point
			series.forEach(function (data) {
				svg.selectAll('dot')
					.data(data.data)
					.enter().append('circle')
					.attr('class', (d, i) => rows[i].annotations.size ? 'clips annotations' : 'clips')
					.attr('id', (d, i) => i)
					.attr("r", (d, i) => rows[i].annotations.size ? 4 : 0)
					.style('fill', (d, i) => rows[i].annotations.size ? '#666' : data.color)
					.attr('cx', d => x(d.date))
					.attr('cy', d => y(d.y + d.y0));
			});

			var that = this;

			//Hover functionality
			d3.selectAll(obj.divId)
			.on('mousemove', function () {

				const rows = obj.rows;

				var cord = d3.mouse(this);

				if(disbleHover)
					return Tooltip.hide(that.container);

				d3.selectAll(obj.divId+' > svg > g > circle[class="clips"]').attr('r', 0);
				d3.selectAll(obj.divId+' > svg > g > circle[class="clips annotations"]').attr('r', 4);

				var xpos = parseInt((cord[0] - 50) / (width / series[0].data.length));

				var row = rows[xpos];

				if(!row)
					return;

				d3.selectAll(`${obj.divId} > svg > g > circle[id='${xpos}'][class="clips"]`).attr('r', 6);
				d3.selectAll(`${obj.divId} > svg > g > circle[id='${xpos}'][class="clips annotations"]`).attr('r', 6);

				const tooltip = [];

				for(const [key, value] of row) {

					if(key == 'timing')
						continue;

					tooltip.push(`
						<li>
							<span class="circle" style="background:${row.source.columns.get(key).color}"></span>
							<span>${row.source.columns.get(key).name}</span>
							<span class="value">${Format.number(value)}</span>
						</li>
					`);
				}

				const content = `
					<header>${row.date}</header>
					<ul class="body">
						${tooltip.join('')}
					</ul>
				`;

				Tooltip.show(that.container, cord, content, row);
			})
			.on('mouseout', function () {

				Tooltip.hide(that.container);

				d3.selectAll(obj.divId+' > svg > g > circle[class="clips"]').attr('r', 0);
			});

			//zoming function
			d3.selectAll(obj.divId)
			.on("click", function () {

				var cord = d3.mouse(this);
				var rows = obj.rows;

				var xpos = parseInt(Math.max(0, cord[0]) / (width / series[0].data.length)) - 1;

				var row = rows[xpos];

				row.annotations.show();

				Tooltip.hide(that.container);
			})
			.on("mousedown", function () {

				//remove all the rectangele created before
				d3.selectAll(obj.divId + " > rect[class='zoom']").remove();

				//assign this toe,
				var e = this,
					origin = d3.mouse(e),   // origin is the array containing the location of cursor from where the rectangle is created
					rect = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
				d3.select("body").classed("noselect", true);  //disable select
				//find the min between the width and and cursor location to prevent the rectangle move out of the chart
				origin[0] = Math.max(0, Math.min(width, (origin[0] - margin.left)));
				disbleHover = true;

				//if the mouse is down and mouse is moved than start creating the rectangle
				d3.select(window)
					.on("mousemove.zoomRect", function () {
						//current location of mouse
						var m = d3.mouse(e);
						//find the min between the width and and cursor location to prevent the rectangle move out of the chart
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));
						//asign width and height to the rectangle
						rect.attr("x", Math.min(origin[0], m[0]))
							.attr("y", margin.top)
							.attr("width", Math.abs(m[0] - origin[0]))
							.attr("height", height - margin.top);
					})
					.on("mouseup.zoomRect", function () {  //function to run mouse is released
						//stop above event listner
						d3.select(window).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
						//allow selection
						d3.select("body").classed("noselect", false);
						var m = d3.mouse(e);
						//the position where the mouse the released
						m[0] = Math.max(0, Math.min(width, (m[0] - margin.left)));
						//check that the origin location on x axis of the mouse should not be eqaul to last
						if (m[0] !== origin[0] && series.length != 0) {
							//starting filtering data
							data.forEach(function (d) {
								//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
								if (d.data.length > 10) {
									d.data = d.data.filter(function (a) {
										if (m[0] < origin[0]) {
											return x(a.date) >= m[0] && x(a.date) <= origin[0];
										} else {
											return x(a.date) <= m[0] && x(a.date) >= origin[0];
										}
									});
								}
							});
							zoom = false
							//calling the update function to update the graph
							chart.plot();
						}
						disbleHover = false;
						rect.remove();
					}, true);
				d3.event.stopPropagation();
			});

			//When in mouse is over the line than focus the line
			path.on('mouseover', function (d) {

				if(disbleHover)
					return;

				if(d)
					d.hover = true;

				svg.selectAll("path").classed("line-hover", d => d.hover);
			});

			//When in mouse is put the line than focus the line
			path.on('mouseout', function (d) {

				if(d)
					d.hover = false;

				svg.selectAll("path").classed("line-hover", d => d.hover);
			});
		};

		chart.plot();

		window.addEventListener('resize', () => {
			if(width !== (this.container.clientWidth - margin.left - margin.right)) {
				width = this.container.clientWidth - margin.left - margin.right;
				chart.plot(true);
			}
		});

		return chart;
	}
});

Visualization.list.set('spatialmap', class SpatialMap extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('section');

		const container = this.containerElement;

		container.classList.add('visualization', 'spatial-map');

		container.innerHTML = `
			<div class="container">
				<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(parameters = {}) {

		await this.source.fetch(parameters);

		this.render();
	}

	render() {

		const
			markers = [],
			response = this.source.response;

		// If the maps object wasn't already initialized
		if(!this.map)
			this.map = new google.maps.Map(this.containerElement.querySelector('.container'), { zoom: 12 });

		// If the clustered object wasn't already initialized
		if(!this.clusterer)
			this.clusterer = new MarkerClusterer(this.map, null, { imagePath: 'https://raw.githubusercontent.com/googlemaps/js-marker-clusterer/gh-pages/images/m' });

		// Add the marker to the markers array
		for(const row of response) {
			markers.push(
				new google.maps.Marker({
					position: {
						lat: parseFloat(row.get('lat')),
						lng: parseFloat(row.get('lng')),
					},
				})
			);
		}

		if(!this.markers || this.markers.length != markers.length) {

			// Empty the map
			this.clusterer.clearMarkers();

			// Load the markers
			this.clusterer.addMarkers(markers);

			this.markers = markers;
		}

		// Point the map to location's center
		this.map.panTo({
			lat: parseFloat(response[0].get('lat')),
			lng: parseFloat(response[0].get('lng')),
		});
	}
});

Visualization.list.set('funnel', class Funnel extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'funnel');
		container.innerHTML = `
			<div id="funnel-${this.source.query_id}" class="container">
				<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>
			</div>
		`;

		return container;
	}

	async load(e) {

		if(e)
			e.preventDefault();

		this.container.querySelector('.container').innerHTML = `<div class="loading"><i class="fa fa-spinner fa-spin"></i></div>`;

		await this.source.fetch();

		this.render();
	}

	render() {

		const series = [];

		for(const [i, level] of this.source.response.entries()) {
			series.push({
				date: 0,
				label: level.get('metric'),
				color: Array.from(this.source.columns.values())[i].color,
				y: parseFloat(level.get('value')),
			});
		}

		this.draw({
			series: series.reverse(),
			divId: `#funnel-${this.source.query_id}`,
			chart: {},
		});
	}

	draw(obj) {

		d3.selectAll(obj.divId).on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null)
			.on('click', null);

		var chart = {};

		// Setting margin and width and height
		var margin = {top: 20, right: 0, bottom: 40, left: 0},
			width = this.container.clientWidth - margin.left - margin.right,
			height = obj.chart.height || 500 - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangeBands([0, width], 0.1, 0);

		var y = d3.scale.linear().range([height, margin.top]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis().scale(x).orient("bottom");

		var diagonal = d3.svg.diagonal()
			.source(d => {
				return {x: d[0].y + 5, y: d[0].x};
			})
			.target(d => {
				return {x: d[1].y + 5, y: d[1].x};
			})
			.projection(d => [d.y, d.x]);

		var series = d3.layout.stack()(obj.series.map(s => [s]));

		series.map(r => r.data = r);

		chart.plot = (resize) => {

			var funnelTop = width * 0.60,
				funnelBottom = width * 0.2,
				funnelBottonHeight = height * 0.2;

			//Empty the container before loading
			d3.selectAll(obj.divId + " > *").remove();
			//Adding chart and placing chart at specific location using translate
			var svg = d3.select(obj.divId)
				.append("svg")
				.append("g")
				.attr("class", "chart")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			//check if the data is present or not
			if (series.length == 0 || series[0].data.length == 0)
				return;

			x.domain([0]);
			x.rangeBands([0, width], 0.1, 0);
			y.domain([
				0,
				d3.max(series, function (c) {
					return d3.max(c.data, function (v) {
						return Math.ceil(v.y0 + v.y);
					});
				}) + 4
			]);

			var layer = svg.selectAll(".layer")
				.data(series)
				.enter().append("g")
				.attr("class", "layer")
				.style("fill", d => d[0].color);

			let rectangles = layer.selectAll("rect")
				.data(function (d) {
					return d.data;
				})
				.enter().append("rect")
				.attr("x", d => x(d.date))
				.attr("width", x.rangeBand())

			if(!resize) {
				rectangles = rectangles
					.attr("height", d => 0)
					.attr("y", d => 30)
					.transition()
					.duration(Visualization.animationDuration);
			}

			rectangles
				.attr("height", d => y(d.y0) - y(d.y + d.y0))
				.attr("y", d => y(d.y + d.y0));

			var poly1 = [
				{x: 0, y: margin.top},
				{x: (width - funnelTop) / 2, y: margin.top},
				{x: (width - funnelBottom) / 2, y: height - funnelBottonHeight},
				{x: (width - funnelBottom) / 2, y: height},
				{x: 0, y: height}
			];

			var poly2 = [
				{x: width, y: margin.top},
				{x: (width - funnelTop) / 2 + funnelTop + 5, y: margin.top},
				{x: (width - funnelBottom) / 2 + funnelBottom + 5, y: height - funnelBottonHeight},
				{x: (width - funnelBottom) / 2 + funnelBottom + 5, y: height},
				{x: width, y: height}
			];

			var polygon = svg.selectAll("polygon")
				.data([poly2, poly1])
				.enter().append("polygon")
				.attr('points', d =>  d.map(d => [d.x, d.y].join()).join(' '))
				.attr('stroke', 'white')
				.attr('stroke-width', 2)
				.attr('fill', 'white');

			//selecting all the paths
			var path = svg.selectAll('rect'),
				that = this;

			//mouse over function
			path .on('mousemove', function(d) {

				var cord = d3.mouse(this);

				if (cord[1] < 2 * margin.top || cord[1] > (height + 2 * margin.top) || cord[0] < margin.left || cord[0] > (width + margin.left) || series.length == 0 || series[0].data.length == 0)
					return

				const content = `
					<header>${d.label}</header>
					<div class="body">${d.y}</div>
				`;

				Tooltip.show(that.container, cord, content);
			});
			polygon.on('mouseover', function () {
				Tooltip.hide(that.container);
			});

			var labelConnectors = svg.append('g').attr('class', 'connectors');
			var previousLabelHeight = 0, singPoint = height / d3.max(y.domain());
			for (var i = 0; i < series.length; i++) {
				var section = series[i].data[0];
				var startLocation = section.y0 * singPoint,
					sectionHeight = section.y * singPoint,
					bottomLeft = funnelBottonHeight - startLocation,
					x1, y1,  endingPintY, curveData;
				var label = labelConnectors.append('g');
				var text;

				//for lower part of the funnel
				if (sectionHeight / 2 < bottomLeft) {

					x1 = (width + funnelBottom) / 2;
					y1 = (startLocation + sectionHeight / 2);

					endingPintY = y1;

					if (endingPintY - previousLabelHeight <= 10)
						endingPintY = previousLabelHeight + 5;

					curveData = [
						{x: x1, y: (height) - y1 - 5},
						{x: x1 + (window.innerWidth < 768 ? 30 : 50), y: height - endingPintY}
					];

					text = label.append('text')
						.attr('x', x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr('y', height - (endingPintY))
						.attr('text-anchor', 'left')
						.style('font-size', '15px')

					if (window.innerWidth < 768) {
						text.style('font-size', '10px');
					}
					text.append('tspan')
						.attr('x', x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr('dx', '0')
						.attr('dy', '1em')
						.text(series[i].label);

					text.append('tspan')
						.attr('x', x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr('dx', '0')
						.attr('dy', '1.2em')
						.style('font-size', '13px')
						.text(`${series[i].data[0].y}  (${(series[i].data[0].y / series[series.length - 1].data[0].y * 100).toFixed(2)}%)`);

				} else {

					//for upper part of the funnel
					var arr = findInterSection(
						width / 2, height - (startLocation + sectionHeight / 2),
						width, height - (startLocation + sectionHeight / 2),
						(width + funnelTop) / 2, margin.top,
						(width + funnelBottom) / 2, height - funnelBottonHeight);

					x1 = arr[0];
					y1 = arr[1];

					endingPintY = y1;
					if ((endingPintY - (endingPintY - previousLabelHeight)) <= 15)
						endingPintY = previousLabelHeight + endingPintY + 15;

					curveData = [
						{x: x1, y: y1},
						{x: x1 + (window.innerWidth < 768 ? 30 : 50), y: endingPintY-20}
					];

					text = label.append('text')
						.attr('x', x1 + (window.innerWidth < 768 ? 40 : 70))
						.attr('y', endingPintY-20)
						.attr('text-anchor', 'left')
						.style('font-size', '15px');

					if (window.innerWidth < 768)
						text.style('font-size', '10px');

					text.append('tspan')
						.attr('x', x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr('dx', '0')
						.attr('dy', '1em')
						.text(series[i].label);

					text.append('tspan')
						.attr('x', x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr('dx', '0')
						.attr('dy', '1.2em')
						.style('font-size', '13px')
						.text(`${series[i].data[0].y} (${(series[i].data[0].y / series[series.length - 1].data[0].y * 100).toFixed(2)}%)`);
				}

				previousLabelHeight = endingPintY + 45;

				label.datum(curveData)
					.append('path')
					.attr('class', 'link')
					.attr('d', diagonal)
					.attr('stroke', '#2a3f54')
					.attr('stroke-width', 1)
					.attr('fill', 'none');
			}
		};

		chart.plot();

		window.addEventListener('resize', () => {
			width = this.container.clientWidth - margin.left - margin.right;
			chart.plot(true);
		});

		function findInterSection(x1, y1, x2, y2, x3, y3, x4, y4) {
			var m1 = (y2 - y1) / (x2 - x1), m2 = (y4 - y3) / (x4 - x3), b1 = (y1 - m1 * x1), b2 = (y3 - m2 * x3);
			return [((b2 - b1) / (m1 - m2)), -1 * ((b1 * m2 - b2 * m1) / (m1 - m2))];
		}

		return chart;
	}
});

Visualization.list.set('cohort', class Cohort extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('section');

		container.classList.add('visualization', 'cohort');

		container.innerHTML = `
			<div class="container"></div>
		`;

		return container;
	}

	async load(e) {

		if(e)
			e.preventDefault();

		this.container.querySelector('.container').innerHTML = `
			<div class="loading">
				<i class="fa fa-spinner fa-spin"></i>
			</div>
		`;

		await this.source.fetch();

		this.process();
		this.render();
	}

	process() {

		this.max = 0;

		this.source.response.pop();

		for(const row of this.source.response) {

			for(const column of row.get('data') || [])
				this.max = Math.max(this.max, column.count);
		}
	}

	render() {

		const
			container = this.container.querySelector('.container'),
			table = document.createElement('table'),
			tbody = document.createElement('tbody'),
			type = this.source.filters.get('type').label.querySelector('input').value,
			response = this.source.response;

		container.textContent = null;

		table.insertAdjacentHTML('beforeend', `
			<thead>
				<tr>
					<th class="sticky">${type[0].toUpperCase() + type.substring(1)}</th>
					<th class="sticky">Cohort Size</th>
					<th class="sticky">
						${response.length && response[0].get('data').map((v, i) => type[0].toUpperCase()+type.substring(1)+' '+(++i)).join('</th><th class="sticky">')}
					</th>
				</tr>
			</thead>
		`);

		for(const row of response) {

			const cells = [];

			for(const cell of row.get('data')) {

				let contents = Format.number(cell.percentage) + '%';

				if(cell.href)
					contents = `<a href="${cell.href}" target="_blank">${contents}</a>`;

				cells.push(`
					<td style="${this.getColor(cell.count)}" class="${cell.href ? 'href' : ''}" title="${cell.description}">
						${contents}
					</td>
				`);
			}

			let size = Format.number(row.get('size'));

			if(row.get('baseHref'))
				size = `<a href="${row.get('baseHref')}" target="_blank">${size}</a>`;

			tbody.insertAdjacentHTML('beforeend', `
				<tr>
					<td class="sticky">${Format.date(row.get('timing'))}</td>
					<td class="sticky ${row.get('baseHref') ? 'href' : ''}">${size}</td>
					${cells.join('')}
				</tr>
			`);
		}

		if(!response.length)
			table.innerHTML = `<caption class="NA">${this.source.originalResponse.message || 'No rows found! :('}</caption>`;

		table.appendChild(tbody);
		container.appendChild(table);
	}

	getColor(count) {

		const intensity = Math.floor((this.max - count) / this.max * 255);

		return `background: rgba(255, ${intensity}, ${intensity}, 0.8)`;
	}
});

class Tooltip {

	static show(div, position, content, row) {

		if(!div.querySelector('.tooltip'))
			div.insertAdjacentHTML('beforeend', `<div class="tooltip"></div>`)

		const
			container = div.querySelector('.tooltip'),
			distanceFromMouse = 40;

		container.innerHTML = content;

		if(row && row.annotations.size)
			container.querySelector('header').appendChild(row.annotations.opener);

		if(container.classList.contains('hidden'))
			container.classList.remove('hidden');

		let left = Math.max(position[0] - (container.clientWidth / 2) + distanceFromMouse, 5),
			top = position[1] + distanceFromMouse;

		if(left + container.clientWidth > div.clientWidth)
			left = div.clientWidth - container.clientWidth - 5;

		if(top + container.clientHeight > div.clientHeight)
			top = position[1] - container.clientHeight - distanceFromMouse;

		container.setAttribute('style', `left: ${left}px; top: ${top}px;`);
	}

	static hide(div) {

		const container = div.querySelector('.tooltip');

		if(!container)
			return;

		container.classList.add('hidden');
	}
}

DataSourceFilter.setup();

Node.prototype.on = window.on = function(name, fn) {
	this.addEventListener(name, fn);
}