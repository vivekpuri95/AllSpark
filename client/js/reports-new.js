class ReportsManger extends Page {

	constructor(page, key) {

		super(page, key);

		this.stages = new Map;
		this.preview = new ReportsMangerPreview(this);

		this.setup();

		window.onbeforeunload = () => this.container.querySelector('.unsaved');
	}

	async setup() {

		this.stages.clear();

		const switcher = this.container.querySelector('#stage-switcher');

		for(const [key, stageClass] of ReportsManger.stages) {

			const stage = new stageClass(this, key);

			switcher.appendChild(stage.switcher);

			this.stages.set(key, stage);
		}

		window.on('popstate', () => this.load());

		await this.fetch();

		this.process();
		this.load();
	}

	async fetch() {

		[this.connections] = await Promise.all([
			API.call('credentials/list'),
			DataSource.load(true),
		]);
	}

	process() {
		this.connections = new Map(this.connections.map(c => [c.id, c]));
	}

	load() {

		let stage = null;

		for(const [key, _stage] of this.stages) {
			if(window.location.pathname.includes(`/${key}`))
				stage = _stage;
		}

		if(stage)
			stage.select();

		else {

			stage = this.stages.get('pick-report');

			history.replaceState({}, '', `/reports-new/${stage.url}`);

			stage.select();
		}
	}
}

class ReportsMangerPreview {

	constructor(page) {

		this.page = page;
		this.container = this.page.container.querySelector('#preview');
	}

	async load(options = {}) {

		this.container.textContent = null;
		this.container.classList.add('hidden');

		this.report = parseInt(window.location.pathname.split('/').pop());

		if(!this.report || !DataSource.list.has(this.report))
			return this.report = false;

		this.report = JSON.parse(JSON.stringify(DataSource.list.get(this.report)));

		this.report.visualizations = this.report.visualizations.filter(f => f.type == 'table');

		if(options.query) {
			this.report.query = options.query;
			this.report.queryOverride = true;
		}

		this.report = new DataSource(this.report);

		this.report.container.querySelector('header').classList.add('hidden');

		this.container.appendChild(this.report.container);
		this.container.classList.remove('hidden');

		await this.report.visualizations.selected.load();
	}
}

class ReportsMangerStage {

	constructor(page, key) {

		this.page = page;
		this.key = key;

		this.container = this.page.container.querySelector(`#stage-${this.key}`);
	}

