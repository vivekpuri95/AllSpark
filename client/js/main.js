"use strict";

if(window.location.pathname == '/')
	window.location = '/dashboard/7';

class Account {

	static async load() {

		let account = null;

		try {
			account = JSON.parse(localStorage.account);
		} catch(e) {}

		if(!account) {

			window.account = {APIHost: `http://${window.location.host}:${window.location.hostname == 'localhost' ? '3002' : '3000'}/`}

			const accounts = await API.call('v2/accounts/list');

			account = accounts.filter(a => a.url == window.location.host)[0];

			localStorage.account = JSON.stringify(account);
		}

		if(!account)
			return;

		window.account = new Account(account);
	}

	constructor(account) {

		for(const key in account)
			this[key] = account[key];

		this.APIHost = `http://${this.url}:${window.location.hostname == 'localhost' ? '3002' : '3000'}/`;
	}
}

class User {

	static async load() {

		let user = null;

		try {
			user = JSON.parse(localStorage.user);
		} catch(e) {}

		if(!user && window.location.pathname.startsWith('/login'))
			return;

		if(!user)
			this.logout(true);

		window.user = new User(user);
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

		const response = await fetch(url, options);

		AJAXLoader.hide();

		if(response.status == 401 && !this.location.pathname.startsWith('/login'))
			return user.logout();

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
	static call(endpoint, parameters = {}, options = {}) {

		endpoint = account.APIHost + endpoint;

		if(localStorage.token)
			parameters.token = localStorage.token;

		// If a form id was supplied, then also load the data from that form
		if(options.form)
			API.loadFormData(parameters, options.form);

		return AJAX.call(endpoint, parameters, options);
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

class Page {

	static async setup() {

		AJAXLoader.setup();

		await Account.load();
		await User.load();

		if(account.icon)
			document.getElementById('favicon').href = account.icon;

		if(account.logo)
			document.querySelector('body > header .logo img').src = account.logo;

		if(window.user)
			document.querySelector('body > header .user-name').textContent = user.name;

		document.querySelector('body > header .logout').on('click', () => User.logout());

		for(const item of document.querySelectorAll('body > header nav a')) {
			if(window.location.pathname.startsWith(new URL(item.href).pathname))
				item.classList.add('selected');
		}

		if(window.location.pathname.startsWith('/login'))
			document.querySelector('body > header nav').classList.add('hidden');
	}
}

class Dashboard {

	constructor(dashboard) {

		for(const key in dashboard)
			this[key] = dashboard[key];

		this.sources = new Set(DataSource.list.filter(s => s.dashboards && s.dashboards.filter(d => d.dashboard == this.id).length));

		this.children = new Set;
	}

	render() {

		if(!Dashboard.container)
			return;

		for(const selected of document.querySelectorAll('main nav .label.selected'))
			selected.classList.remove('selected');

		this.menuItem.querySelector('.label').classList.add('selected');

		let parent = this.menuItem.parentElement.parentElement;

		while(parent.classList && parent.classList.contains('item')) {
			parent.querySelector('.label').classList.add('selected');
			parent = parent.parentElement.parentElement;
		}

		Dashboard.container.textContent = null;

		for(const source of this.sources) {

			const dashboard = source.dashboards.filter(d => d.dashboard == this.id)[0];

			source.container.setAttribute('style', `
				order: ${dashboard.position || 0};
				grid-column: auto / span ${dashboard.span || 4}
			`);

			Dashboard.container.appendChild(source.container);
			source.visualizations.selected.load();
		}

		if(!this.sources.size)
			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';
	}

	get menuItem() {

		if(this.container)
			return this.container;

		const container = this.container = document.createElement('div');

		container.classList.add('item');

		container.innerHTML = `
			<div class="label">
				<i class="fab fa-hubspot"></i>
				<span class="name">${this.name}</span>
				${this.children.size ? '<span class="angle"><i class="fa fa-angle-down"></i></span>' : ''}
			</div>
			${this.children.size ? '<div class="submenu"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');

		container.querySelector('.label').on('click', () => {

			if(this.children.size) {
				container.querySelector('.angle').classList.toggle('down');
				submenu.classList.toggle('hidden');
			}

			else {
				history.pushState({what: this.id, type: 'dashboard'}, '', `/dashboard/${this.id}`);
				this.render();
			}
		});

		for(const child of this.children)
			submenu.appendChild(child.menuItem);

		return container;
	}
}

class DataSource {

	static async load() {

		if(DataSource.list)
			return;
		const
			options = {
				method: 'POST',
			},
			responses = await Promise.all([
				API.call('v2/reports/report/list'),
				API.call('v2/dashboards/list'),
			]);

		DataSource.list = [];
		DataSource.dashboards = new Map;

		for(const report of responses[0] || [])
			DataSource.list.push(new DataSource(report));

		for(const dashboard of responses[1] || [])
			DataSource.dashboards.set(dashboard.id, new Dashboard(dashboard));

		for(const [id, dashboard] of DataSource.dashboards) {
			if(dashboard.parent && DataSource.dashboards.has(dashboard.parent))
				DataSource.dashboards.get(dashboard.parent).children.add(dashboard);
		}

		DataSource.datasets = new Map;

		// for(const row of responses[1]) {

		// 	if(!DataSource.datasets.has(row.dataset))
		// 		DataSource.datasets.set(row.dataset, new Set);

		// 	DataSource.datasets.get(row.dataset).add(row);
		// }

		DataSourceFilter.setup();
	}

	constructor(source) {

		for(const key in source)
			this[key] = source[key];

		this.filters = new Map;
		this.columns = new DataSourceColumns(this);
		this.visualizations = [];
		this.selectedRows = new Set;

		if(source.filters && source.filters.length)
			this.filters = new Map(source.filters.map(filter => [filter.placeholder, new DataSourceFilter(filter, this)]));

		if(!source.visualizations || !source.visualizations.length)
			source.visualizations = [];

		if(!source.visualizations.filter(v => v.type == 'table').length) {
			source.visualizations.push({
				visualization_id: 0,
				name: 'Table',
				type: 'table',
			});
		}

		this.visualizations = source.visualizations.map(v => Visualization.list.has(v.type) && new (Visualization.list.get(v.type))(v, this)).filter(a => a);
		this.postProcessors = new DataSourcePostProcessors(this);
	}

	async fetch(parameters = {}) {

		parameters.query_id = this.query_id;
		parameters.email = user.email;

		for(const filter of this.filters.values()) {
			if(!parameters.hasOwnProperty(filter.placeholder))
				parameters[filter.placeholder] = this.filters.form.elements[filter.placeholder].value;
		}

		const options = {
			method: 'POST',
		};

		const response = await API.call('v2/reports/engine/report', parameters, options);

		if(parameters.download)
			return response;

		this.originalResponse = response;

		const header = this.container.querySelector('header');

		if(!('timing' in response[0]))
			this.container.querySelector('.postprocessors').classList.add('hidden');

		this.columns.update();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('section');

		const container = this.containerElement;

		container.classList.add('data-source');
		container.dataset.id = this.query_id;

		container.innerHTML = `
			<header>
				<h2>${this.name}</h2>
				<button class="filters-toggle right"><i class="fa fa-filter" aria-hidden="true"></i>&nbsp; Filters</button>
				<button class="description-toggle" title="Description">&nbsp;<i class="fa fa-info"></i>&nbsp;</button>
				<button class="share-link" title="Share Report"><i class="fa fa-share-alt"></i></button>
				<button class="download" title="Download CSV"><i class="fa fa-download"></i></button>
			</header>
			<div class="description hidden">
				<div class="body">${this.description}</div>
				<div class="footer">
					Report Role: <strong>${this.roles && this.roles[0] ? this.roles[0] : 'No Role'}</strong>
					${this.users ? '<a>Visible to '+this.users.length+' people</a>' : ''}
				</div>
			</div>
			<div class="share-link hidden">
				<input type="url" value="${this.link}" readonly>
			</div>
			<form class="toolbar hidden"></form>
		`;

		container.querySelector('header').insertBefore(this.postProcessors.container, container.querySelector('.description-toggle'));

		// if(reportAuthors.includes(user.email)) {

		// 	container.querySelector('header').insertAdjacentHTML('beforeend', `
		// 		<button><i class="fa fa-pencil"></i></button>
		// 	`);

		// 	container.querySelector('header .fa-pencil').on('click', () => window.open(`/analytics-admin/#!/reports/${this.query_id}`))
		// }

		this.filters.form = container.querySelector('form.toolbar');

		container.querySelector('.filters-toggle').on('click', () => {
			this.filters.form.classList.toggle('hidden');
			container.querySelector('.filters-toggle').classList.toggle('selected');
		});

		container.querySelector('.description-toggle').on('click', () => {
			container.querySelector('.description').classList.toggle('hidden');
			container.querySelector('.description-toggle').classList.toggle('selected');
		});

		container.querySelector('.share-link').on('click', () => {
			container.querySelector('.share-link').classList.toggle('hidden');
			container.querySelector('.share-link').classList.toggle('selected');
			container.querySelector('.share-link input').select();
		});

		container.querySelector('.download').on('click', () => this.download());

		this.filters.form.on('submit', e => this.visualizations.selected.load(e));

		for(const filter of this.filters.values())
			this.filters.form.appendChild(filter.label);

		this.filters.form.insertAdjacentHTML('beforeend', `
			<label class="right">
				<br>
				<input type="submit" value="Submit">
			</label>
		`);

		if(this.visualizations.length) {

			const select = document.createElement('select');

			for(const v of this.visualizations) {
				select.insertAdjacentHTML('beforeend', `<option value="${v.visualization_id}">${v.name}</option>`);
			}

			select.on('change', async () => {

				container.removeChild(container.querySelector('.visualization'));

				this.visualizations.selected = this.visualizations.filter(v => v.visualization_id == select.value)[0];

				this.visualizations.selected.load();

				container.appendChild(this.visualizations.selected.container);
			});

			this.visualizations.selected = this.visualizations.filter(v => v.visualization_id == select.value)[0];

			if(this.visualizations.length > 1)
				container.querySelector('header').appendChild(select);

			container.appendChild(this.visualizations.selected.container);
		}

		return container;
	}

	get response() {

		let response = JSON.parse(JSON.stringify(this.originalResponse));

		if(this.postProcessors.selected)
			response = this.postProcessors.selected.processor(response);

		return response;
	}

	get _response() {

		let
			originalResponse = this.originalResponse,
			response = [];

		if(this.postProcessors.selected)
			originalResponse = this.postProcessors.selected.processor(originalResponse);

		for(const _row of originalResponse) {

			const row = new DataSourceRow(_row, this);

			if(!row.skip)
				response.push(row);
		}

		if(response.length && this.columns.sortBy && response[0].data.has(this.columns.sortBy.key)) {

			response.sort((a, b) => {

				const
					first = a.data.get(this.columns.sortBy.key).toString().toLowerCase(),
					second = b.data.get(this.columns.sortBy.key).toString().toLowerCase();

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

		str = Object.keys(response[0]).join() + '\r\n' + str.join('\r\n');

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

		let link = `/report/` + this.query_id;

		const parameters = new URLSearchParams();

		for(const [_, filter] of this.filters) {
			if(this.filters.form)
				parameters.set(filter.placeholder, this.filters.form.elements[filter.placeholder].value);
		}

		return link + '?' + parameters.toString();
	}
}

class DataSourceRow {

	constructor(row, source) {

		this.source = source;
		this.data = new Map;

		if(!row)
			return;

		const
			columnsList = this.source.columns.filtered,
			columnKeys = [...columnsList.keys()];

		for(const [key, column] of columnsList) {

			const
				query = column.search.querySelector('.query').value,
				searchType = column.search.querySelector('.search-type').value;

			if(query) {

				if(!row[key])
					this.skip = true;

				if(!DataSourceColumn.searchTypes[parseInt(searchType) || 0].apply(query, row[key]))
					this.skip = true;
			}

			this.data.set(key, row[key] || '');
		}

		// Sort the row by position of their columns in the source's columns map
		const values = [...this.data.entries()].sort((a, b) => columnKeys.indexOf(a[0]) - columnKeys.indexOf(b[0]));

		this.data.clear();

		for(const [key, value] of values)
			this.data.set(key, value);
	}

	get simple() {

		const result = {};

		for(const [key, value] of this.data)
			result[key] = value;

		return result;
	}
}

class DataSourceColumns {

	constructor(source) {

		this.source = source;
		this.list = new Map;
	}

	update() {

		if(!this.source.originalResponse || !this.source.originalResponse.length)
			return;

		for(const column in this.source.originalResponse[0]) {
			if(!this.list.has(column))
				this.list.set(column, new DataSourceColumn(column, this.source));
		}
	}

	get filtered() {

		const result = new Map;

		for(const [key, column] of this.list) {

			if(!column.disabled)
				result.set(key, column);
		}

		return result;
	}
}

class DataSourceColumn {

	constructor(column, source) {

		DataSourceColumn.colors = [
			'#ef6692',
			'#d6bcc0',
			'#ffca05',
			'#8595e1',
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
				name: 'RegExp',
				apply: (q, v) => q.toString().match(new RegExp(q, 'i')),
			},
		];

		DataSourceColumn.accumulationTypes = [
			{
				name: 'sum',
				apply: (rows, column) => Format.number(rows.reduce((c, v) => c + parseFloat(v.data.get(column)), 0)),
			},
			{
				name: 'average',
				apply: (rows, column) => Format.number(rows.reduce((c, v) => c + parseFloat(v.data.get(column)), 0) / rows.length),
			},
			{
				name: 'max',
				apply: (rows, column) => Format.number(Math.max(...rows.map(r => r.data.get(column)))),
			},
			{
				name: 'min',
				apply: (rows, column) => Format.number(Math.min(...rows.map(r => r.data.get(column)))),
			},
			{
				name: 'distinct',
				apply: (rows, column) => Format.number(new Set(rows.map(r => r.data.get(column))).size),
			},
		];

		this.key = column;
		this.source = source;
		this.name = this.key.split('_').map(w => w.trim()[0].toUpperCase() + w.trim().slice(1)).join(' ');
		this.disabled = 0;
		this.color = DataSourceColumn.colors[this.source.columns.size];
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
			this.accumulation.run();
			this.source.visualizations.selected.render();
			setTimeout(() => select.focus());
		});

		query.on('keyup', () => {
			this.searchQuery = query.value;
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
				data = this.source._response,
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

		processors.classList.add('postprocessors');

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
		return response.filter(r => new Date(r.timing).getDay() == this.container.value)
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

		const result = {};

		for(const row of response) {

			let period;

			const periodDate = new Date(row.timing);

			// Week starts from monday, not sunday
			if(this.container.value == 'week')
				period = periodDate.getDay() ? periodDate.getDay() - 1 : 6;

			else if(this.container.value == 'month')
				period = periodDate.getDate() - 1;

			const newDate = new Date(Date.parse(row.timing) - period * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

			if(!(newDate in result)) {

				result[newDate] = {};

				for(const key in row)
					result[newDate][key] = 0;
			}

			for(const key in row) {

				if(!isNaN(row[key]))
					result[newDate][key] += parseFloat(row[key]);

				else result[newDate][key] = row[key];
			}

			result[newDate].timing = row.timing;
		}

		return Object.values(result);
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
			result = {},
			copy = new Map;

		for(const row of response)
			copy.set(Date.parse(row.timing), row);

		for(const [timing, row] of copy) {

			if(!(timing in result)) {

				result[timing] = {};

				for(const key in row)
					result[timing][key] = 0;
			}

			for(let i = 0; i < this.container.value; i++) {

				const element = copy.get(timing - i * 24 * 60 * 60 * 1000);

				if(!element)
					continue;

				for(const key in result[timing])
					result[timing][key] += element[key] / this.container.value;
			}

			for(const key in result[timing])
				result[timing][key] = parseFloat(result[timing][key].toFixed(2));

			result[timing].timing = row.timing;
		}

		return Object.values(result);
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
			result = {},
			copy = new Map;

		for(const row of response)
			copy.set(Date.parse(row.timing), row);

		for(const [timing, row] of copy) {

			if(!(timing in result)) {

				result[timing] = {};

				for(const key in row)
					result[timing][key] = 0;
			}

			for(let i = 0; i < this.container.value; i++) {

				const element = copy.get(timing - i * 24 * 60 * 60 * 1000);

				if(!element)
					continue;

				for(const key in result[timing])
					result[timing][key] += parseFloat(element[key]);
			}

			for(const key in result[timing])
				result[timing][key] = parseFloat(result[timing][key].toFixed(2));

			result[timing].timing = row.timing;
		}

		return Object.values(result);
	}
});

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

		if(this.labelContaienr)
			return this.labelContaienr;

		this.labelContaienr = document.createElement('label');

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

		if(this.dataset && DataSource.datasets.has(this.dataset)) {

			input = document.createElement('select');
			input.name = this.placeholder;

			input.insertAdjacentHTML('beforeend', `<option value="">All</option>`);

			for(const row of DataSource.datasets.get(this.dataset))
				input.insertAdjacentHTML('beforeend', `<option value="${row.value}">${row.name}</option>`);
		}

		this.labelContaienr.innerHTML = `${this.name}<br>`;

		this.labelContaienr.appendChild(input);

		return this.labelContaienr;
	}
}

class Visualization {

	constructor(visualization, source) {

		for(const key in visualization)
			this[key] = visualization[key];

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

		this.container.querySelector('.container').innerHTML = `<caption class="loading"><i class="fa fa-spinner fa-spin"></i></caption>`;

		await this.source.fetch();

		this.render();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('section');

		container.classList.add('visualization', 'table');

		container.innerHTML = `
			<table class="container"></table>
		`;

		return container;
	}

	render() {

		const
			container = this.container.querySelector('.container'),
			response = this.source._response;

		container.textContent = null;

		const
			thead = document.createElement('thead'),
			search = document.createElement('tr'),
			accumulation = document.createElement('tr'),
			headings = document.createElement('tr');

		search.classList.add('search');
		accumulation.classList.add('accumulation');

		for(const column of this.source.columns.filtered.values()) {

			search.appendChild(column.search);
			accumulation.appendChild(column.accumulation);
			headings.appendChild(column.heading);
		}

		thead.appendChild(search);
		thead.appendChild(accumulation);
		thead.appendChild(headings);
		container.appendChild(thead);

		const tbody = document.createElement('tbody');

		for(const [position, row] of response.entries()) {

			if(position > this.rowLimit)
				break;

			const tr = document.createElement('tr');

			if(this.source.selectedRows.has(row))
				tr.classList.add('selected');

			for(const [key, column] of this.source.columns.filtered) {

				const td = document.createElement('td');

				td.textContent = row.data.get(key);

				tr.appendChild(td);
			}

			tr.on('click', () => tr.classList.toggle('selected'));

			tbody.appendChild(tr);
		}

		if(response.length > this.rowLimit) {

			const tr = document.createElement('tr');

			tr.classList.add('show-rows');

			tr.innerHTML = `
				<td colspan="${this.source.columns.filtered.size}">
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

		container.appendChild(tbody);

		if(!response || !response.length)
			return tbody.innerHTML = '<tr class="NA"><td colspan="5">Now data found! :(</td></tr>';
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
			<div id="area-${this.source.query_id}" class="container"></div>
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

		this.render();
	}

	async render() {

		await this.source.fetch();

		let data={};

		for(const result of this.source.response) {
			for(const key in result) {
				if(key == 'timing')
					continue;
				if(!data.hasOwnProperty(key))
					data[key]=[];

				data[key].push({date:result['timing'],x:null,y:result[key]})
			}
		}

		const series = [];
		for(var i = 0; i < Object.values(data).length; i++) {
			series.push({data:Object.values(data)[i],label:Object.keys(data)[i]})
		}

		this.D3Area({
			series: series.reverse(),
			divId: `#area-${this.source.query_id}`,
			chart: {},
			title: `${this.source.query_id}`,
			tooltip: {
				formatter: (data, legends, color) => {
					var string = [];
					if(!isNaN(data[0].date))
						string.push('<b>' + data[0].date + ' Hours</b>');
					else
						string.push('<b>' + Format.date(data[0].date) + '</b>');
					var max = 0;
					for(const y in data)
						max = Math.max(max,data[y].y)

					for(const number in data) {
						string.push('<span>' + '<span id="circ" style="background-color:' + color[number] + '"></span>' + legends[number] + ' : ' +
						Format.number(data[number].y)+' ('+((data[number].y / max) * 100).toFixed(2)+'%)</span>');
					}
					return string.join('<br>');
				}
			},
		});
	}

	D3Area(obj) {

		d3.selectAll(obj.divId).on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null)
			.on('click', null);

		var chart = {};

		var downloadFlag = false;
		var data = obj.series;

		 var
			margin = {top: 20, right: 30, bottom: 20, left: 50},
			width = (document.querySelector(obj.divId).clientWidth==0?600:document.querySelector(obj.divId).clientWidth) - margin.left - margin.right,
			height = obj.chart.height?obj.chart.height:460 - margin.top - margin.bottom,
			tickNumber = 5;

		var legendToggleTextFlag = false;

		//x
		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangePoints([0, width], 0.1, 0);

		//y
		var y = d3.scale.linear().range([height, margin.top]);

		var color = d3.scale.ordinal()
			.range(['#dfb955',
				'#edb28d',
				'#5E95E1',
				'#DD4949',
				'#49C3DD',
				'#849448',
				'#7A5D4B',
				'#A971D8',
				'#bbcbdb',
				'#9ebd9e',
				'#dd855c',
				'#f1e995',
				'#7AE1AB'
			]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")

		//Defining yAxis location at left the axes
		var yAxis = d3.svg.axis()
			.scale(y)
			.tickFormat(d3.format("s"))
			.innerTickSize(-width)

			.orient("left");

		//graph type line and
		var line = d3.svg.line()
			.x(function(d) {
				return x(d.date);
			})
			.y(function(d) {
				return y(d.y);
			});


		var count = 0;
		var stack = d3.layout.stack()
			.offset("zero")
			.values(function(d) {
				return d.data;
			})
			.x(function(d) {
				return x(d.date)
			})
			.y(function(d) {
				return d.y;
			});

		var area = d3.svg.area()
			.x(function(d) {
				return x(d.date)
			})
			.y0(function(d) {
				return y(d.y0)
			})
			.y1(function(d) {
				return y(d.y0 + d.y);
			});

		var mouseMoveHide = 'visible',
			HoverFlag = true;

		//calling legend and setting width,height,margin,color
		var legend;


		//Setting domain for the colors with te exceptioon of date column
		color.domain(data.map(function(d) {
			return d.label
		}));

		for (var i = 0; i < data.length; i++) {
			data[i].hover = false;
			data[i].disabled = true;
		}
		var cities = data;
		var rawData = JSON.parse(JSON.stringify(cities));
		var series, dataLength, zoom = true;

		//HammerJs functionality added
		var div = document.getElementById(obj.divId.indexOf("#") == -1 ? obj.divId : obj.divId.replace("#", ""));
		if (div == null) {
			return
		}

		//Update function to create chart
		chart.plot = () => {
			//Empty the container before loading

			d3.selectAll(obj.divId + " > *").remove();

			//Adding chart and placing chart at specific locaion using translate
			var svg = d3.select(obj.divId)
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("class", "chart")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			legend = d3Legend().height(height).width(width).margin(margin).color(color);

			//Filtering data if the column is disable or not
			series = cities.filter(function(d) {
				return d.disabled;
			});


			//Appending legend box
			svg.append('g')
				.attr('class', 'legendWrap');

			//legend location
			svg.select('.legendWrap').datum(cities)
				.attr('transform', 'translate(' + 0 + ',' + 0 + ')')
				.call(legend);

			if (svg.select('.legendWrap').node() && margin.bottom < (svg.select('.legendWrap').node().getBoundingClientRect().height + 30)) {
				margin.bottom = svg.select('.legendWrap').node().getBoundingClientRect().height + 30;
				chart.plot();
			}


			//on legend click toggle line
			legend.dispatch.on('legendClick', function(d) {
				d.disabled = !d.disabled;
				chart.plot();
			});

			//Chart Title
			// svg.append('g').attr('class','titleWrap').append('text')
			//   .attr("x", (width / 2))
			//   .attr("y",  (margin.top / 2))
			//   .attr("text-anchor", "middle")
			//   .style("font-size", "20px")
			//   .text(obj.title.text);

			//Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", (width / 2))
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")  //Appending rectangle styling
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", ((width / 2) - 2))
				.attr("y", -5)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			  d3.select(obj.divId + " > svg > g > g[class='resetZoom']") //Adding reset zoom text to the reset zoom rectangle
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", -5 + 12)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			//Click on reset zoom function
			d3.select(obj.divId + " > svg > g > g[class='resetZoom']").on("mousedown", function() {
				cities.forEach(function(d, i) {
					d.data = rawData[i].data;
				});
				zoom = true;
				chart.plot()

			});

			//check if the data is present or not
			if (series.length == 0 || series[0].data.length == 0) {
				//Chart Title
				svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.style("font-size", "20px")
					.text(obj.loading ? "Loading Data ..." : "No data to display");
				return;
			}

			stack(series);

			//storing the length of data so that the check can
			dataLength = series[0].data.length;

			//setting the upper an d lower limit in x - axis
			x.domain(series[0].data.map(function(d) {
				return d.date;
			}));

			//var mult = Math.max(1, Math.floor(width / x.domain().length));
			x.rangePoints([0, width], 0.1, 0);
			//setting the upper an d lower limit in y - axis
			y.domain([
				d3.min(series, function(c) {
					return d3.min(c.data, function(v) {
						return Math.floor(v.y0);
					});
				}),
				d3.max(series, function(c) {
					return d3.max(c.data, function(v) {
						return Math.ceil(v.y0 + v.y);
					});
				}) + 4
			]);

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter(function(d, i) {
				return !(i % tickInterval);
			});

			xAxis.tickValues(ticks);
			yAxis.innerTickSize(-width);

			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.append("text")
				.attr("x", (width / 2))
				.attr("y", 35)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.xAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");

			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", "-3.71em")
				.attr("dx", -((height) / 2) - margin.top)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.yAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");

			//Appending line in chart
			svg.selectAll(".city")
				.data(series)
				.enter().append("g")
				.attr("class", "city")
				.append("path")
				.attr("class", "streamPath")
				.transition()
				.duration(500)
				.ease('linear')
				.attr("d", function(d) {
					return area(d.data);
				})
				.attr("data-legend", function(d) {
					return d.label
				})
				.style("fill", function(d) {
					return color(d.label);
				})
				.style("opacity", "0.8")
				.style("stroke-width", "0px")
				.style("stroke", "#333333");

			//selecting all the paths
			var path = svg.selectAll("path");

			//For each line appending the circle at each point
			series.forEach(function(data) {
				var visibility = "visible";
				//                if the length of the
				if (data.data.length > 270) {
					visibility = "hidden";
				}
				svg.selectAll("dot")
					.data(data.data)
					.enter().append("circle")
					.attr('class', 'clips')
					.attr('id', function(d) {
						return parseInt(x(d.date))
					})
					.style('visibility', visibility)
					.attr("r", 0)
					.style('fill', color(data.label))
					.attr("cx", function(d) {
						return x(d.date);
					})
					.attr("cy", function(d) {
						return y(d.y + d.y0);
					});

			});

			var that = this;
			//
			//Hover functionality
			d3.selectAll(obj.divId).on('mousemove', function() {
					Tooltip.hide(that.container);
					var cord = d3.mouse(this);


					if (HoverFlag) {
						mouseMoveHide = 'visible'
					} else {
						mouseMoveHide = 'hidden'

					}

					if (cord[1] < 2 * margin.top || cord[1] > (height + 2 * margin.top) || cord[0] < margin.left || cord[0] > (width + margin.left) || series.length == 0 || series[0].data.length == 0) {
						return
					}

					d3.selectAll(obj.divId + ' > svg > g > circle[class="clips"]')
						.attr('r', dataLength > 200 ? 0 : 0);
					var flag = true;
					var xpos = parseInt(cord[0] - margin.left);
					while (d3.selectAll(obj.divId + " > svg > g > circle[id='" + (xpos) + "']")[0].length == 0) {
						if (flag) {
							xpos++
						} else {
							xpos--;
							if (xpos < 0) {
								break;
							}
						}
						if (xpos >= width && flag) {
							flag = false;
						}
					}

					var hover = d3.selectAll(obj.divId + " > svg > g > circle[id='" + xpos + "']")
						.attr('r', 6)
						.style('visibility', mouseMoveHide);
					var data = hover.data();
					var legends = series.map(function(d) {
						return d.label;
					});
					var colors = [];
					data.forEach(function(a, i) {
						colors[i] = color(legends[i]);
					});
					Tooltip.show(that.container, [cord[0], cord[1]], obj.tooltip.formatter(data, legends, colors), 'n');

				})
				.on('mouseout', function() {
					Tooltip.hide(that.container);
					var radius;
					if (dataLength > 200) {
						radius = 0
					} else {
						radius = 0
					}
					d3.selectAll(obj.divId + ' > svg > g > circle[class="clips"]')
						.attr('r', radius)
						.style('visibility', 'visible');
				});


			//zoming function
			if (dataLength > 30) {
				d3.selectAll(obj.divId)
					.on("mousedown", function() {

						//remove all the rectangele created before
						d3.selectAll(obj.divId + " > rect[class='zoom']").remove();

						//assign this toe,
						var e = this,
							origin = d3.mouse(e), // origin is the array containing the location of cursor from where the rectangle is created
							rect = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
						d3.select("body").classed("noselect", true); //disable select
						//find the min between the width and and cursor location to prevent the rectangle move out of the chart
						origin[0] = Math.max(0, Math.min(width, (origin[0] - margin.left)));
						HoverFlag = false;

						if (origin[1] < 2 * margin.top || origin[1] > (height + 2 * margin.top) || origin[0] < margin.left || origin[0] > (width + margin.left) || series.length == 0) {
							HoverFlag = true;
							return
						}
						//if the mouse is down and mouse is moved than start creating the rectangle
						d3.select(window)
							.on("mousemove.zoomRect", function() {
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
							.on("mouseup.zoomRect", function() { //function to run mouse is released

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
									cities.forEach(function(d) {

										//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
										if (d.data.length > 50) {
											d.data = d.data.filter(function(a) {
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
								HoverFlag = true;
								rect.remove();
							}, true);
						d3.event.stopPropagation();
					});
			}

			//When in mouse is over the line than focus the line
			path.on('mouseover', function(d) {
				d.hover = true;
				hover()
			});

			//When in mouse is put the line than focus the line
			path.on('mouseout', function(d) {
				d.hover = false;
				hover()
			});

			//on legend mouse over highlight the respective line
			legend.dispatch.on('legendMouseover', function(d) {
				d.hover = true;
				hover()
			});

			//on legend mouse out set the line to normal
			legend.dispatch.on('legendMouseout', function(d) {
				d.hover = false;
				hover()
			});


			function hover() {
				svg.selectAll("path").classed("line-hover", function(d) {
					return d.hover
				})
			}
		}

		setTimeout(function() {
			width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
			chart.plot();
		});


		window.addEventListener('resize', function() {
			if (width == (document.querySelector(obj.divId).clientWidth - margin.left - margin.right)) {
				console.log("width same")
			} else {
				width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
				chart.plot();

			}
		});

		chart.height = function(newHeight) {
			if (newHeight != height) {
				height = newHeight;
				chart.plot();
			}
		};

		chart.margin = function(_) {
			if (_) {
				margin = _;
				chart.plot();
			}
		};

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
			<div id="bar-${this.source.query_id}" class="container"></div>
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

		this.render();
	}

	async render() {

		await this.source.fetch();

		let data={};

		for(const result of this.source.response) {
			for(const key in result) {
				if(key == 'timing')
					continue;
				if(!data.hasOwnProperty(key))
					data[key]=[];

				data[key].push({date:result['timing'],x:null,y:result[key]})
			}
		}

		const series = [];
		for(var i = 0; i < Object.values(data).length; i++) {
			series.push({data:Object.values(data)[i],label:Object.keys(data)[i]})
		}

		this.D3GroupedBar({
			series: series.reverse(),
			divId: `#bar-${this.source.query_id}`,
			chart: {},
			title: `${this.source.query_id}`,
			tooltip: {
				formatter: (data, legends, color) => {
					var string = [];
					if(!isNaN(data[0].date))
						string.push('<b>' + data[0].date + ' Hours</b>');
					else
						string.push('<b>' + Format.date(data[0].date) + '</b>');
					var max = 0;
					for(const y in data)
						max = Math.max(max,data[y].y)

					for(const number in data) {
						string.push('<span>' + '<span id="circ" style="background-color:' + color[number] + '"></span>' + legends[number] + ' : ' +
						Format.number(data[number].y)+' ('+((data[number].y / max) * 100).toFixed(2)+'%)</span>');
					}
					return string.join('<br>');
				}
			},
		});
	}

	D3GroupedBar(obj) {

		d3.selectAll(obj.divId).on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null)
			.on('click', null);

		var tickNumber = 5;

		var chart = {};

		var data = obj.series;

		var downloadFlag = false;

		//Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 20, left: 50},
		width = (document.querySelector(obj.divId).clientWidth==0?600:document.querySelector(obj.divId).clientWidth) - margin.left - margin.right,
		height = obj.chart.height?obj.chart.height:460 - margin.top - margin.bottom;

		//Parse date function
		var legendToggleTextFlag = false;

		var color = d3.scale.ordinal()
			.range(['#4acab4',
				'#edb28d',
				'#5E95E1',
				'#DD4949',
				'#49C3DD',
				'#849448',
				'#dfb955',
				'#7A5D4B',
				'#A971D8',
				'#bbcbdb',
				'#9ebd9e',
				'#dd855c',
				'#f1e995',
				'#696267'
			]);

		var y = d3.scale.linear().range([height, margin.top]);


		var x0 = d3.scale.ordinal()
			.rangeBands([0, width], .2);

		var x1 = d3.scale.ordinal()
			.rangeBands([0, x0.rangeBand()], .5);

		var xAxis = d3.svg.axis()
			.scale(x0)
			.orient("bottom")

		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.tickFormat(d3.format("s"))
			.orient("left");

		var mouseMoveHide = 'visible',
			HoverFlag = true;

		//calling legend and setting width,height,margin,color
		var legend

		//Setting domain for the colors with te exceptioon of date column
		color.domain(data.map(function(d) {
			return d.label
		}));

		var cities = data.map(function(d) {
			return d.data.map(function(d) {
				return {
					date: d.date,
					y: +d.y
				}
			})
		})

		for (var i = 0; i < cities.length; i++) {
			var cityCopyObj = {};
			cityCopyObj.data = cities[i];
			cityCopyObj.label = color.domain()[i];
			cityCopyObj.hover = false;
			cityCopyObj.disabled = true;
			cities[i] = cityCopyObj
		}

		var rawData = JSON.parse(JSON.stringify(cities))
		var series, dataLength, zoom = true;


		//HammerJs functionality added
		var div = document.getElementById(obj.divId.indexOf("#") == -1 ? obj.divId : obj.divId.replace("#", ""));
		if (div == null) {
			return
		}

		chart.plot = () => {

			//Empty the container before loading
			d3.selectAll(obj.divId + " > *").remove();

			var svg = d3.select(obj.divId)
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("class", "chart")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			legend = d3Legend().height(height).width(width).margin(margin).color(color);

			series = cities.filter(function(d) {
				return d.disabled;
			});

			//Appending legend box
			svg.append('g')
				.attr('class', 'legendWrap');

			//legend location
			svg.select('.legendWrap').datum(cities)
				.attr('transform', 'translate(' + 0 + ',' + 0 + ')')
				.call(legend);

			if (svg.select('.legendWrap').node() && margin.bottom < (svg.select('.legendWrap').node().getBoundingClientRect().height + 30)) {
				margin.bottom = svg.select('.legendWrap').node().getBoundingClientRect().height + 30;
				chart.plot();
			}

			//on legend click toggle line
			legend.dispatch.on('legendClick', function(d) {
				d.disabled = !d.disabled;
				chart.plot();
			});

			//Chart Title
			// svg.append('g').attr('class', 'titleWrap').append('text')
			//   .attr("x", (width / 2))
			//   .attr("y", (margin.top / 2))
			//   .attr("text-anchor", "middle")
			//   .style("font-size", "20px")
			//   .text(obj.title.text);

			//Reset Zoom Button
			 svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", (width / 2))
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")  //Appending rectangle styling
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", ((width / 2) - 2))
				.attr("y", -5)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			  d3.select(obj.divId + " > svg > g > g[class='resetZoom']") //Adding reset zoom text to the reset zoom rectangle
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", -5 + 12)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			var qkeyButton = {},
				textLength = 0

			//Click on reset zoom function
			d3.select(obj.divId + " > svg > g > g[class='resetZoom']").on("mousedown", function() {
				cities.forEach(function(d, i) {
					d.data = rawData[i].data;
				});
				zoom = true;
				chart.plot()

			});

			//check if the data is present or not
			if (series.length == 0 || series[0].data.length == 0) {
				//Chart Title
				svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.style("font-size", "20px")
					.text(obj.loading ? "Loading Data ..." : "No data to display");
				return;
			}

			y.domain([0,
				d3.max(series, function(c) {
					return d3.max(c.data, function(v) {
						return Math.ceil(v.y);
					});
				})
			]).nice();

			x0.domain(series[0].data.map(function(d) {
				return d.date;
			}));

			x0.rangeBands([0, width], 0.1, 0);
			var tickInterval = parseInt(x0.domain().length / tickNumber);


			var ticks = x0.domain().filter(function(d, i) {
				return !(i % tickInterval);
			});

			xAxis.tickValues(ticks);

			x1.domain(color.domain()).rangeBands([0, x0.rangeBand()]);


			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", "-3.71em")
				.attr("dx", -((height) / 2) - margin.top)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.yAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");

			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.append("text")
				.attr("x", (width / 2))
				.attr("y", 35)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.xAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");


			svg.append("g").selectAll("g")
				.data(series)
				.enter().append("g")
				.style("fill", function(d, i) {
					return color(d.label);
				})
				.attr("transform", function(d, i) {
					return "translate(" + x1(d.label) + ",0)";
				})
				.selectAll("rect")
				.data(function(d) {
					return d.data;
				})
				.enter().append("rect")
				.attr("width", x1.rangeBand())
				.attr("height", function(d) {
					return y(d.y);
				})
				.attr("x", function(d, i) {
					return x0(d.date);
				})
				.attr("y", function(d) {
					return height - y(d.y);
				})
				.transition()
				.duration(500)
				.ease("linear")
				.attr("height", function(d) {
					return height - y(d.y);
				})
				.attr("y", function(d) {
					return y(d.y);
				});

			var rectangle = svg.selectAll('rect')
			var that = this;

			//mouse over function
			rectangle
				.on('mousemove', function(d) {

					Tooltip.hide(that.container);

					if (!d || !d.date || !series.length || !series[0].data.length)
						return;

					const
						cord = d3.mouse(this),
						legends = series.map(d => d.label),
						colors = []

					var	xpos = parseInt(Math.max(0, cord[0]) / (width / series[0].data.length)),
						tempData = series.map(d => d.data[xpos]);

					xpos = Math.min(series[0].data.length - 1, xpos);

					data.forEach((a, i) => colors[i] = color(legends[i]));

					Tooltip.show(that.container, [x0(d.date) + margin.left + x0.rangeBand() / 2, cord[1]], obj.tooltip.formatter(tempData, legends, colors), 'n');
				})
				.on('mouseout', function(d) {
					Tooltip.hide(that.container);
				});

			//zoming function
			d3.selectAll(obj.divId)
				.on("mousedown", function(d) {
					//remove all the rectangele created before
					d3.selectAll(obj.divId + " > rect[class='zoom']").remove();
					//assign this toe,
					var e = this,
						origin = d3.mouse(e), // origin is the array containing the location of cursor from where the rectangle is created
						rectSelected = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
					d3.select("body").classed("noselect", true); //disable select
					//find the min between the width and and cursor location to prevent the rectangle move out of the chart
					origin[0] = Math.max(0, Math.min(width, (origin[0])));
					HoverFlag = false;

					if (origin[1] < 2 * margin.top || origin[1] > (height + 2 * margin.top) || origin[0] < margin.left || origin[0] > (width + margin.left) || series.length == 0) {
						HoverFlag = true;
						return
					}
					//if the mouse is down and mouse is moved than start creating the rectangle
					d3.selectAll(obj.divId)
						.on("mousemove.zoomRect", function(d) {

							//current location of mouse
							var m = d3.mouse(e);
							//find the min between the width and and cursor location to prevent the rectangle move out of the chart
							m[0] = Math.max(0, Math.max(margin.left, Math.min(width + margin.left, (m[0]))));

							//asign width and height to the rectangle
							rectSelected.attr("x", Math.min(origin[0], m[0]))
								.attr("y", (margin.top))
								.attr("width", Math.abs(m[0] - origin[0]))
								.attr("height", height - margin.top);
						})
						.on("mouseup.zoomRect", function(d) { //function to run mouse is released

							//stop above event listner
							d3.select(obj.divId).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);

							//allow selection
							d3.select("body").classed("noselect", false);
							var m = d3.mouse(e);

							//the position where the mouse the released
							m[0] = Math.max(0, Math.min(width, (m[0])));

							//check that the origin location on x axis of the mouse should not be eqaul to last
							if (m[0] !== origin[0] && series[0].data.length > 20) {

								cities.forEach(function(d) {

									//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
									if (d.data.length > 10) {
										d.data = d.data.filter(function(a) {
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
							HoverFlag = true;
							rectSelected.remove();

						}, true);
					d3.event.stopPropagation();
				});
		};

		setTimeout(function() {
			width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
			chart.plot()
		});


		window.addEventListener('resize', function() {
			if (width == (document.querySelector(obj.divId).clientWidth - margin.left - margin.right)) {
				console.log("width same")
			} else {
				width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
				chart.plot();

			}
		});

		chart.height = function(newHeight) {
			if (newHeight != height) {
				height = newHeight;
				chart.plot();
			}
		};

		chart.margin = function(_) {
			if (_) {
				margin = _;
				chart.plot();
			}
		};
		return chart;
	}
});

Visualization.list.set('stacked', class Stacked extends Visualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		this.containerElement = document.createElement('div');

		const container = this.containerElement;

		container.classList.add('visualization', 'stacked');
		container.innerHTML = `
			<div id="stacked-${this.source.query_id}" class="container"></div>
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

		this.render();
	}

	async render() {

		await this.source.fetch();

		let data={};

		for(const result of this.source.response) {
			for(const key in result) {
				if(key == 'timing')
					continue;
				if(!data.hasOwnProperty(key))
					data[key]=[];

				data[key].push({date:result['timing'],x:null,y:result[key]})
			}
		}

		const series = [];
		for(var i = 0; i < Object.values(data).length; i++) {
			series.push({data:Object.values(data)[i],label:Object.keys(data)[i]})
		}

		this.D3Stacked({
			series: series.reverse(),
			divId: `#stacked-${this.source.query_id}`,
			chart: {},
			title: `${this.source.query_id}`,
			tooltip: {
				formatter: (data, legends, color) => {
					var string = [];
					if(!isNaN(data[0].date))
						string.push('<b>' + data[0].date + ' Hours</b>');
					else
						string.push('<b>' + Format.date(data[0].date) + '</b>');
					var max = 0;
					for(const y in data)
						max = Math.max(max,data[y].y)
					var total = 0;
					for(const number in data) {
						string.push('<span>' + '<span id="circ" style="background-color:' + color[number] + '"></span>' + legends[number] + ' : ' +
						Format.number(data[number].y)+' ('+((data[number].y / max) * 100).toFixed(2)+'%)</span>');
						total = total + data[number].y;
					}

					string.push('<span>' + '<span id="circ" style="background-color:' + 'transparent' + '"></span> Total : ' +
						Format.number(total) +'</span>');

					return string.join('<br>');
				}
			},
		});
	}

	D3Stacked(obj) {

		d3.selectAll(obj.divId).on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null)
			.on('click', null);

		var chart = {};

		var data = obj.series;

		var downloadFlag = false;

		//Setting margin and width and height
		var margin = {top: 20, right: 30, bottom: 20, left: 50},
			width = (document.querySelector(obj.divId).clientWidth==0?600:document.querySelector(obj.divId).clientWidth) - margin.left - margin.right,
			height = obj.chart.height?obj.chart.height:460 - margin.top - margin.bottom,
			tickNumber = 5;

		//Parse date function
		var legendToggleTextFlag = false;

		//x
		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangeBands([0, width], 0.1, 0);

		//y
		var y = d3.scale.linear().range([height, margin.top]);

		var color = d3.scale.ordinal()
			.range(['#4acab4',
				'#edb28d',
				'#5E95E1',
				'#DD4949',
				'#49C3DD',
				'#849448',
				'#dfb955',
				'#7A5D4B',
				'#A971D8',
				'#bbcbdb',
				'#9ebd9e',
				'#dd855c',
				'#f1e995',
				'#696267'
			]);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		//Defining yAxis location at left the axes
		var yAxis = d3.svg.axis()
			.scale(y)
			.innerTickSize(-width)
			.tickFormat(d3.format("s"))
			.orient("left");

		var mouseMoveHide = 'visible',
			HoverFlag = true;

		//calling legend and setting width,height,margin,color
		var legend;

		//Setting domain for the colors with te exceptioon of date column
		color.domain(data.map(function(d) {
			return d.label
		}));

		var cities = d3.layout.stack()(data.map(function(d) {
			return d.data.map(function(d) {
				return {
					date: d.date,
					y: +d.y
				}
			})
		}));

		for (var i = 0; i < cities.length; i++) {
			var cityCopyObj = {};
			cityCopyObj.data = cities[i];
			cityCopyObj.label = color.domain()[i];
			cityCopyObj.hover = false;
			cityCopyObj.disabled = true;
			cities[i] = cityCopyObj
		}

		var rawData = JSON.parse(JSON.stringify(cities));
		var series, dataLength, zoom = true;

		//HammerJs functionality added
		var div = document.getElementById(obj.divId.indexOf("#") == -1 ? obj.divId : obj.divId.replace("#", ""));
		if (div == null) {
			return
		}

		chart.plot = () => {

			//Empty the container before loading
			d3.selectAll(obj.divId + " > *").remove();
			//Adding chart and placing chart at specific locaion using translate
			var svg = d3.select(obj.divId)
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("class", "chart")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			legend = d3Legend().height(height).width(width).margin(margin).color(color);

			//Filtering data if the column is disable or not
			var series = cities.filter(function(d) {
				return d.disabled;
			});

			//Appending legend box
			svg.append('g')
				.attr('class', 'legendWrap');

			//legend location
			svg.select('.legendWrap').datum(cities)
				.attr('transform', 'translate(' + 0 + ',' + 0 + ')')
				.call(legend);

			if (svg.select('.legendWrap').node() && margin.bottom < (svg.select('.legendWrap').node().getBoundingClientRect().height + 30)) {
				margin.bottom = svg.select('.legendWrap').node().getBoundingClientRect().height + 30;
				chart.plot();
			}

			//on legend click toggle line
			legend.dispatch.on('legendClick', function(d) {
				d.disabled = !d.disabled;
				chart.plot();
			});

			//Reset Zoom Button
			svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", (width / 2))
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")  //Appending rectangle styling
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", ((width / 2) - 2))
				.attr("y", -5)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			  d3.select(obj.divId + " > svg > g > g[class='resetZoom']") //Adding reset zoom text to the reset zoom rectangle
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", -5 + 12)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			//Click on reset zoom function
			d3.select(obj.divId + " > svg > g > g[class='resetZoom']").on("mousedown", function() {
				cities.forEach(function(d, i) {
					d.data = rawData[i].data;
				});
				zoom = true;
				chart.plot();
			});

			//check if the data is present or not
			if (series.length == 0 || series[0].data.length == 0) {
				//Chart Title
				svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.style("font-size", "20px")
					.text(obj.loading ? "Loading Data ..." : "No data to display");
				return;
			}


			var temp = d3.layout.stack()(series.map(function(c) {
				return c.data.map(function(d) {
					return {
						date: d.date,
						y: +d.y
					};
				})
			}));
			for (var i = 0; i < series.length; i++) {
				series[i].data = temp[i]
			}
			x.domain(series[0].data.map(function(d) {
				return d.date;
			}));
			x.rangeBands([0, width], 0.1, 0);
			y.domain([
				0,
				d3.max(series, function(c) {
					return d3.max(c.data, function(v) {
						return Math.ceil(v.y0 + v.y);
					});
				}) + 4
			]).nice();

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter(function(d, i) {
				return !(i % tickInterval);
			});
			xAxis.tickValues(ticks);

			//Appending y - axis
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", "-3.71em")
				.attr("dx", -((height) / 2) - margin.top)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.yAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");


			//Appending x - axis
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.append("text")
				.attr("x", (width / 2))
				.attr("y", 35)
				.style("text-anchor", "middle")
				.attr("class", "axis-label")
				.text(obj.xAxis && obj.xAxis.title.text ? obj.xAxis.title.text : "");

			var layer = svg.selectAll(".layer")
				.data(series)
				.enter().append("g")
				.attr("class", "layer")
				.style("fill", function(d, i) {
					return color(d.label);
				});

			layer.selectAll("rect")
				.data(function(d) {
					return d.data;
				})
				.enter().append("rect")
				.attr("x", function(d) {
					return x(d.date);
				})
				.attr("y", function(d) {
					return y(d.y);
					return y(d.y0) - y(d.y + d.y0);
				})
				.attr("width", x.rangeBand())
				.transition()
				.duration(400)
				.ease('quad-in')
				.attr("height", function(d) {
					return y(d.y0) - y(d.y + d.y0);
				})
				.attr("y", function(d) {
					return y(d.y + d.y0)
				});

			//selecting all the paths
			var path = svg.selectAll("rect");
			var that = this;

			var rectangle = d3.selectAll('rect');
			path.on('mouseover', null);
			//mouse over function
			path
				.on('mousemove', function(d) {

					Tooltip.hide(that.container);

					if (!d || !d.date || !series.length || !series[0].data.length)
						return;

					const
						cord = d3.mouse(this),
						legends = series.map(d => d.label),
						colors = [];
					var xpos = parseInt(Math.max(0, cord[0]) / (width / series[0].data.length)),
						tempData = series.map(d => d.data[xpos]);

					xpos = Math.min(series[0].data.length - 1, xpos);

					data.forEach((a, i) => colors[i] = color(legends[i]));

					Tooltip.show(that.container, [x(d.date) + margin.left + x.rangeBand() / 2 - 30, cord[1]], obj.tooltip.formatter(tempData, legends, colors), 'n');
				})
				.on('mouseout', function(d) {
					Tooltip.hide(that.container);
				});


			//zoming function
			d3.selectAll(obj.divId)
				.on("mousedown", function(d) {
					//remove all the rectangele created before
					d3.selectAll(obj.divId + " > rect[class='zoom']").remove();
					//assign this toe,
					var e = this,
						origin = d3.mouse(e), // origin is the array containing the location of cursor from where the rectangle is created
						rectSelected = svg.append("rect").attr("class", "zoom"); //apending the rectangle to the chart
					d3.select("body").classed("noselect", true); //disable select
					//find the min between the width and and cursor location to prevent the rectangle move out of the chart
					origin[0] = Math.max(0, Math.min(width, (origin[0])));
					HoverFlag = false;
					if (origin[1] < 2 * margin.top || origin[1] > (height + 2 * margin.top) || origin[0] < margin.left || origin[0] > (width + margin.left) || series.length == 0) {
						HoverFlag = true;
						return
					}
					//if the mouse is down and mouse is moved than start creating the rectangle
					d3.selectAll(obj.divId)
						.on("mousemove.zoomRect", function(d) {
							//current location of mouse
							var m = d3.mouse(e);
							//find the min between the width and and cursor location to prevent the rectangle move out of the chart
							m[0] = Math.max(0, Math.max(margin.left, Math.min(width + margin.left, (m[0]))));

							//asign width and height to the rectangle
							rectSelected.attr("x", Math.min(origin[0], m[0]))
								.attr("y", margin.top)
								.attr("width", Math.abs(m[0] - origin[0]))
								.attr("height", height - margin.top);
						})
						.on("mouseup.zoomRect", function(d) { //function to run mouse is released

							//stop above event listner
							d3.select(obj.divId).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);

							//allow selection
							d3.select("body").classed("noselect", false);
							var m = d3.mouse(e);

							//the position where the mouse the released
							m[0] = Math.max(0, Math.min(width, (m[0])));

							//check that the origin location on x axis of the mouse should not be eqaul to last
							if (m[0] !== origin[0] && series[0].data.length > 20) {

								cities.forEach(function(d) {

									//slicing each line if and only if the length of data > 50 (minimum no of ticks should be present in the graph)
									if (d.data.length > 10) {
										d.data = d.data.filter(function(a) {
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
							HoverFlag = true;
							rectSelected.remove();
						}, true);
					d3.event.stopPropagation();
				});
		} //END Chart Plot Function

		setTimeout(function() {
			width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
			chart.plot()
		});

		window.addEventListener('resize', function() {
			width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
			chart.plot();
		});

		chart.height = function(newHeight) {
			if (newHeight != height) {
				height = newHeight;
				chart.plot();
			}
		};

		chart.margin = function(_) {
			if (_) {
				margin = _;
				chart.plot();
			}
		};
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

			for(const column of row.data || [])
				this.max = Math.max(this.max, column.count);
		}
	}

	render() {

		this.containerElement.textContent = null;

		const
			table = document.createElement('table'),
			tbody = document.createElement('tbody'),
			type = this.source.filters.get('type').label.querySelector('input').value;

		table.insertAdjacentHTML('beforeend', `
			<thead>
				<tr>
					<th class="sticky">${type[0].toUpperCase() + type.substring(1)}</th>
					<th class="sticky">Cohort Size</th>
					<th class="sticky">
						${this.source.response[0].data.map((v, i) => type[0].toUpperCase()+type.substring(1)+' '+(++i)).join('</th><th class="sticky">')}
					</th>
				</tr>
			</thead>
		`);

		for(const row of this.source.response) {

			const cells = [];

			for(const cell of row.data) {

				let contents = Format.number(cell.percentage) + '%';

				if(cell.href)
					contents = `<a href="${cell.href}" target="_blank">${contents}</a>`;

				cells.push(`
					<td style="${this.getColor(cell.count)}" class="${cell.href ? 'href' : ''}" title="${cell.description}">
						${contents}
					</td>
				`);
			}

			let size = Format.number(row.size);

			if(row.baseHref)
				size = `<a href="${row.baseHref}" target="_blank">${size}</a>`;

			tbody.insertAdjacentHTML('beforeend', `
				<tr>
					<td class="sticky">${Format.date(row.timing)}</td>
					<td class="sticky ${row.baseHref ? 'href' : ''}">${size}</td>
					${cells.join('')}
				</tr>
			`);
		}

		table.appendChild(tbody);
		this.containerElement.appendChild(table);
	}

	getColor(count) {

		const intensity = Math.floor((this.max - count) / this.max * 255);

		return `background: rgba(255, ${intensity}, ${intensity}, 0.8)`;
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
			<div class="container"></div>
		`;

		return container;
	}

	async load(parameters = {}) {

		await this.source.fetch(parameters);

		this.render();
	}

	render() {

		const
			location = 0, //
			center = [
				(location.latitude_upper + location.latitude_lower) / 2,
				(location.longitude_upper + location.longitude_lower) / 2
			],
			markers = [];

		// If the maps object wasn't already initialized
		if(!this.map)
			this.map = new google.maps.Map(this.containerElement.querySelector('.container'), { zoom: 12 });

		// If the clustered object wasn't already initialized
		if(!this.clusterer)
			this.clusterer = new MarkerClusterer(this.map, null, { imagePath: 'app/images/m' });

		// Add the marker to the markers array
		for(var i = 0; i < this.source.response.length; i++) {
			markers.push(
				new google.maps.Marker({
					position: {
						lat: this.source.response[i].latitude,
						lng: this.source.response[i].longitude,
					}
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
			lat: center[0],
			lng: center[1],
		});
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
			<div id="line-${this.source.query_id}" class="container"></div>
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

		this.render();
	}

	render() {

		let data={};

		for(const result of this.source.response) {
			for(const key in result) {
				if(key == 'timing')
					continue;
				if(!data.hasOwnProperty(key))
					data[key]=[];

				data[key].push({date:result['timing'],x:null,y:result[key]})
			}
		}

		const series = [];
		for(var i = 0; i < Object.values(data).length; i++) {
			series.push({data:Object.values(data)[i],label:Object.keys(data)[i]})
		}

		this.D3Line({
			series: series.reverse(),
			divId: `#line-${this.source.query_id}`,
			chart: {},
			title: `${this.source.query_id}`,
			tooltip: {
				formatter: (data, legends, color) => {

					const tooltip = [];

					var max = 0;
					for(const y in data)
						max = Math.max(max,data[y].y)

					for(const key in data) {

						if(key == 'timing')
							continue;

						tooltip.push(`
							<li>
								<span class="circle" style="background:${color[key]}"></span>
								<span>${legends[key]}</span>
								<span class="value">${Format.number(data[key].y)+' ('+((data[key].y / max) * 100).toFixed(2)+'%)'}</span>
							</li>
						`);
					}

					return `
						<header>${Format.date(data[0].date)}</header>
						<ul class="body">
							${tooltip.join('')}
						</ul>
					`;
				}
			},
		});
	}

	D3Line(obj) {
	  d3.selectAll(obj.divId).on('mousemove',null)
		.on('mouseout',null)
		.on('mousedown',null);

	  var chart = {};

	  var data = obj.series;

	  var downloadFlag = false;

	  //Setting margin and width and height
	  var margin = {top: 20, right: 50, bottom: 20, left: 50},
		width = (document.querySelector(obj.divId).clientWidth==0?600:document.querySelector(obj.divId).clientWidth) - margin.left - margin.right,
		height = obj.chart.height?obj.chart.height:460 - margin.top - margin.bottom;


		var disbleHover = false;
	  var legendToggleTextFlag = false,tickNumber=5;

	  //x
	  var x = d3.scale.ordinal()
		.domain([0, 1])
		.rangePoints([0, width], 0.1, 0);
	  //y
	  var y = d3.scale.linear().range([height, margin.top]);

	  var color = d3.scale.ordinal()
		.range(["#ef6692",
		  "#d6bcc0",
		  "#ffca05",
		  "#8595e1",
		  "#8dd593",
		  "#ff8b75",
		  "#2a0f54",
		  "#d33f6a",
		  "#f0b98d",
		  "#6c54b5",
		  "#bb7784",
		  "#b5bbe3",
		  "#0c8765",
		  "#ef9708",
		  "#1abb9c",
		  "#9da19c"]);

	  // Defining xAxis location at bottom the axes
	  var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	  //Defining yAxis location at left the axes
	  var yAxis = d3.svg.axis()
		.scale(y)
		.tickFormat(d3.format("s"))
		.innerTickSize(-width)
		.orient("left");

	  //graph type line and
	  var line = d3.svg.line()
		.x(function (d) {
		  return x(d.date);
		})
		.y(function (d) {
		  return y(d.y);
		});


	  //calling legend and setting width,height,margin,color
	  var legend;


	  var mouseMoveHide = 'visible',
		HoverFlag = true;

	  //Setting domain for the colors with te exceptioon of date column
	  color.domain(data.map(function (d) {
		return d.label
	  }));



	  for(var i=0;i<data.length;i++){
		data[i].hover = false;
		data[i].disabled = true
	  }


	  var cities = data;
	  var rawData = JSON.parse(JSON.stringify(cities));
	  var series, dataLength,zoom = true;

	  //HammerJs functionality added
	  var div = document.getElementById(obj.divId.indexOf("#")==-1?obj.divId:obj.divId.replace("#",""));
	  if(div==null){
		return
	  }
		function dateHasAnnotations(date) {
			return false;
		}

	  //chart function to create chart
		chart.plot = () => {

			//Empty the container before loading
			d3.selectAll(obj.divId+" > *").remove();

			//Adding chart and placing chart at specific locaion using translate
			var svg = d3.select(obj.divId)
			  .append("svg")
			  .attr("width", width + margin.left + margin.right)
			  .attr("height", height + margin.top + margin.bottom)
			  .append("g")
			  .attr("class", "chart")
			  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			//Filtering data if the column is disable or not
			series = cities.filter(function (d) {
			  return d.disabled;
			});

			legend = d3Legend().height(height).width(width+margin.left+margin.right).margin(margin).color(color);

			//Appending legend box
			svg.append('g')
			  .attr('class', 'legendWrap');

			//legend location
			svg.select('.legendWrap').datum(cities)
			  .attr('transform', 'translate(' + 0 + ',' + 0 + ')')
			  .call(legend);


			if(svg.select('.legendWrap').node()&&margin.bottom<(svg.select('.legendWrap').node().getBoundingClientRect().height+30)){
			  margin.bottom = svg.select('.legendWrap').node().getBoundingClientRect().height+30;
			  chart.plot();
			}


			//on legend click toggle line
			legend.dispatch.on('legendClick', function (d) {
			  d.disabled = !d.disabled;
			  chart.plot();
			});

			//Chart Title
			// svg.append('g').attr('class','titleWrap').append('text')
			//   .attr("x", (margin.left-80))
			//   .attr("y", (margin.top / 2))
			//   .attr("text-anchor", "left")
			//   .style("font-size", "25px")
			//   .style("fill", "#2a3f54")
			//   .text(obj.title.text);


			//Reset Zoom Button
			  svg.append('g').attr('class', 'resetZoom')
				.classed("toggleReset", zoom)
				.attr("x", (width / 2))
				.attr("y", -10)
				.style("z-index", 1000)
				.append("rect")  //Appending rectangle styling
				.attr("width", 80)
				.attr("height", 20)
				.attr("x", ((width / 2) - 2))
				.attr("y", -5)
				.attr("rx", 2)
				.style("fill", "#f2f2f2")
				.style("stroke", "#666666")
				.style("stroke-width", "1px");

			  d3.select(obj.divId + " > svg > g > g[class='resetZoom']") //Adding reset zoom text to the reset zoom rectangle
				.append("text")
				.attr("x", ((width / 2) + 40))
				.attr("y", -5 + 12)
				.attr("text-anchor", "middle")
				.style("font-size", "12px")
				.text("Reset Zoom");

			//Click on reset zoom function
			d3.select(obj.divId+" > svg > g > g[class='resetZoom']").on("mousedown",function () {
			  cities.forEach(function (d,i) {
				d.data = rawData[i].data;
			  });
			  zoom = true;
			  chart.plot()
			});

			//check if the data is present or not
			if(series.length==0 || series[0].data.length==0){
			  //Chart Title
			  svg.append('g').attr('class','noDataWrap').append('text')
				.attr("x", (width / 2))
				.attr("y",  (height / 2))
				.attr("text-anchor", "middle")
				.style("font-size", "20px")
				.text((obj.loading && obj.series !== null)?"Loading Data ...":"No data to display");
			  return;
			}

			//storing the length of data so that the check can
			dataLength = series[0].data.length;

			//setting the upper an d lower limit in x - axis
			x.domain(series[0].data.map(function (d) {
			  return d.date;
			}));

			//var mult = Math.max(1, Math.floor(width / x.domain().length));
			  x.rangePoints([0, width], 0.1, 0);
			y.domain([
			  d3.min(series, function (c) {
				return d3.min(c.data, function (v) {
				  return Math.floor(v.y);
				});
			  }),
			  d3.max(series, function (c) {
				return d3.max(c.data, function (v) {
				  return Math.ceil(v.y);
				});
			  })
			]);


			if(window.innerWidth<=768) {
			  tickNumber = 2;
			}
			  var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter(function (d, i) {
			  return !(i % tickInterval);
			});


			xAxis.tickValues(ticks);
			yAxis.innerTickSize(-width);




			//Appending x - axis
			svg.append("g")
			  .attr("class", "x axis")
			  .attr("transform", "translate(0," + height + ")")
			  .call(xAxis)
			  .append("text")
			  .attr("x", (width / 2))
			  .attr("y", 35)
			  .style("text-anchor", "middle")
			  .attr("class","axis-label")
			  .text(obj.xAxis&&obj.xAxis.title.text?obj.xAxis.title.text:"");

			//Appending y - axis
			svg.append("g")
			  .attr("class", "y axis")
			  .call(yAxis)
			  .append("text")
			  .attr("transform", "rotate(-90)")
			  .attr("y", 6)
			  .attr("dy", "-3.71em")
			  .attr("dx", -((height)/2)-margin.top)
			  .style("text-anchor", "middle")
			  .attr("class","axis-label")
			  .text(obj.yAxis&&obj.yAxis.title.text?obj.yAxis.title.text:"");


			//Appending line in chart
			svg.selectAll(".city")
			  .data(series)
			  .enter().append("g")
			  .attr("class", "city")
			  .append("path")
			  .attr("class", "line")
			  .attr("d", function (d) {
				return line(d.data);
			  })
			  .attr("data-legend", function (d) {
				return d.label
			  })
			  .style("stroke", function (d) {
				return color(d.label);
			  })
			  .classed("line-hover", false);


			//selecting all the paths
			var path = svg.selectAll("path");

			//For each line appending the circle at each point
			  series.forEach(function (data) {
				var visibility = "visible";
				//if the length of the
				if (data.data.length > 270) {
				  visibility = "hidden";
				}
				svg.selectAll("dot")
				  .data(data.data)
				  .enter().append("circle")
				  .attr('class', function(d) {
					return dateHasAnnotations(d.date) ? 'clips annotation-circle' : 'clips';
				  })
				  .attr('id', function (d) {
					return parseInt(x(d.date))
				  })
				  .style('visibility', visibility)
				  .attr("r", function(d) {
					return dateHasAnnotations(d.date) ? 3 : 0;
				  })
				  .style('fill', function(d) {
					return dateHasAnnotations(d.date) ? '#666' : color(data.label);
				  })
				  .attr("cx", function (d) {
					return x(d.date);
				  })
				  .attr("cy", function (d) {
					return y(d.y);
				  })
				  .on('click', function(d) {
					if(dateHasAnnotations(d.date))
					  annotate(d.date);
				  })
			});


			var lastXpos;
			var that = this;

			d3.selectAll(obj.divId)
			.on('mousemove', function() {

			  var cord = d3.mouse(this);
			  Tooltip.hide(that.container);

			  if (HoverFlag) {
				mouseMoveHide = 'visible'
			  } else {
				mouseMoveHide = 'hidden'

			  }

			  if (cord[1] < 2*margin.top || cord[1] > (height+2*margin.top) ||cord[0]<margin.left || cord[0] > (width+margin.left)|| series.length==0 || series[0].data.length==0) {
				return
			  }
			  if(lastXpos) {
				d3.selectAll(obj.divId + " > svg > g > circle[id='" + (lastXpos) + "']")
				  .attr('r', function(d) {
					return dateHasAnnotations(d.date) ? 3 : 0;
				  });
			  }

			  var flag = true;
			  var xpos = parseInt(cord[0] - margin.left);
			  while (d3.select(obj.divId+" > svg > g > circle[id='" + (xpos) + "']")[0][0] == null) {
				if (flag) {
				  xpos++
				} else {
				  xpos--;
				  if(xpos<0)
				  {
					break;
				  }
				}
				if (xpos >= width && flag) {
				  flag = false;
				}
			  }
			  lastXpos = xpos;
			  var hover = d3.selectAll(obj.divId+" > svg > g > circle[id='" + xpos + "']")
				.attr('r', 6)
				.style('visibility', mouseMoveHide);
			  var data = hover.data();
			  var legends = series.map(function (d) {
				return d.label;
			  });
			  var colors =[];
			  data.forEach(function(a,i) {
				colors[i] = color(legends[i]);
			  });
			  Tooltip.show(that.container,[cord[0], cord[1]], obj.tooltip.formatter(data,legends,colors));
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

	  var initialWidth = document.querySelector(obj.divId).clientWidth;
	  setTimeout(function () {
		if (document.querySelector(obj.divId).clientWidth<(initialWidth-15)||document.querySelector(obj.divId).clientWidth> (initialWidth+15)) {
		  width = document.querySelector(obj.divId).clientWidth -margin.left - margin.right;
		  chart.plot()
		}
	  }, 2000);

	  window.addEventListener('resize', function () {
		if(width === (document.querySelector(obj.divId).clientWidth -margin.left - margin.right)) {
		}
		else {
		  width = document.querySelector(obj.divId).clientWidth -margin.left - margin.right;
		  chart.plot();
		}
	  });

	  d3.select(obj.divId).on('click',function () {
		chart.plot()
	  });


	  chart.height = function (newHeight) {
		if(newHeight !== height) {
		  height = newHeight;
		  chart.plot();
		}
	  };

	  chart.margin = function (_) {
		if(_) {
		  margin = _;
		  chart.plot();
		}
	  };
	  return chart;
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
			<div id="funnel-${this.source.query_id}" class="container"></div>
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

		if(this.source.response.filter(r => !r.value).length == this.source.response.length) {
			this.container.querySelector('.container').innerHTML = '<div class="NA">No data found for given parameters! :(</div>';
			return;
		}

		const series = [];

		for(const level of this.source.response) {
			series.push({
				label: level.metric,
				data: [{date: 0, label: level.metric, y: level.value}],
			});
		}

		this.draw({
			series: series.reverse(),
			divId: `#funnel-${this.source.query_id}`,
			chart: {},
			tooltip: {
				formatter: d => `${d.label}: ${Format.number(d.y)}`
			},
		});
	}

	draw(obj) {

		d3.selectAll(obj.divId).on('mousemove', null)
			.on('mouseout', null)
			.on('mousedown', null)
			.on('click', null);

		var chart = {};

		var data = obj.series;

		var downloadFlag = false;

		//Setting margin and width and height
		var margin = {top: 30, right: 30, bottom: 60, left: window.innerWidth < 768 ? -50 : 20},
				width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right,
				height = obj.chart.height?obj.chart.height:550 - margin.top - margin.bottom,
				tickNumber = 5,
				funnelTop,
				funnelBottom,
				funnelBottonHeight;

		if (window.innerWidth < 768) {
			funnelTop = width;
			funnelBottom = width * 0.5;
			funnelBottonHeight = height * 0.2;
		}
		else {
			funnelTop = width * 0.60;
			funnelBottom = width * 0.2;
			funnelBottonHeight = height * 0.2
		}
		//Parse date function
		var legendToggleTextFlag = false;
		//x
		var x = d3.scale.ordinal()
			.domain([0, 1])
			.rangeBands([0, width], 0.1, 0);

		//y
		var y = d3.scale.linear().range([height, margin.top]);

		var color = d3.scale.ordinal()
			.range(['#88a18c',
				'#e09c5b',
				'#5E95E1',
				'#dd7478',
				'#2a3f54',
				'#1abb9c',
				'#9dd440',
				'#7A5D4B',
				'#A971D8']);

		// Defining xAxis location at bottom the axes
		var xAxis = d3.svg.axis().scale(x)
			.orient("bottom")
			.tickFormat(function (d) { return moment(d).format("YYYY-MM-DD") });


		var diagonal = d3.svg.diagonal()
			.source(function (d) {
				return {"x": d[0]['y']+5, "y": d[0]['x']};
			})
			.target(function (d) {
				return {"x": d[1]['y']+5, "y": d[1]['x']};
			})
			.projection(function (d) {
				return [d.y, d.x];
			});


		//Setting domain for the colors with te exceptioon of date column
		color.domain(data.map(function (d) { return d.label }));

		var cities = d3.layout.stack()(data.map(function (d) {
				return d.data.map(function (d) {
					return {date: d.date, y: +d.y, label: d.label}
				})
			})
		);


		for (var i = 0; i < cities.length; i++) {
			var cityCopyObj = {};
			cityCopyObj.data = cities[i];
			cityCopyObj.label = color.domain()[i];
			cityCopyObj.hover = false;
			cityCopyObj.disabled = true;
			cities[i] = cityCopyObj
		}


		var rawData = JSON.parse(JSON.stringify(cities));

		chart.plot = () => {

			funnelTop = width * 0.60;
			funnelBottom = width * 0.2;
			funnelBottonHeight = height * 0.2;

			//Empty the container before loading
			d3.selectAll(obj.divId + " > *").remove();
			//Adding chart and placing chart at specific locaion using translate
			var svg = d3.select(obj.divId)
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("class", "chart")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


			//Filtering data if the column is disable or not
			var series = cities.filter(function (d) {
				return d.disabled;
			});
			var qkeyButton = {}, textLength = 0;


			//check if the data is present or not
			if (series.length == 0 || series[0].data.length == 0) {
				//Chart Title
				svg.append('g').attr('class', 'noDataWrap').append('text')
					.attr("x", (width / 2))
					.attr("y", (height / 2))
					.attr("text-anchor", "middle")
					.style("font-size", "20px")
					.text(obj.loading ? "Loading Data ..." : "No data to display");
				return;
			}


			var temp = d3.layout.stack()(series.map(function (c) {
				return c.data.map(function (d) {
					return {date: d.date, y: +d.y, label: d.label};
				})
			}));

			for (var i = 0; i < series.length; i++) {
				series[i].data = temp[i]
			}

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

			var tickInterval = parseInt(x.domain().length / tickNumber);
			var ticks = x.domain().filter(function (d, i) {
				return !(i % tickInterval);
			});
			xAxis.tickValues(ticks);

			var layer = svg.selectAll(".layer")
				.data(series)
				.enter().append("g")
				.attr("class", "layer")
				.style("fill", function (d) {
					return color(d.label);
				});

			layer.selectAll("rect")
				.data(function (d) {
					return d.data;
				})
				.enter().append("rect")
				.attr("x", function (d) {
					return x(d.date);
				})
				.attr("y", function (d) {
					return 30;
				})
				.attr("height", function (d) {
					return 0;
				})
				.attr("width", x.rangeBand())
				.transition()
				.duration(500)
				.attr("x", function (d) {
					return x(d.date);
				})
				.attr("width", x.rangeBand())
				.attr("y", function (d) {
					return y(d.y + d.y0);
				})
				.attr("height", function (d) {
					return y(d.y0) - y(d.y + d.y0)});


			var poly1 = [
				{"x": 0, "y": margin.top},
				{"x": (width - funnelTop) / 2, "y": margin.top},
				{"x": (width - funnelBottom) / 2, "y": height - funnelBottonHeight},
				{"x": (width - funnelBottom) / 2, "y": height},
				{"x": 0, "y": height}

			];

			var poly2 = [
				{"x": width, "y": margin.top},
				{"x": (width - funnelTop) / 2 + funnelTop + 5, "y": margin.top},
				{"x": (width - funnelBottom) / 2 + funnelBottom + 5, "y": height - funnelBottonHeight},
				{"x": (width - funnelBottom) / 2 + funnelBottom + 5, "y": height},
				{"x": width, "y": height}

			];

			var polygon = svg.selectAll("polygon")
				.data([poly2, poly1])
				.enter().append("polygon")
				.attr("points", function (d) {
					return d.map(function (d) {
						return [(d.x), (d.y)].join(",");
					}).join(" ");
				})
				.attr("stroke", "white")
				.attr("stroke-width", 2)
				.attr("fill", "white");

			//selecting all the paths
			var path = svg.selectAll("rect");

			var that = this;

			path.on('mousemove', null);
			//mouse over function
			path
				.on('mousemove', function (d) {
					Tooltip.hide(that.container);
					var cord = d3.mouse(this);
					if (cord[1] < 2 * margin.top || cord[1] > (height + 2 * margin.top) || cord[0] < margin.left || cord[0] > (width + margin.left) || series.length == 0 || series[0].data.length == 0) {
						return
					}
					Tooltip.show(that.container, [cord[0], cord[1]], obj.tooltip.formatter(d), 'n');
				});
			polygon.on('mouseover', function () {
				Tooltip.hide(that.container);
			});

			var labelConnectors = svg.append("g").attr('class', "connectors");
			var previousLabelHeight = 0, singPoint = height / d3.max(y.domain());
			for (i = 0; i < series.length; i++) {
				var section = series[i].data[0];
				var startLocation = section.y0 * singPoint,
					sectionHeight = section.y * singPoint,
					bottomLeft = funnelBottonHeight - (startLocation),
					x1, y1,  endingPintY, curveData;
				var label = labelConnectors.append("g");
				var text;
				//for lower part of the funnel
				if ((sectionHeight) / 2 < (bottomLeft)) {
					x1 = (width + funnelBottom) / 2;
					y1 = (startLocation + sectionHeight / 2);

					endingPintY = y1;

					if ((endingPintY - previousLabelHeight) <= 10) {
						endingPintY = previousLabelHeight + 5
					}

					curveData = [{x: x1, y: (height) - y1-5}, {
						x: x1 + (window.innerWidth < 768 ? 30 : 50),
						y: height - (endingPintY)
					}];
					text = label.append("text")
						.attr("x", x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr("y", height - (endingPintY))
						.attr("text-anchor", "left")
						.style("font-size", "15px")
						.style("fill","#2a3f54");

					if (window.innerWidth < 768) {
						text.style("font-size", "10px");
					}
					text.append("tspan")
						.attr("x", x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr("dx", "0")
						.attr("dy", "1em")
						.text(series[i].label);

					text.append("tspan")
						.attr("x", x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr("dx", "0")
						.attr("dy", "1.2em")
						.style("font-size", "13px")
						.text(`${Format.number(series[i].data[0].y)}  (${(series[i].data[0].y / series[series.length - 1].data[0].y * 100).toFixed(2)}%)`);

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
					if ((endingPintY - (endingPintY - previousLabelHeight)) <= 15) {
						endingPintY = previousLabelHeight + endingPintY + 15
					}

					curveData = [{x: x1, y: y1}, {x: x1 + (window.innerWidth < 768 ? 30 : 50), y: endingPintY-20}];
					text = label.append("text")
						.attr("x", x1 + (window.innerWidth < 768 ? 40 : 70))
						.attr("y", endingPintY-20)
						.attr("text-anchor", "left")
						.style("font-size", "15px");

					if (window.innerWidth < 768) {
						text.style("font-size", "10px");
					}
					text.append("tspan")
						.attr("x", x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr("dx", "0")
						.attr("dy", "1em")
						.text(series[i].label);

					text.append("tspan")
						.attr("x", x1 + (window.innerWidth < 768 ? 35 : 60))
						.attr("dx", "0")
						.attr("dy", "1.2em")
						.style("font-size", "13px")
						.text(`${Format.number(series[i].data[0].y)} (${(series[i].data[0].y / series[series.length - 1].data[0].y * 100).toFixed(2)}%)`);

				}

				previousLabelHeight = endingPintY + 45;


				label.datum(curveData)
					.append("path")
					.attr("class", "link")
					.attr("d", diagonal)
					.attr("stroke", "#2a3f54")
					.attr("stroke-width", 1)
					.attr("fill", "none");
			}
		};

		chart.plot();

		var initialWidth = document.querySelector(obj.divId).clientWidth;
		setTimeout(function () {
			if (document.querySelector(obj.divId).clientWidth != initialWidth) {
				width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
				chart.plot()
			}
		}, 2000);

		window.addEventListener('resize', function () {
			width = document.querySelector(obj.divId).clientWidth - margin.left - margin.right;
			chart.plot();
		});

		chart.height = function (newHeight) {
			if (newHeight != height) {
				height = newHeight;
				chart.plot();
			}
		};

		chart.margin = function (_) {
			if (_) {
				margin = _;
				chart.plot();
			}
		};

		function findInterSection(x1, y1, x2, y2, x3, y3, x4, y4) {
			var m1 = (y2 - y1) / (x2 - x1), m2 = (y4 - y3) / (x4 - x3), b1 = (y1 - m1 * x1), b2 = (y3 - m2 * x3);
			return [((b2 - b1) / (m1 - m2)), -1 * ((b1 * m2 - b2 * m1) / (m1 - m2))];
		}

		return chart;
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

function d3Legend() {
  var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    color = d3.scale.category10().range(),
    dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');


  function chart(selection) {
    selection.each(function(data) {

      /**
       *    Legend curently is setup to automaticaly expand vertically based on a max width.
       *    Should implement legend where EITHER a maxWidth or a maxHeight is defined, then
       *    the other dimension will automatically expand to fit, and anything that exceeds
       *    that will automatically be clipped.
       **/

      var wrap = d3.select(this).selectAll('g.legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'legend').append('g');


      var g = wrap.select('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      var series = g.selectAll('.series')
        .data(function(d) { return d });
      var seriesEnter = series.enter().append('g').attr('class', 'series')
        .on('click', function(d, i) {
          dispatch.legendClick(d, i);
        })
        .on('mouseover', function(d, i) {
          dispatch.legendMouseover(d, i);
        })
        .on('mouseout', function(d, i) {
          dispatch.legendMouseout(d, i);
        });

      //set the color of the circle before the legend name
      seriesEnter.append('circle')
        .style('fill', function(d, i){ return d.color || color(d.label)})
        .style('stroke', function(d, i){ return d.color || color(d.label) })
        .attr('r',5);

      //setting text of the legend
      seriesEnter.append('text')
        .text(function(d) { return d.label + (d.percent&&d.percent!=""?'('+d.percent+'%)':"") })
        .attr('text-anchor', 'start')
        .attr('dy', '.32em')
        .attr('dx', '12')
        .attr('font-size','15');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();

      var ypos = 5,
        newxpos = 5,
        maxwidth = 0,
        xpos;
      series
        .attr('transform', function(d, i) {
          var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
          xpos = newxpos;

          //TODO: 1) Make sure dot + text of every series fits horizontally, or clip text to fix
          //TODO: 2) Consider making columns in line so dots line up
          //         --all labels same width? or just all in the same column?
          //         --optional, or forced always?
          if (width < margin.left + margin.right + xpos + length) {
            newxpos = xpos = 5;
            ypos += 20;
          }

          newxpos += length;
          if (newxpos > maxwidth) maxwidth = newxpos;

          return 'translate(' + xpos + ',' + ypos + ')';
        });

      //position legend as far right as possible within the total width

      g.attr('transform', 'translate(' + 0 + ',' + (height+margin.bottom/2+20) + ')');

    });

    return chart;
  }

  chart.dispatch = dispatch;

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  return chart;
}

Node.prototype.on = window.on = function(name, fn) {
	this.addEventListener(name, fn);
}