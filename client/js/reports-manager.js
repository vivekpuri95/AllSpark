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

		this.stages.container = this.container.querySelector('#stages');

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

			history.replaceState({}, '', `/reports/${stage.url}`);

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

		if(!DataSource.list.has(options.query_id))
			return this.report = false;

		this.report = JSON.parse(JSON.stringify(DataSource.list.get(options.query_id)));

		if(options.visualization_id)
			this.report.visualizations = this.report.visualizations.filter(f => f.visualization_id == options.visualization_id);
		else
			this.report.visualizations = this.report.visualizations.filter(f => f.type == 'table');

		if(options.query && options.query != this.report.query) {
			this.report.query = options.query;
			this.report.queryOverride = true;
		}

		this.report = new DataSource(this.report);

		this.report.container.querySelector('header').classList.add('hidden');
		this.report.visualizations.selected.container.classList.toggle('unsaved', this.report.queryOverride ? 1 : 0);

		this.container.appendChild(this.report.container);
		this.container.classList.remove('hidden');

		this.page.container.classList.remove('preview-top', 'preview-right', 'preview-bottom', 'preview-left');
		this.page.container.classList.add('preview-right');

		await this.report.visualizations.selected.load();

		this.report.container.querySelector('header .menu-toggle').click();

		this.renderDocks();
	}

	set hidden(hidden) {
		this.container.classList.toggle('hidden', hidden);
		this.move();
	}

	get hidden() {
		return this.container.classList.contains('hidden');
	}

	renderDocks() {

		this.docks = document.createElement('select');

		this.docks.insertAdjacentHTML('beforeend', `
			<option value="right">Right</option>
			<option value="bottom">Bottom</option>
			<option value="left">Left</option>
		`);

		this.docks.value = localStorage.reportsPreviewDock || 'right';

		localStorage.reportsPreviewDock = this.docks.value;

		this.docks.on('change', () => {
			localStorage.reportsPreviewDock = this.docks.value;
			this.move();
		});

		this.move();

		this.report.container.querySelector('.menu').appendChild(this.docks);
	}

	move() {

		this.page.container.classList.remove('preview-top', 'preview-right', 'preview-bottom', 'preview-left');

		if(this.hidden)
			return;

		let position = this.docks ? this.docks.value : localStorage.reportsPreviewDock || 'bottom';

		this.page.container.classList.add('preview-' + position);

		this.report.visualizations.selected.render();
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

			if(this.disabled)
				return;

			this.select();

			if(this.key != 'configure-visualization')
				history.pushState({}, '', `/reports/${this.url}`);
		});

		return container;
	}

	select() {

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

	get selectedReport() {

		let report = null;

		const id = parseInt(window.location.pathname.split('/').pop());

		if(window.location.pathname.includes('/configure-visualization')) {

			for(const _report of DataSource.list.values()) {

				if(_report.visualizations.filter(v => v.visualization_id == id).length)
					report = _report;
			}
		}

		else report = DataSource.list.get(id);

		return report;
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

		this.container.querySelector('#add-report').on('click', () => {
			this.add();
			history.pushState({id: 'add'}, '', `/configure-report/add`);
		});
	}

	get url() {
		return this.key;
	}

	select() {

		super.select();

		for(const stage of this.page.stages.values())
			stage.disabled = stage != this;

		this.page.preview.hidden = true;
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
					<a href="/report/${report.query_id}" target="_blank">
						${report.name}
					</a>
				</td>
				<td>${report.description || ''}</td>
				<td>${connection}</td>
				<td class="tags"><div>${tags}</div></td>
				<td title="${report.filters.map(f => f.name).join(', ')}" >
					${report.filters.length}
				</td>
				<td class="action green visualizations" title="${report.visualizations.map(f => f.name).join(', ')}" >
					${report.visualizations.length}
				</td>
				<td>${report.is_enabled ? 'Yes' : 'No'}</td>
				<td class="action green configure">Configure</td>
				<td class="action green define">Define</td>
				<td class="action red delete">Delete</td>
			`;

			row.querySelector('.configure').on('click', () => {

				history.pushState({}, '', `/reports/configure-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('configure-visualization').disabled = false;

				this.page.load();
			});

			row.querySelector('.define').on('click', () => {

				history.pushState({}, '', `/reports/define-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('configure-visualization').disabled = false;

				this.page.load();
			});

			row.querySelector('.visualizations').on('click', () => {

				history.pushState({}, '', `/reports/define-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('configure-visualization').disabled = false;

				this.page.load();

				this.page.stages.get('configure-visualization').select();
				this.page.stages.get('configure-visualization').switcher.querySelector('#visualization-list').classList.toggle('hidden');
			});

			row.querySelector('.delete').on('click', () => this.delete(report));

			tbody.appendChild(row);
		}

		if(!tbody.children.length)
			tbody.innerHTML = `<tr class="NA"><td colspan="11">No Reports Found! :(</td></tr>`;

		this.switcher.querySelector('small').textContent = 'Pick a report';
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

	add() {

		history.pushState({}, '', `/reports/configure-report/add`);

		this.page.stages.get('configure-report').disabled = false;
		this.page.stages.get('define-report').disabled = false;
		this.page.stages.get('configure-visualization').disabled = false;

		this.page.load();
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

ReportsManger.stages.set('configure-report', class ConfigureReport extends ReportsMangerStage {

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

		for(const category of MetaData.categories.values()) {

			this.form.category_id.insertAdjacentHTML('beforeend', `
				<option value="${category.category_id}">${category.name}</option>
			`);
		}

		for(const role of MetaData.roles.values()) {

			this.form.roles.insertAdjacentHTML('beforeend', `
				<option value="${role.role_id}">${role.name}</option>
			`);
		}
	}

	select() {
		super.select();

		this.page.stages.get('configure-visualization').setupVisualizations();
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	load() {

		if(!this.form.connection_name.children.length) {

			for(const connection of this.page.connections.values()) {
				this.form.connection_name.insertAdjacentHTML('beforeend',
					`<option value="${connection.id}">${connection.connection_name} (${connection.type})</option>`
				)
			}
		}

		this.report = this.selectedReport;

		const small = this.page.stages.get('pick-report').switcher.querySelector('small');

		if(this.report) {
			small.textContent = this.report.name + ` #${this.report.query_id}`;
			this.edit();
		}

		else {
			small.textContent = 'Add new report';
			this.add();
		}
	}

	add() {

		this.form.removeEventListener('submit', this.form.listener);
		this.form.addEventListener('submit', this.form.listener = e => this.insert(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');

		if(this.form.redis.value == 'custom')
			this.form.is_redis.classList.remove('hidden');

		else this.form.is_redis.classList.add('hidden');
	}

	async insert(e) {

		e.preventDefault();

		const
			parameters = {
				roles: Array.from(this.form.querySelector('#roles').selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		const response = await API.call('reports/report/insert', parameters, options);

		await DataSource.load(true);

		window.history.replaceState({}, '', `/reports/define-report/${response.insertId}`);

		this.page.load();
	}

	async edit() {

		this.form.removeEventListener('submit', this.form.listener);
		this.form.addEventListener('submit', this.form.listener = e => this.update(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');

		for(const key in this.report) {
			if(this.form.elements[key])
				this.form.elements[key].value = this.report[key];
		}

		if(this.is_redis > 0) {
			this.form.redis.value = 'custom';
			this.form.is_redis.classList.remove('hidden');
		}

		else {
			this.form.redis.value = this.is_redis;
			this.form.is_redis.classList.add('hidden');
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

		await API.call('reports/report/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}
});

ReportsManger.stages.set('define-report', class DefineReport extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '3';
		this.title = 'Define Report\'s Data';
		this.description = 'The report\'s SQL query or API';

		this.form = this.container.querySelector('form');
		this.form.save = this.container.querySelector('.toolbar button[type=submit]');

		this.filterForm = this.container.querySelector('#filters form');

		for(const dataset of MetaData.datasets.values()) {
			this.filterForm.dataset.insertAdjacentHTML('beforeend', `
				<option value="${dataset.id}">${dataset.name}</option>
			`);
		}

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

		const previewToggle = this.container.querySelector('#preview-toggle');

		previewToggle.on('click', () => {

			if(!this.page.preview.report)
				return this.preview();

			this.page.preview.hidden = previewToggle.classList.contains('selected');
			previewToggle.classList.toggle('selected');

			this.editor.editor.resize();
		});

		this.container.querySelector('#add-filter').on('click', () => this.addFilter());

		this.container.querySelector('#filter-back').on('click', () => {
			this.container.querySelector('#filter-form').classList.add('hidden');
			this.container.querySelector('#filter-list').classList.remove('hidden');
		});

		this.container.querySelector('#run').on('click', () => {
			return this.preview();
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
				exec: () => this.preview(),
			});
		});
	}

	select() {
		super.select();

		this.page.stages.get('configure-visualization').setupVisualizations();
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	async preview() {

		const options = {
			query: this.editor.editor.getSelectedText() || this.editor.value,
			query_id: this.report.query_id,
		};

		await this.page.preview.load(options);

		this.page.preview.hidden = false;
		this.container.querySelector('#preview-toggle').classList.add('selected');
		this.editor.editor.resize();
	}

	load() {

		this.report = this.selectedReport;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

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

		this.container.querySelector('#filter-form').classList.add('hidden');
		this.container.querySelector('#filter-list').classList.remove('hidden');

		this.page.stages.get('pick-report').switcher.querySelector('small').textContent = this.report.name + ` #${this.report.query_id}`;
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

			missing.delete(filter.placeholder);

			if(!filter.container)
				continue;

			filter.container.elements.placeholder.classList.remove('red');

			if(!placeholders.has(filter.placeholder))
				filter.container.elements.placeholder.classList.add('red');
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

		this.report.filters.sort((a, b) => {
			a = MetaData.datasets.has(a.dataset) ? MetaData.datasets.get(a.dataset).order : 0;
			b = MetaData.datasets.has(b.dataset) ? MetaData.datasets.get(b.dataset).order : 0;

			if (!a)
				return 1;
			if (!b)
				return -1;

			return a - b;
		});

		for(const filter of this.report.filters) {

			const row = document.createElement('tr');

			let datasetName = '';

			if(filter.dataset && MetaData.datasets.has(filter.dataset)) {

				const
					dataset = MetaData.datasets.get(filter.dataset),
					report = DataSource.list.get(dataset.query_id);

				if(report) {
					datasetName = `
						<a href="/report/${dataset.query_id}" target="_blank" title="${DataSource.list.get(dataset.query_id).name}">
							${dataset.name}
						</a>
					`;
				}

				else datasetName = dataset.name;
			}

			row.innerHTML = `
				<td>${filter.name}</td>
				<td>${filter.placeholder}</td>
				<td>${filter.type}</td>
				<td>${datasetName}</td>
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

ReportsManger.stages.set('configure-visualization', class ConfigureVisualization extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '4';
		this.title = 'Configure Visualization';
		this.description = 'Define how the report is visualized';

		this.form = this.container.querySelector('#configure-visualization-form');

		for(const visualization of MetaData.visualizations.values()) {
			this.form.type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		this.form.on('submit', e => this.update(e));

		this.switcher.insertAdjacentHTML('beforeend', `
			<table id="visualization-list" class="hidden">
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Edit</th>
						<th>Delete</th>
					</tr>
				</thead>
				<tbody></tbody>
				<tfoot>
					<tr>
						<td colspan="4"><button id="add-visualization"><i class="fas fa-plus"></i> Add New Visualization</button></td>
					</tr>
				</tfoot>
			</table>
		`);

		this.switcher.querySelector('#visualization-list').on('click', e => {
			e.stopPropagation();
		});

		this.switcher.querySelector('#add-visualization').on('click', () => {

			this.addForm.reset();

			this.page.preview.hidden = true;
			this.switcher.querySelector('#visualization-list').classList.add('hidden');

			Sections.show('add-visualization-picker');
		});

		this.page.container.querySelector('#visualization-picker-back').on('click', () => {

			Sections.show('stage-configure-visualization');

			this.page.preview.hidden = false;
		});

		this.addForm = this.page.container.querySelector('#add-visualization-form');

		for(const visualization of MetaData.visualizations.values()) {

			this.addForm.insertAdjacentHTML('beforeend', `
				<label>
					<figure>
						<img src="${visualization.image}"></img>
						<figcaption><input type="radio" name="type" value="${visualization.slug}">&nbsp; ${visualization.name}</figcaption>
					</figure>
				</label>
			`);
		}

		this.addForm.on('submit', e => this.insert(e));

		this.setupConfigurationSetions();
	}

	setupConfigurationSetions(container) {

		if(!container)
			container = this.container;

		for(const section of container.querySelectorAll('.configuration-section')) {

			const
				body = section.querySelector('.body'),
				h3 = section.querySelector('h3');

			body.classList.add('hidden');

			h3.on('click', () => {

				body.classList.toggle('hidden');

				for(const svg of h3.querySelectorAll('.fa-angle-right, .fa-angle-down'))
					svg.remove();

				h3.insertAdjacentHTML('afterbegin', body.classList.contains('hidden') ? '<i class="fas fa-angle-right"></i>' : '<i class="fas fa-angle-down"></i>');
			});
		}
	}

	select() {

		if(this._disabled)
			return;

		if(!this.visualization)
			super.select();

		else this.switcher.querySelector('#visualization-list').classList.toggle('hidden');

		Sections.show('stage-configure-visualization');

		this.setupVisualizations();
	}

	get url() {
		return `${this.key}/${this.visualization ? this.visualization.visualization_id : ''}`;
	}

	set disabled(disabled) {

		super.disabled = disabled;
		this.switcher.querySelector('#visualization-list').classList.add('hidden');
	}

	setupVisualizations() {

		this.report = this.selectedReport;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

		const tbody = this.switcher.querySelector('table tbody');

		tbody.textContent = null;

		for(const visualization of this.report.visualizations) {

			const row = document.createElement('tr');

			let type = MetaData.visualizations.get(visualization.type);

			row.innerHTML = `
				<td>${visualization.name}</td>
				<td>${type ? type.name : ''}</td>
				<td class="action configure"><i class="fas fa-cog"></i></td>
				<td class="action red delete"><i class="far fa-trash-alt"></i></td>
			`;

			if(this.visualization == visualization)
				row.classList.add('selected');

			row.querySelector('.configure').on('click', async () => {

				history.pushState({}, '', `/reports/configure-visualization/${visualization.visualization_id}`);

				await this.page.load();
				this.load();
			});

			row.querySelector('.delete').on('click', () => this.delete(visualization));

			tbody.appendChild(row);
		}

		if(!this.report.visualizations.length)
			tbody.innerHTML = '<tr class="NA"><td colspan="4">No Visualization Found! :(</td></tr>';
	}

	async load() {

		this.report = this.selectedReport;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

		if(!window.location.pathname.includes('configure-visualization')) {
			this.container.classList.add('hidden');
			return;
		} else {
			this.container.classList.remove('hidden');
		}

		[this.visualization] = this.report.visualizations.filter(v => v.visualization_id == window.location.pathname.split('/').pop());

		if(!this.visualization)
			return;

		if(ConfigureVisualization.types.has(this.visualization.type))
			this.optionsForm = new (ConfigureVisualization.types.get(this.visualization.type))(this.visualization, this.page, this);

		else throw new Page.Exception(`Unknown visualization type ${this.visualization.type}`);

		this.dashboards = new ReportVisualizationDashboards(this);

		if(typeof this.visualization.options == 'string') {

			try {
				this.visualization.options = JSON.parse(this.visualization.options) || {};
			} catch(e) {}
		}

		if(!this.visualization.options)
			this.visualization.options = {};

		if(!this.visualization.options.transformations)
			this.visualization.options.transformations = [];

		this.transformations = new ReportTransformations(this.visualization, this);

		await this.page.preview.load({
			query_id: this.report.query_id,
			visualization_id: this.visualization.visualization_id,
		});

		this.transformations.load();

		this.form.reset();

		this.form.name.value = this.visualization.name;
		this.form.type.value = this.visualization.type;

		const options = this.container.querySelector('.options');

		options.textContent = null;

		options.appendChild(this.optionsForm.form);

		this.dashboards.load();

		this.page.stages.get('pick-report').switcher.querySelector('small').textContent = this.report.name + ` #${this.report.query_id}`;

		const first = this.container.querySelector('.configuration-section');

		if(first && first.querySelector('.body.hidden'))
			first.querySelector('h3').click();
	}

	async insert(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id,
				name: this.addForm.type.value[0].toUpperCase() + this.addForm.type.value.slice(1),
				type: this.addForm.type.value,
			},
			options = {
				method: 'POST',
			};

		const response = await API.call('reports/visualizations/insert', parameters, options);

		await DataSource.load(true);

		history.pushState({}, '', `/reports/configure-visualization/${response.insertId}`);

		this.select();

		this.load();
	}

	async delete(visualization) {

		if(!confirm('Are you sure?'))
			return;

		const
			parameters = {
				visualization_id: visualization.visualization_id,
			},
			options = {
				method: 'POST',
			};

		const response = await API.call('reports/visualizations/delete', parameters, options);

		await DataSource.load(true);

		this.page.stages.get('pick-report').select();
	}

	async update(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				visualization_id: this.visualization.visualization_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		if(this.optionsForm)
			this.visualization.options = this.optionsForm.json;

		this.visualization.options.transformations = this.transformations.json;

		options.form.set('options', JSON.stringify(this.visualization.options));

		await API.call('reports/visualizations/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}
});

class ReportVisualizationDashboards extends Set {

	constructor(stage) {

		super();

		this.stage = stage;

		this.container = this.stage.container.querySelector('#dashboards');
		this.addForm = this.container.querySelector('#add-dashboard');
	}

	async load() {

		await this.fetch();

		this.process();

		this.render();
	}

	async fetch() {
		this.response = await API.call('dashboards/list')
	}

	process() {

		this.response = new Map(this.response.map(d => [d.id, d]));

		this.clear();

		for(const dashboard of this.response.values()) {

			for(const report of dashboard.format.reports) {

				if(this.stage.visualization.visualization_id == report.visualization_id)
					this.add(new ReportVisualizationDashboard(dashboard, this.stage));
			}
		}
	}

	render() {

		this.container.textContent = null;

		for(const dashboard of this)
			this.container.appendChild(dashboard.form);

		if(!this.size)
			this.container.innerHTML = `<div class="NA">No dashboard added yet! :'(</div>`;

		this.container.insertAdjacentHTML('beforeend', `

			<form id="add-dashboard" class="subform form">

				<label>
					<span>Dashboard</span>
					<select name="dashboard_id"></select>
				</label>

				<label>
					<span>Position</span>
					<input name="position" placeholder="Position" type="number">
				</label>

				<label>
					<button type="submit"><i class="fa fa-plus"></i> Add</button>
				</label>
			</form>
		`);

		const form = this.container.querySelector('#add-dashboard');

		for(const dashboard of this.response.values()) {

			form.dashboard_id.insertAdjacentHTML('beforeend',`
				<option value=${dashboard.id}>
					${dashboard.name} ${this.response.has(dashboard.parent) ? `(parent: ${this.response.get(dashboard.parent).name})` : ''}
				</option>
			`);
		}

		form.on('submit', e => ReportVisualizationDashboards.insert(e, this.stage));
	}

	static async insert(e, stage) {

		e.preventDefault();

		const form = stage.dashboards.container.querySelector('#add-dashboard');

		if(Array.from(stage.dashboards).some(d => d.id == form.dashboard_id.value))
			return alert('Cannot add a visualization to a dashboard more than once!');

		const
			option = {
				method: 'POST',
			},
			parameters = {
				dashboard_id: form.dashboard_id.value,
				visualization_id: stage.visualization.visualization_id,
				format: JSON.stringify({position: parseInt(form.position.value)})
			};

		await API.call('reports/dashboard/insert', parameters, option);
		await stage.dashboards.load();
	}
}

class ReportVisualizationDashboard {

	constructor(dashboard, stage) {

		this.stage = stage;

		for(const key in dashboard)
			this[key] = dashboard[key];

		[this.visualization] = this.format.reports.filter(v => v.visualization_id == this.stage.visualization.visualization_id);
	}

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const form = this.formContainer = document.createElement('form');

		form.classList.add('subform', 'form');

		form.innerHTML = `
			<label>
				<span>Dashboard</span>
				<select name="dashboard_id">
				</select>
			</label>

			<label>
				<span>Position</span>
				<input type="number" name="position" value="${this.visualization.format.position || ''}">
			</label>

			<div class="dashboard-action">
				<label>
					<button type="submit"><i class="fa fa-save"></i> Save</button>
				</label>

				<label>
					<button type="button" class="delete"><i class="far fa-trash-alt"></i> Delete</button>
				</label>
			</div>
		`;

		for(const dashboard of this.stage.dashboards.response.values()) {

			form.dashboard_id.insertAdjacentHTML('beforeend',`
				<option value=${dashboard.id}>
					${dashboard.name} ${this.stage.dashboards.response.has(dashboard.parent) ? `(parent: ${this.stage.dashboards.response.get(dashboard.parent).name})` : ''}
				</option>
			`);
		}

		form.dashboard_id.value = this.visualization.dashboard_id;

		form.querySelector('.delete').on('click', () => this.delete());

		form.on('submit', async e => this.update(e))

		return form;
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			option = {
				method: 'POST',
			},
			parameters = {
				id: this.visualization.id,
			};

		await API.call('reports/dashboard/delete', parameters, option);
		await this.stage.dashboards.load();
	}

	async update(e) {

		e.preventDefault();

		this.visualization.format.position = parseInt(this.form.position.value);

		const
			option = {
				method: 'POST',
			},
			parameters = {
				id: this.visualization.id,
				dashboard_id: this.form.dashboard_id.value,
				visualization_id: this.visualization.visualization_id,
				format: JSON.stringify(this.visualization.format)
			};

		await API.call('reports/dashboard/update', parameters, option);
		await this.stage.dashboards.load();
	}
}

class ReportTransformations extends Set {

	constructor(visualization, stage) {

		super();

		this.visualization = visualization;
		this.stage = stage;
		this.page = this.stage.page;
		this.container = this.stage.container.querySelector('#transformations');

		const preview = this.container.parentElement.querySelector('h3 #transformations-preview');

		preview.removeEventListener('click', ReportTransformations.previewListener);
		preview.on('click', ReportTransformations.previewListener = e => {
			e.stopPropagation();
			this.preview();
		});
	}

	load() {

		this.container.textContent = null;

		if(!this.visualization.options)
			return;

		this.clear();

		for(const transformation_ of this.visualization.options.transformations || []) {

			const transformation = new ReportTransformation(transformation_, this.stage);

			this.container.appendChild(transformation.container);

			this.add(transformation);
		}

		this.container.insertAdjacentHTML('beforeend', `
			<button type="button" class="add-new-transformation">
				<i class="fa fa-plus"></i> Add New Transformation
			</button>
		`);

		const addNew = this.container.querySelector('.add-new-transformation');

		addNew.on('click', () => {

			const transformation = new ReportTransformation({}, this.stage);

			this.add(transformation);
			this.container.insertBefore(transformation.container, addNew);

			this.preview();
		});
	}

	get json() {

		const response = [];

		for(const transformation of this)
			response.push(transformation.json);

		return response.filter(a => a);
	}

	preview() {

		const report = DataSource.list.get(this.stage.report.query_id);

		if(!report)
			return;

		if(!report.transformationVisualization) {

			const visualization = {
				visualization_id: Math.floor(Math.random() * 1000) + 1000,
				name: 'Table',
				type: 'table',
				options: {}
			};

			report.visualizations.push(visualization);
			report.transformationVisualization = visualization;
		}

		report.transformationVisualization.options.transformations = this.json;

		this.page.preview.load({
			query_id: this.stage.report.query_id,
			visualization_id: report.transformationVisualization.visualization_id,
		});
	}
}

class ReportTransformation {

	constructor(transformation, stage) {

		this.stage = stage;
		this.page = this.stage.page;

		for(const key in transformation)
			this[key] = transformation[key];
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('div'),
			rows = document.createElement('div'),
			columns = document.createElement('div'),
			values = document.createElement('div');

		container.classList.add('transformation');

		rows.classList.add('rows');
		columns.classList.add('columns');
		values.classList.add('values');

		rows.innerHTML = `<h4>Rows</h4>`;
		columns.innerHTML = `<h4>Columns</h4>`;
		values.innerHTML = `<h4>Values</h4>`;

		for(const row of this.rows || [])
			rows.appendChild(this.row(row));

		const addRow = document.createElement('button');

		addRow.type = 'button';
		addRow.innerHTML = `<i class="fa fa-plus"></i> Add New Row`;
		addRow.on('click', () => rows.insertBefore(this.row(), addRow));

		rows.appendChild(addRow);

		for(const column of this.columns || [])
			columns.appendChild(this.column(column));

		const addColumn = document.createElement('button');

		addColumn.type = 'button';
		addColumn.innerHTML = `<i class="fa fa-plus"></i> Add New Column`;
		addColumn.on('click', () => columns.insertBefore(this.column(), addColumn));

		columns.appendChild(addColumn);

		for(const value of this.values || [])
			values.appendChild(this.value(value));

		const addValue = document.createElement('button');

		addValue.type = 'button';
		addValue.innerHTML = `<i class="fa fa-plus"></i> Add New Value`;
		addValue.on('click', () => values.insertBefore(this.value(), addValue));

		values.appendChild(addValue);

		container.appendChild(rows);
		container.appendChild(columns);
		container.appendChild(values);

		return container;
	}

	get json() {

		const response = {
			type: 'pivot',
			rows: [],
			columns: [],
			values: [],
		};

		for(const row of this.container.querySelectorAll('.row')) {
			response.rows.push({
				column: row.querySelector('*[name=column]').value,
			});
		}

		for(const column of this.container.querySelectorAll('.column')) {
			response.columns.push({
				column: column.querySelector('*[name=column]').value,
			});
		}

		for(const value of this.container.querySelectorAll('.value')) {
			response.values.push({
				column: value.querySelector('*[name=column]').value,
				function: value.querySelector('select[name=function]').value
			});
		}

		if(!response.rows.length && !response.columns.length && !response.values.length)
			return null;

		return response;
	}

	row(row = {}) {

		const container = document.createElement('div');

		container.classList.add('row');

		if(this.page.preview.report.originalResponse) {

			container.innerHTML = `<select name="column"></select>`;

			const select = container.querySelector('select');

			for(const column in this.page.preview.report.originalResponse.data[0])
				select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

			select.value = row.column;

		} else {
			container.innerHTML = `<input type="text" name="column" value="${row.column || ''}">`;
		}

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', e => {
			e.stopPropagation();
			container.remove();
		});

		return container;
	}

	column(column = {}) {

		const container = document.createElement('div');

		container.classList.add('column');

		if(this.page.preview.report.originalResponse) {

			container.innerHTML = `<select name="column"></select>`;

			const select = container.querySelector('select');

			for(const column in this.page.preview.report.originalResponse.data[0])
				select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

			select.value = column.column;

		} else {
			container.innerHTML = `<input type="text" name="column" value="${column.column || ''}">`;
		}

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', () => container.remove());

		return container;
	}

	value(value = {}) {

		const container = document.createElement('div');

		container.classList.add('value');


		if(this.page.preview.report.originalResponse) {

			container.innerHTML = `<select name="column"></select>`;

			const select = container.querySelector('select');

			for(const column in this.page.preview.report.originalResponse.data[0])
				select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

			select.value = value.column;

		} else {
			container.innerHTML = `<input type="text" name="column" value="${value.column || ''}">`;
		}

		container.insertAdjacentHTML('beforeend',`
			<select name="function">
				<option value="sum">Sum</option>
				<option value="count">Count</option>
				<option value="distinctcount">Distinct Count</option>
				<option value="values">Values</option>
				<option value="distinctvalues">Distinct Values</option>
				<option value="max">Max</option>
				<option value="min">Min</option>
				<option value="average">Average</option>
			</select>
			<button type="button"><i class="far fa-trash-alt"></i></button>
		`);

		if(value.function)
			container.querySelector('select[name=function]').value = value.function;

		container.querySelector('button').on('click', () => container.remove());

		return container;
	}
}

class ReportVisualizationOptions {

	constructor(visualization, page, stage) {
		this.visualization = visualization;
		this.page = page;
		this.stage = stage;
	}

	get form() {
		return document.createElement('form');
	}

	get json() {
		return {};
	}
}

class ReportVisualizationLinearOptions extends ReportVisualizationOptions {

	get form() {

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Axes</h3>
				<div class="options form body">
					<div class="axes"></div>
					<button class="add-axis" type="button">
						<i class="fa fa-plus"></i> Add New Axis
					</button>
				</div>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="options form body">
					<div class="legend">
						<label>
							<span>
								<input type="checkbox" name="lagend">Hide Legend.
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		this.stage.setupConfigurationSetions(container);

		const axes = container.querySelector('.axes');

		for(const axis of this.visualization.options ? this.visualization.options.axes || [] : [])
			axes.appendChild(this.axis(axis));

		if(this.visualization.options && this.visualization.options.legend)
			container.querySelector('.legend input').checked = this.visualization.options.legend;

		container.querySelector('.add-axis').on('click', () => {
			axes.appendChild(this.axis());
		});

		return container;
	}

	get json() {

		const response = {
			axes: [],
			hideLegend: this.formContainer.querySelector('.legend input').checked,
		};

		for(const axis of this.formContainer.querySelectorAll('.axis')) {

			const columns = [];

			for(const option of axis.querySelectorAll('select[name=columns] option:checked'))
				columns.push({key: option.value});

			response.axes.push({
				position: axis.querySelector('select[name=position]').value,
				label: axis.querySelector('input[name=label]').value,
				columns,
				restcolumns: axis.querySelector('input[name=restcolumns]').checked,
				format: axis.querySelector('select[name=format]').value,
			});
		}

		return response;
	}

	axis(axis = {}) {

		const container = document.createElement('div');

		container.classList.add('axis', 'subform');

		container.innerHTML = `
			<label>
				<span>Position</span>
				<select name="position" value="${axis.position}" required>
					<option value="top">Top</option>
					<option value="right">Right</option>
					<option value="bottom">Bottom</option>
					<option value="left">Left</option>
				</select>
			</label>

			<label>
				<span>Label</span>
				<input type="text" name="label" value="${axis.label || ''}">
			</label>

			<label>
				<span>Columns</span>
				<select name="columns" multiple></select>
			</label>

			<label><span><input type="checkbox" name="restcolumns" ${axis.restcolumns ? 'checked' : ''}> Rest</span></label>

			<label>
				<span>Format</span>
				<select name="format">
					<option value="">None</option>
					<option value="s">SI</option>
				</select>
			</label>

			<label>
				<button class="delete" type="button">
					<i class="far fa-trash-alt"></i> Delete
				</button>
			</label>
		`;

		const columns = container.querySelector('select[name=columns]');

		for(const [key, column] of this.page.preview.report.columns) {

			columns.insertAdjacentHTML('beforeend', `
				<option value="${key}" ${axis.columns && axis.columns.some(c => c.key == key) ? 'selected' : ''}>${column.name}</option>
			`)
		}

		container.querySelector('select[name=position]').value = axis.position;
		container.querySelector('select[name=format]').value = axis.format || '';

		container.querySelector('.delete').on('click', () => container.parentElement && container.parentElement.removeChild(container));

		return container;
	}
}

const ConfigureVisualization = ReportsManger.stages.get('configure-visualization');

ConfigureVisualization.types = new Map;

ConfigureVisualization.types.set('table', class TableOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('line', class LineOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('scatter', class ScatterOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('bubble', class BubbleOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('bar', class BarOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('dualaxisbar', class DualAxisBarOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('stacked', class StackedOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('area', class AreaOptions extends ReportVisualizationLinearOptions {
});

ConfigureVisualization.types.set('pie', class PieOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('funnel', class FunnelOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('spatialmap', class SpatialMapOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('cohort', class CohortOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('json', class JSONOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('bigtext', class BigTextOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body form">
					<label>
						<span>Column</span>
						<select name="column"></select>
					</label>

					<label>
						<span>Type</span>
						<select name="valueType">
							<option value="text">Text</option>
							<option value="number">Number</option>
							<option value="date">Date</option>
						</select>
					</label>

					<label>
						<span>Prefix</span>
						<input type="text" name="prefix" value="${(this.visualization.options && this.visualization.options.prefix) || ''}">
					</label>

					<label>
						<span>Postfix</span>
						<input type="text" name="postfix" value="${(this.visualization.options && this.visualization.options.postfix) || ''}">
					</label>
				</div>
			</div>
		`;

		const
			columnSelect = container.querySelector('select[name=column]'),
			valueType = container.querySelector('select[name=valueType]');

		for(const [key, column] of this.page.preview.report.columns) {

			columnSelect.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		columnSelect.value = (this.visualization.options && this.visualization.options.column) || '';
		valueType.value = (this.visualization.options && this.visualization.options.valueType) || '';

		this.stage.setupConfigurationSetions(container);

		return container;
	}

	get json() {

		return {
			column: this.form.querySelector('select[name=column]').value,
			valueType: this.form.querySelector('select[name=valueType]').value,
			prefix: this.form.querySelector('input[name=prefix]').value,
			postfix: this.form.querySelector('input[name=postfix]').value,
		}
	}
});

ConfigureVisualization.types.set('livenumber', class LiveNumberOptions extends ReportVisualizationOptions {

	get form() {

		if (this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('form');

		container.classList.add('form');

		container.innerHTML = `
			<label>
				<span>Column</span>
				<select name="timing"></select>
			</label>

			<label>
				<span>Value</span>
				<select name="value"></select>
			</label>

			<label>
				<span>Invert Values</span>
				<select name="invertValues">
					<option value="1">Yes</option>
					<option value="0">No</option>
				</select>
			</label>

			<label>
				<span>Prefix</span>
				<input type="text" name="prefix">
			</label>

			<label>
				<span>Postfix</span>
				<input type="text" name="postfix">
			</label>

			<h4>Boxes</h4>
			<div id="config-boxes"></div>
			<button class="add-box" type="button">
				<i class="fa fa-plus"></i> Add New Box
			</button>
		`;

		const timing = container.querySelector('select[name=timing]');
		const value = container.querySelector('select[name=value]');

		for (const [key, column] of this.report.columns) {

			timing.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			value.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		if (this.visualization.options) {
			timing.value = this.visualization.options.timingColumn;
			value.value = this.visualization.options.valueColumn;
			this.form.querySelector('select[name=invertValues]').value = this.visualization.options.invertValues;
			this.form.querySelector('input[name=prefix]').value = this.visualization.options.prefix;
			this.form.querySelector('input[name=postfix]').value = this.visualization.options.postfix;

			for (let box of this.visualization.options.boxes) {
				container.appendChild(this.box(box));
			}
		}

		container.querySelector('.add-box').on('click', () => {
			container.appendChild(this.box());
		});

		return container;
	}

	get json() {

		let config = {
			timingColumn: this.form.querySelector('select[name=timing]').value,
			valueColumn: this.form.querySelector('select[name=value]').value,
			invertValues: parseInt(this.form.querySelector('select[name=invertValues]').value),
			prefix: this.form.querySelector('input[name=prefix]').value,
			postfix: this.form.querySelector('input[name=postfix]').value,
		};

		config.boxes = [];

		for (let box of this.form.querySelectorAll('.subform')) {
			config.boxes.push({
				offset: box.querySelector('input[name=offset]').value,
				relativeValTo: box.querySelector('input[name=relativeValTo]').value,
				row: box.querySelector('input[name=row]').value,
				column: box.querySelector('input[name=column]').value,
				rowspan: box.querySelector('input[name=rowspan]').value,
				columnspan: box.querySelector('input[name=columnspan]').value
			});
		}

		return config;
	}

	box(boxValues = {}) {

		const boxConfig = document.createElement('div');

		boxConfig.classList.add('subform', 'form');

		boxConfig.innerHTML = `
			<label>
				<span>Offset</span>
				<input type="text" name="offset">
			</label>

			<label>
				<span>Relative To(Index)</span>
				<input type="text" name="relativeValTo">
			</label>

			<label>
				<span>Column</span>
				<input type="text" name="column">
			</label>

			<label>
				<span>Row</span>
				<input type="text" name="row">
			</label>

			<label>
				<span>Column Span</span>
				<input type="text" name="columnspan">
			</label>

			<label>
				<span>Row Span</span>
				<input type="text" name="rowspan">
			</label>
		`;

		if (boxValues) {
			boxConfig.querySelector('input[name=offset]').value = boxValues.offset;
			boxConfig.querySelector('input[name=relativeValTo]').value = boxValues.relativeValTo;
			boxConfig.querySelector('input[name=row]').value = boxValues.row;
			boxConfig.querySelector('input[name=column]').value = boxValues.column;
			boxConfig.querySelector('input[name=rowspan]').value = boxValues.rowspan;
			boxConfig.querySelector('input[name=columnspan]').value = boxValues.columnspan;
		}

		return boxConfig;
	}
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