	get switcher() {

		if(this.switcherContainer)
			return this.switcherContainer;

		const container = this.switcherContainer = document.createElement('div');

		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">${this.order}</span>
			<span class="title">${this.title}</span>
			<small>${this.description}</small>
		`;

		container.on('click', () => {

			this.select();

			if(!this.disabled)
				history.pushState({}, '', `/reports-new/${this.url}`);
		});

		return container;
	}

	select() {

		if(this.disabled)
			return;

		if(this.page.stages.selected)
			this.page.stages.selected.switcher.classList.remove('selected');

		this.switcher.classList.add('selected');

		Sections.show(this.container.id);

		this.page.stages.selected = this;

		this.load();
	}

	set disabled(disabled) {

		this._disabled = disabled;

		this.switcher.classList.toggle('disabled', disabled);
	}

	get disabled() {
		return this._disabled;
	}
}

Page.class = ReportsManger;

ReportsManger.stages = new Map;

ReportsManger.stages.set('pick-report', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '1';
		this.title = 'Pick Report';
		this.description = 'Pick a Report';

		this.sort = {};

		this.prepareSearch();
	}

	get url() {
		return this.key;
	}

	select() {

		super.select();

		for(const stage of this.page.stages.values())
			stage.disabled = stage != this;
	}

	prepareSearch() {

		const search = this.container.querySelector('table thead tr.search');
		const columns = this.container.querySelectorAll('table thead th');

		for(const column of columns) {

			const searchColumn = document.createElement('th');

			search.appendChild(searchColumn);

			if(column.classList.contains('action'))
				searchColumn.classList.add('action');

			if(!column.classList.contains('search'))
				continue;

			searchColumn.innerHTML = `
				<input type="search" class="column-search" data-key="${column.dataset.key}" placeholder="Search ${column.textContent}">
			`;

			searchColumn.querySelector('.column-search').on('keyup', () => this.load());

			search.appendChild(searchColumn);

			if(column.classList.contains('sort')) {

				column.on('click', () => {

					this.sort = {
						column: column.dataset.key,
						order: !this.sort.order,
					};

					this.load();
				});
			}
		}
	}

	async load() {

		const
			theadSearch = document.querySelectorAll('.column-search'),
			tbody = this.container.querySelector('tbody');

		tbody.textContent = null;

		for(const report of this.reports) {

			const row = document.createElement('tr');

			let tags = report.tags ? report.tags.split(',') : [];
			tags = tags.filter(t => t).map(tag => `<a>${tag.trim()}</a>`).join('');

			let connection = this.page.connections.get(parseInt(report.connection_name)) || '';

			if(connection)
				connection = `${connection.connection_name} (${connection.type})`;

			row.innerHTML = `
				<td>${report.query_id}</td>
				<td>
					<a href="/report/${report.id}" target="_blank">
						${report.name}
					</a>
				</td>
				<td>${report.description || ''}</td>
				<td>${connection}</td>
				<td class="tags"><div>${tags}</div></td>
				<td title="${report.filters.map(f => f.name).join(', ')}" >
					${report.filters.length}
				</td>
				<td title="${report.visualizations.map(f => f.name).join(', ')}" >
					${report.visualizations.length}
				</td>
				<td>${report.is_enabled ? 'Yes' : 'No'}</td>
				<td class="action green configure">Configure</td>
				<td class="action green define">Define</td>
				<td class="action red delete">Delete</td>
			`;

			row.querySelector('.configure').on('click', () => {

				const stage = this.page.stages.get('configure-report');

				history.pushState({}, '', `/reports-new/configure-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;

				this.page.load();
			});

			row.querySelector('.define').on('click', () => {

				const stage = this.page.stages.get('define-report');

				history.pushState({}, '', `/reports-new/define-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;

				this.page.load();
			});

			row.querySelector('.delete').on('click', () => this.delete(report));

			tbody.appendChild(row);
		}

		if(!tbody.children.length)
			tbody.innerHTML = `<tr class="NA"><td colspan="11">No Reports Found! :(</td></tr>`;
	}

	get reports() {

		let reports = JSON.parse(JSON.stringify(Array.from(DataSource.list.values())));

		const inputs = this.container.querySelectorAll('thead tr.search th input');

		reports = reports.filter(report => {

			for(const input of inputs) {

				const query = input.value.toLowerCase();

				if(!query)
					continue;

				if(['filters', 'visualization'].includes(input.dataset.key)) {

					if(!report.filters.some(filter => filter.name.toLowerCase().includes(query)))
						return false;
				}

				else if(input.dataset.key == 'connection') {

					let connection = this.page.connections.get(parseInt(report.connection_name)) || '';

					if(!connection)
						return false;

					if(!connection.connection_name.toLowerCase().includes(query) && !connection.type.toLowerCase().includes(query))
						return false;
				}

				else if(input.dataset.key == 'is_enabled') {

					if(!(report.is_enabled ? 'yes' : 'no').includes(query))
						return false;
				}

				else {

					if(!report[input.dataset.key] || !report[input.dataset.key].toString().toLowerCase().includes(query))
						return false;
				}
			}

			return true;
		});

		if(this.sort.column) {

			reports = reports.sort((a, b) => {

				a = a[this.sort.column] || '';
				b = b[this.sort.column] || '';

				if(typeof a == 'string') {
					a = a.toUpperCase();
					b = b.toUpperCase();
				}

				else if(a instanceof Array) {
					a = a.length;
					b = b.length;
				}

				let result = 0;

				if(a < b)
					result = -1;

				if(a > b)
					result = 1;

				if(this.sort.order)
					result *= -1;

				return result;
			});
		}

		return reports;
	}

	async delete(report) {

		if(!window.confirm('Are you sure?!'))
			return;

		const
			parameters = {
				query_id: report.query_id,
				is_deleted: 1,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/report/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}
});

ReportsManger.stages.set('configure-report', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '2';
		this.title = 'Configure Report';
		this.description = 'Change the report\'s properties';

		this.form = this.container.querySelector('form');
		this.form.save = this.container.querySelector('.toolbar button[type=submit]');

		for(const element of this.form.elements)
			element.on('change', () => this.form.save.classList.add('unsaved'));

		this.form.redis.removeEventListener('change', this.handleRedisSelect);

		this.form.redis.on('change', this.handleRedisSelect = () => {

			this.form.is_redis.type = this.form.redis.value === 'EOD' ? 'text' : 'number';

			this.form.is_redis.value = this.form.redis.value;
			this.form.is_redis.classList.toggle('hidden', this.form.redis.value !== 'custom');
		});
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	load() {

		this.report = parseInt(window.location.pathname.split('/').pop());

		this.report = DataSource.list.get(this.report);

		this.form.removeEventListener('submit', this.form.listener);
		this.form.addEventListener('submit', this.form.listener = e => this.update(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');

		for(const key in this.report) {
			if(this.form.elements[key])
				this.form.elements[key].value = this.report[key];
		}

		this.form.format.value = this.report.format ? JSON.stringify(this.report.format, 0, 4) : '';

		if(this.is_redis > 0) {
			this.form.redis.value = 'custom';
			this.form.is_redis.classList.remove('hidden');
		}

		else {
			this.form.redis.value = this.is_redis;
			this.form.is_redis.classList.add('hidden');
		}

		this.form.connection_name.textContent = null;

		for(const connection of this.page.connections.values()) {
			this.form.connection_name.insertAdjacentHTML('beforeend',
				`<option value="${connection.id}">${connection.connection_name} (${connection.type})</option>`
			)
		}
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id,
				roles: Array.from(this.form.querySelector('#roles').selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		let format = {};

		try {
			format = JSON.parse(this.form.format.value || '{}');
		} catch(e) {
			alert('Invalid JSON in format! :(');
			return;
		};

		options.form.set('format', JSON.stringify(format));

		await API.call('reports/report/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}
});

ReportsManger.stages.set('define-report', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '3';
		this.title = 'Define Report\'s Data';
		this.description = 'The report\'s SQL query or API';

		this.form = this.container.querySelector('form');
		this.form.save = this.container.querySelector('.toolbar button[type=submit]');

		this.filterForm = this.container.querySelector('#filters form');

		this.schemas = new Map;

		const schemaToggle = this.container.querySelector('#schema-toggle')

		schemaToggle.on('click', () => {
			schemaToggle.classList.toggle('selected');
			this.container.querySelector('#schema').classList.toggle('hidden');
		});

		const filtersToggle = this.container.querySelector('#filters-toggle')

		filtersToggle.on('click', () => {
			filtersToggle.classList.toggle('selected');
			this.container.querySelector('#filters').classList.toggle('hidden');
		});

		this.container.querySelector('#add-filter').on('click', () => this.addFilter());

		this.container.querySelector('#filter-back').on('click', () => {
			this.container.querySelector('#filter-form').classList.add('hidden');
			this.container.querySelector('#filter-list').classList.remove('hidden');
		});

		this.editor = new Editor(this.form.querySelector('#editor'));

		this.editor.editor.getSession().on('change', () => {

			if(!this.report)
				return;

			this.filterSuggestions();

			this.form.save.classList.toggle('unsaved', this.editor.value != this.report.query);
		});

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: async () => {

					const options = {
						query: this.editor.editor.getSelectedText() || this.editor.value,
					};

					await this.page.preview.load(options);

					this.editor.editor.resize();
				},
			});
		});
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	load() {

		this.report = parseInt(window.location.pathname.split('/').pop());

		this.report = DataSource.list.get(this.report);

		const connection = this.page.connections.get(parseInt(this.report.connection_name));

		this.form.querySelector('#api').classList.toggle('hidden', connection.type != 'api');
		this.form.querySelector('#query').classList.toggle('hidden', connection.type == 'api');

		this.form.removeEventListener('submit', this.form.listener);
		this.form.addEventListener('submit', this.form.listener = e => this.update(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');
		this.editor.editor.focus();

		for(const key in this.report) {
			if(this.form.elements[key])
				this.form.elements[key].value = this.report[key];
		}

		this.editor.value = this.report.query;

		this.schema();
		this.filters();
		this.page.preview.load();

		this.container.querySelector('#filter-form').classList.add('hidden');
		this.container.querySelector('#filter-list').classList.remove('hidden');
	}

	async update(e) {

		if(e && e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id,
				query: this.editor.value,
				url_options: JSON.stringify({method: this.form.method.value}),
				url: this.form.url.value,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/report/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}

	filterSuggestions() {

		let placeholders = this.editor.value.match(/{{([a-zA-Z0-9_-]*)}}/g) || [];

		placeholders = new Set(placeholders.map(a => a.match('{{(.*)}}')[1]));

		const
			missing = new Set(placeholders),
			missingContainer = this.container.querySelector('#missing-filters');

		for(const filter of this.report.filters) {

			if(!filter.container)
				continue;

			filter.container.elements.placeholder.classList.remove('red');

			if(!placeholders.has(filter.placeholder))
				filter.container.elements.placeholder.classList.add('red');

			missing.delete(filter.placeholder);
		}

		if(missing.size) {
			missingContainer.innerHTML = `Missing Placeholders: <strong>${Array.from(missing).join(', ')}</strong>`;
			missingContainer.classList.remove('hidden');
		}

		else missingContainer.classList.add('hidden');
	}

	async schema() {

		const source = this.page.connections.get(this.report.connection_name);

		if(!source || !['mysql', 'pgsql'].includes(source.type)) {
			this.form.querySelector('#query').classList.add('hidden');
			this.form.querySelector('#api').classList.remove('hidden');
		}

		this.form.querySelector('#query').classList.remove('hidden');
		this.form.querySelector('#api').classList.add('hidden');

		if(this.schemas.has(this.report.connection_name))
			return this.editor.setAutoComplete(this.schemas.get(this.report.connection_name));

		let response = null;

		const container = this.container.querySelector('#schema');

		try {
			response = await API.call('credentials/schema', { id: this.report.connection_name });
		} catch(e) {
			container.innerHTML = `<div class="NA">Failed to load Schema! :(</div>`;
			return;
		}

		const
			schema = mysqlKeywords.map(k => {return {
				name: k,
				value: k,
				meta: 'MySQL Keyword',
			}}),
			databases = document.createElement('ul');

		if(this.report) {

			for(const filter of this.report.filters) {
				schema.push({
					name: filter.placeholder,
					value: filter.placeholder,
					meta: 'Report Filter',
				});
			}
		}

		container.textContent = null;

		const
			search = document.createElement('input'),
			that = this;

		search.type = 'search';
		search.placeholder = 'Search...';

		search.on('keyup', () => renderList());

		container.appendChild(search);

		for(const database of response) {

			schema.push({
				name: database.name,
				value: database.name,
				meta: '(d)',
			});

			for(const table of database.tables) {

				schema.push({
					name: table.name,
					value: table.name,
					meta: '(t) ' + database.name,
				});

				for(const column of table.columns) {

					schema.push({
						name: column.name,
						value: column.name,
						meta: '(c) ' + table.name,
					});
				}
			}
		}

		this.schemas.set(this.report.connection_name, schema);

		container.appendChild(databases);

		renderList();

		function renderList() {

			databases.textContent = null;

			for(const database of response) {

				const tables = document.createElement('ul');

				if(!search.value)
					tables.classList.add('hidden');

				for(const table of database.tables) {

					const columns = document.createElement('ul');

					if(!search.value)
						columns.classList.add('hidden');

					for(const column of table.columns) {

						if(search.value && !column.name.includes(search.value))
							continue;

						let name = column.name;

						if(search.value) {
							name = [
								name.slice(0, name.indexOf(search.value)),
								'<mark>',
								search.value,
								'</mark>',
								name.slice(name.indexOf(search.value) + search.value.length)
							].join('');
						}

						const li = document.createElement('li');

						li.innerHTML = `
							<span class="name">
								<strong>C</strong>
								<span>${name}</span>
								<small>${column.type}</small>
							</span>
						`;

						li.querySelector('span').on('click', () => {
							that.editor.editor.getSession().insert(that.editor.editor.getCursorPosition(), column.name);
						});

						columns.appendChild(li);
					}

					const li = document.createElement('li');

					if(!columns.children.length && !table.name.includes(search.value))
						continue;

					let name = table.name;

					if(search.value && name.includes(search.value)) {
						name = [
							name.slice(0, name.indexOf(search.value)),
							'<mark>',
							search.value,
							'</mark>',
							name.slice(name.indexOf(search.value) + search.value.length)
						].join('');
					}

					li.innerHTML = `
						<span class="name">
							<strong>T</strong>
							<span>${name}</span>
							<small>${table.columns.length} columns</small>
						</span>
					`;

					li.appendChild(columns)

					li.querySelector('span').on('click', () => {
						li.classList.toggle('opened');
						columns.classList.toggle('hidden')
					});

					tables.appendChild(li);
				}

				if(!tables.children.length && !database.name.includes(search.value))
					continue;

				const li = document.createElement('li');

				let name = database.name;

				if(search.value && name.includes(search.value)) {
					name = [
						name.slice(0, name.indexOf(search.value)),
						'<mark>',
						search.value,
						'</mark>',
						name.slice(name.indexOf(search.value) + search.value.length)
					].join('');
				}

				li.innerHTML = `
					<span class="name">
						<strong>D</strong>
						<span>${name}</span>
						<small>${database.tables.length} tables</small>
					</span>
				`;

				li.appendChild(tables)

				li.querySelector('span').on('click', () => {
					li.classList.toggle('opened');
					tables.classList.toggle('hidden');
				});

				databases.appendChild(li);
			}

			if(!databases.children.length)
				databases.innerHTML = `<div class="NA">No matches found! :(</div>`;
		}

		this.editor.setAutoComplete(this.schemas.get(this.report.connection_name));
	}

	filters() {

		const tbody = this.container.querySelector('#filters table tbody');

		tbody.textContent = null;

		for(const filter of this.report.filters) {

			const row = document.createElement('tr');

			row.innerHTML = `
				<td>${filter.name}</td>
				<td>${filter.placeholder}</td>
				<td>${filter.type}</td>
				<td>${filter.dataset || ''}</td>
				<td class="action green"><i class="far fa-edit"></i></td>
				<td class="action red"><i class="far fa-trash-alt"></i></td>
			`;

			row.querySelector('.green').on('click', () => this.editFilter(filter));
			row.querySelector('.red').on('click', () => this.deleteFilter(filter));

			tbody.appendChild(row);
		}

		if(!this.report.filters.length)
			tbody.innerHTML = `<tr class="NA"><td>No filters added yet! :(</td></tr>`
	}

	addFilter() {

		this.container.querySelector('#filter-form').classList.remove('hidden');
		this.container.querySelector('#filter-list').classList.add('hidden');

		this.filterForm.removeEventListener('submit', this.filterForm.listener);
		this.filterForm.on('submit', this.filterForm.listener = e => this.insertFilter(e));

		this.filterForm.reset();

		this.filterForm.name.focus();
	}

	async insertFilter(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id
			},
			options = {
				method: 'POST',
				form: new FormData(this.filterForm),
			};

		await API.call('reports/filters/insert', parameters, options);

		await DataSource.load(true);

		this.load();
	}

	editFilter(filter) {

		this.container.querySelector('#filter-form').classList.remove('hidden');
		this.container.querySelector('#filter-list').classList.add('hidden');

		this.filterForm.removeEventListener('submit', this.filterForm.listener);
		this.filterForm.on('submit', this.filterForm.listener = e => this.updateFilter(e, filter));

		this.filterForm.reset();

		for(const key in filter) {
			if(key in this.filterForm)
				this.filterForm[key].value = filter[key];
		}

		this.filterForm.name.focus();
	}

	async updateFilter(e, filter) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				filter_id: filter.filter_id
			},
			options = {
				method: 'POST',
				form: new FormData(this.filterForm),
			};

		await API.call('reports/filters/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}

	async deleteFilter(filter) {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				filter_id: filter.filter_id,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/filters/delete', parameters, options);

		await DataSource.load(true);

		this.load();
	}
});

ReportsManger.stages.set('pick-visualization', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '4';
		this.title = 'Pick Visualization';
		this.description = 'Pick a visualization for your report';
	}

	load() {}
});

ReportsManger.stages.set('visualization-transformations', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '5';
		this.title = 'Transformations';
		this.description = 'Apply transformations to visualization\'s data';
	}

	load() {}
});

ReportsManger.stages.set('configure-visualization', class PickReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '6';
		this.title = 'Configure Visualization';
		this.description = 'Define how the report is visualized';
	}

	load() {}
});

const mysqlKeywords = [
	'SELECT',
	'FROM',
	'WHERE',
	'AS',
	'AND',
	'OR',
	'IN',
	'BETWEEN',
	'DISTINCT',
	'COUNT',
	'GROUP BY',
	'FORCE INDEX',
	'DATE',
	'MONTH',
	'YEAR',
	'YEARMONTH',
	'UNIX_TIMESTAMP',
	'CONCAT',
	'CONCAT_WS',
	'SUM',
	'INTERVAL',
	'DAY',
	'MINUTE',
	'SECOND',
	'DATE_FORMAT',
	'USING',
];