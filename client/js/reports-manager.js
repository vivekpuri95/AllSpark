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

		const connections = new Map;

		for(const connection of this.connections) {

			for(const feature of MetaData.features.values()) {

				if(feature.slug == connection.type && feature.type == 'source')
					connection.feature = feature;
			}

			if(!connection.feature)
				continue;

			connections.set(connections.id, connection);
		}
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

		this.position = 'right';
	}

	async load(options = {}) {

		this.container.textContent = null;
		this.container.classList.add('hidden');

		if(!DataSource.list.has(options.query_id))
			return this.report = false;

		this.report = JSON.parse(JSON.stringify(DataSource.list.get(options.query_id)));
		this.report.visualizations = this.report.visualizations.filter(f => options.visualization ? f.visualization_id == options.visualization.id : f.type == 'table');

		if(options.definition && options.definition != this.report.definition) {
			this.report.query = options.definition.query;
			this.report.definition = options.definition;
			this.report.definitionOverride = true;
		}

		if(options.visualizationOptions)
			this.report.visualizations[0].options = options.visualizationOptions;

		if(options.visualization && options.visualization.type)
			this.report.visualizations[0].type = options.visualization.type;

		if(options.visualization && options.visualization.name)
			this.report.visualizations[0].name = options.visualization.name;

		this.report = new DataSource(this.report);

		this.report.container;
		this.report.visualizations.selected.container.classList.toggle('unsaved', this.report.definitionOverride ? 1 : 0);

		this.container.appendChild(this.report.container);
		this.container.classList.remove('hidden');

		this.page.container.classList.add('preview-' + this.position);

		await this.report.visualizations.selected.load();

		this.move({render: false});
	}

	set hidden(hidden) {

		this.container.classList.toggle('hidden', hidden);
		this.move();
	}

	get hidden() {
		return this.container.classList.contains('hidden');
	}

	set position(position) {

		this._position = position;
		this.move();
	}

	get position() {
		return this._position;
	}

	async move({render = true} = {}) {

		this.page.container.classList.remove('preview-top', 'preview-right', 'preview-bottom', 'preview-left');

		if(this.hidden || !this.report)
			return;

		this.page.container.classList.add('preview-' + this.position);

		if(render)
			this.report.visualizations.selected.render({resize: true});
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
				window.history.pushState({}, '', `/reports/${this.url}`);
		});

		return container;
	}

	select() {

		if(this.page.stages.selected)
			this.page.stages.selected.switcher.classList.remove('selected');

		this.switcher.classList.add('selected');

		Sections.show(this.container.id);

		this.page.stages.selected = this;

		const
			reportName = this.page.stages.get('pick-report').switcher.querySelector('small'),
			visualizationsName = this.page.stages.get('pick-visualization').switcher.querySelector('small'),
			report = this.selectedReport;

		if(report) {

			reportName.textContent = report ? `${report.name} #${report.query_id}` : 'Add New Report';

			let visualization,
				id = parseInt(location.pathname.split('/').pop())

			if(this.page.stages.get('configure-visualization').lastSelectedVisualizationId)
				id = this.page.stages.get('configure-visualization').lastSelectedVisualizationId;

			if(id)
				[visualization] = report.visualizations.filter(v => v.visualization_id == id)

			visualizationsName.textContent = visualization ? `${visualization.name} #${visualization.visualization_id}` : 'Add or Edit a Visualization';
		}

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

		const id = parseInt(location.pathname.split('/').pop());

		if(location.pathname.includes('/configure-visualization')) {

			for(const _report of DataSource.list.values()) {

				if(_report.visualizations.some(v => v.visualization_id == id))
					report = JSON.parse(JSON.stringify(_report));
			}
		}

		else if(DataSource.list.has(id))
			report = JSON.parse(JSON.stringify(DataSource.list.get(id)));

		if(report) {

			const connection = this.page.connections.get(parseInt(report.connection_name));

			if(!connection)
				throw new Page.exception('Report connection not found! :(');

			if(!ReportConnection.types.has(connection.type))
				throw new Page.exception('Invalid report connection type! :(');

			report.connection = new (ReportConnection.types.get(connection.type))(report, this);
		}

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
			window.history.pushState({id: 'add'}, '', `/reports/configure-report/add`);
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
				<input type="search" class="column-search ${column.dataset.key}" data-key="${column.dataset.key}" placeholder="Search ${column.textContent}">
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

		this.page.stages.get('configure-visualization').lastSelectedVisualizationId = null;

		const
			theadSearch = document.querySelectorAll('.column-search'),
			tbody = this.container.querySelector('tbody');

		tbody.textContent = null;

		for(const report of this.reports) {

			const connection = this.page.connections.get(parseInt(report.connection_name));

			if(!connection)
				continue;

			const row = document.createElement('tr');

			let tags = report.tags ? report.tags.split(',') : [];

			tags = tags.map(t => {

				const a = document.createElement('a');
				a.classList.add('tag');
				a.textContent = t.trim();

				a.on('click', e => this.tagSearch(e));
				return a;
			});

			row.innerHTML = `
				<td>${report.query_id}</td>
				<td>
					<a href="/report/${report.query_id}" target="_blank">
						${report.name}
					</a>
				</td>
				<td>${report.description || ''}</td>
				<td>${connection.connection_name} (${connection.feature.name})</td>
				<td class="tags"></td>
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

			for(const tag of tags)
				row.querySelector('.tags').appendChild(tag);

			row.querySelector('.configure').on('click', () => {

				window.history.pushState({}, '', `/reports/configure-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('pick-visualization').disabled = false;

				this.page.load();
			});

			row.querySelector('.define').on('click', () => {

				window.history.pushState({}, '', `/reports/define-report/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('pick-visualization').disabled = false;

				this.page.load();
			});

			row.querySelector('.visualizations').on('click', () => {

				window.history.pushState({}, '', `/reports/pick-visualization/${report.query_id}`);

				this.page.stages.get('configure-report').disabled = false;
				this.page.stages.get('define-report').disabled = false;
				this.page.stages.get('pick-visualization').disabled = false;

				this.page.load();
			});

			row.querySelector('.delete').on('click', () => this.delete(report));

			tbody.appendChild(row);
		}

		if(!tbody.children.length)
			tbody.innerHTML = `<tr class="NA"><td colspan="11">No Reports Found! :(</td></tr>`;

		this.switcher.querySelector('small').textContent = 'Pick a report';
	}

	tagSearch(e) {

		e.stopPropagation();

		const
			value = e.currentTarget.textContent,
			column = this.container.querySelector('table thead tr.search .tags');

		column.value = `"${value}"`;

		this.load()
	}

	get reports() {

		let reports = JSON.parse(JSON.stringify(Array.from(DataSource.list.values())));

		const inputs = this.container.querySelectorAll('thead tr.search th input');

		reports = reports.filter(report => {

			for(const input of inputs) {

				const query = input.value.toLowerCase();

				if(!query)
					continue;

				if(query.startsWith('"') && input.classList.contains('tags')) {

					return report.tags.split(',').some(tag => `"${tag.trim().toLowerCase()}"` == query);
				}

				else if(['filters', 'visualization'].includes(input.dataset.key)) {

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

				if(typeof a == 'string' && typeof b == 'string') {
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

		window.history.pushState({}, '', `/reports/configure-report/add`);

		this.page.stages.get('configure-report').disabled = false;

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
		this.shareContainer = this.container.querySelector('#share-report');

		for(const element of this.form.elements)
			element.on('change', () => this.form.save.classList.add('unsaved'));

		this.form.redis.removeEventListener('change', this.handleRedisSelect);

		this.form.redis.on('change', this.handleRedisSelect = () => {

			this.form.is_redis.type = this.form.redis.value === 'EOD' ? 'text' : 'number';

			this.form.is_redis.value = this.form.redis.value;
			this.form.is_redis.classList.toggle('hidden', this.form.redis.value !== 'custom');

			if(!this.form.is_redis.classList.contains('hidden'))
				this.form.is_redis.focus();
		});
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	load() {

		if(!this.form.connection_name.children.length) {

			for(const connection of this.page.connections.values()) {
				this.form.connection_name.insertAdjacentHTML('beforeend',
					`<option value="${connection.id}">${connection.connection_name} (${connection.feature.name})</option>`
				)
			}
		}

		this.report = this.selectedReport;

		this.report ? this.edit() : this.add();
	}

	add() {

		this.form.removeEventListener('submit', this.form.listener);
		this.form.on('submit', this.form.listener = e => this.insert(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');
		this.shareContainer.innerHTML = `<div class="NA">You can share the dashboard once the report is added.</div>`;

		this.container.querySelector('#added-by').textContent = null;

		if(this.form.redis.value == 'custom')
			this.form.is_redis.classList.remove('hidden');

		else this.form.is_redis.classList.add('hidden');
	}

	async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		const response = await API.call('reports/report/insert', {}, options);

		await DataSource.load(true);

		window.history.replaceState({}, '', `/reports/define-report/${response.insertId}`);

		this.page.load();
		this.page.stages.get('configure-report').disabled = false;
		this.page.stages.get('define-report').disabled = false;
		this.page.stages.get('pick-visualization').disabled = false;
	}

	async edit() {

		this.form.removeEventListener('submit', this.form.listener);
		this.form.on('submit', this.form.listener = e => this.update(e));

		this.form.reset();
		this.form.save.classList.remove('unsaved');

		for(const key in this.report) {
			if(this.form.elements[key])
				this.form.elements[key].value = this.report[key];
		}

		this.container.querySelector('#added-by').innerHTML = `
			Added by
			<strong><a href="/user/profile/${this.report.added_by}" target="_blank">${this.report.added_by_name || 'Unknown User'}</a></strong>
			on
			<strong>${Format.time(this.report.created_at)}</strong>
		`;

		if(this.report.is_redis > 0) {
			this.form.redis.value = 'custom';
			this.form.is_redis.classList.remove('hidden');
		}

		else {
			this.form.redis.value = this.report.is_redis || 0;
			this.form.is_redis.classList.add('hidden');
		}

		const share = new ObjectRoles('report', this.report.query_id);

		await share.load();

		this.shareContainer.textContent = null;
		this.shareContainer.appendChild(share.container);
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id,
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

		this.filterForm = this.container.querySelector('#filters form');

		this.filterForm.datasetMultiSelect = new MultiSelect({dropDownPosition: 'top', multiple: false});
		this.filterForm.querySelector('label.dataset').appendChild(this.filterForm.datasetMultiSelect.container);

		this.schemas = new Map;
		this.schemaLists = new Map;

		const schemaToggle = this.container.querySelector('#schema-toggle');

		schemaToggle.on('click', () => {

			schemaToggle.classList.toggle('selected');

			const container = this.container.querySelector('#schema')

			container.classList.toggle('hidden');

			// Render the schema to the UI if the schema panel isn't hidden
			if(container.classList.contains('hidden'))
				return;

			container.textContent = null;
			container.appendChild(this.schema);
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

			previewToggle.classList.toggle('selected');
			this.page.preview.hidden = !previewToggle.classList.contains('selected');

			if(this.report.connection.editor)
				this.report.connection.editor.editor.resize();
		});

		this.editReportData = new EditReportData();

		this.editReportData.container.classList.add('hidden');
		this.container.querySelector('#define-report-parts').appendChild(this.editReportData.container);

		const editDataToggle = this.container.querySelector('#edit-data-toggle');

		editDataToggle.on('click', async () => {

			editDataToggle.classList.toggle('selected');
			this.editReportData.container.classList.toggle('hidden', !editDataToggle.classList.contains('selected'));
			this.report.connection.form.classList.toggle('hidden');

			if(!this.editReportData.container.classList.contains('hidden'))
				await this.editReportData.load(this.report.query_id);
		});

		this.container.querySelector('#add-filter').on('click', () => this.addFilter());

		this.container.querySelector('#filter-back').on('click', () => {
			this.container.querySelector('#filter-form').classList.add('hidden');
			this.container.querySelector('#filter-list').classList.remove('hidden');
		});

		this.container.querySelector('#run').on('click', () => this.preview());
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	async preview() {

		const definition = this.report.connection.json;

		if(this.report.connection.editor && this.report.connection.editor.editor.getSelectedText())
			definition.query = this.report.connection.editor.editor.getSelectedText();

		const options = {
			query_id: this.report.query_id,
			definition: definition,
		};

		await this.page.preview.load(options);

		this.page.preview.hidden = false;
		this.container.querySelector('#preview-toggle').classList.add('selected');

		if(this.report.connection.editor)
			this.report.connection.editor.editor.resize();
	}

	async load() {

		this.report = this.selectedReport;

		if(!this.page.stages.get('configure-visualization').lastSelectedVisualizationId)
			this.page.stages.get('configure-visualization').disabled = true;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

		if(this.container.querySelector('#define-report-form'))
			this.container.querySelector('#define-report-form').remove();

		this.container.querySelector('#define-report-parts').appendChild(this.report.connection.form);

		this.container.querySelector('#edit-data-toggle').classList.toggle('hidden', !this.report.load_saved);

		if(this.report.connection.editor)
			this.report.connection.editor.editor.focus();

		this.loadSchema();
		this.filters();

		this.page.preview.position = 'bottom';
		this.container.querySelector('#preview-toggle').classList.toggle('selected', !this.page.preview.hidden);

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
				query: this.report.connection.json.query,
				definition: JSON.stringify(this.report.connection.json),
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/report/update', parameters, options);

		await DataSource.load(true);

		this.load();
	}

	filterSuggestions() {

		// If the connection type doesn't have an editor (API, CSV, etc)
		if(!this.report.connection.editor)
			return;

		let placeholders = this.report.connection.editor.value.match(/{{([a-zA-Z0-9_-]*)}}/g) || [];

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

	async loadSchema() {

		// Load and save the schema if we haven't already
		if(!this.schemas.has(this.report.connection_name)) {

			try {
				this.schemas.set(this.report.connection_name, await API.call('credentials/schema', { id: this.report.connection_name }));
			} catch(e) {
				return;
			}
		}

		// Prepare a schema list in CodeEditor friendly format
		const
			response = this.schemas.get(this.report.connection_name),
			schema = mysqlKeywords.map(k => {return {
				name: k,
				value: k,
				meta: 'MySQL Keyword',
			}});

		if(this.report) {

			for(const filter of this.report.filters) {
				schema.push({
					name: filter.placeholder,
					value: filter.placeholder,
					meta: 'Report Filter',
				});
			}
		}

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

		// Attach the schema list to the CodeEditor's autocomplete.
		if(this.report.connection.editor)
			this.report.connection.editor.setAutoComplete(schema);
	}

	/**
	 * Return a div with search input and the schema list for the current report's connection.
	 * We're doing this separately because rendering the UI is a huge cost on the UI thread. And we want to do this on-demand.
	 *
	 * @return HTMLElement	The fragement with the components of the schema UI.
	 */
	get schema() {

		if(this.schemaLists.has(this.report.connection_name))
			return this.schemaLists.get(this.report.connection_name);

		const container = document.createElement('div');

		// If the schema hasn't loaded yet or if it failed to load
		if(!this.schemas.has(this.report.connection_name)) {

			const div = document.createElement('div');

			div.classList.add('NA');
			div.innerHTML = 'Failed to load Schema! :(';

			container.appendChild(div);

			return container;
		}

		const
			response = this.schemas.get(this.report.connection_name),
			databases = document.createElement('ul'),
			search = document.createElement('input'),
			that = this;

		search.type = 'search';
		search.placeholder = 'Search...';

		search.on('keyup', () => renderList());

		container.appendChild(search);

		// A separate function because we want to do this on both the search input and on UI load.
		const renderList = () => {

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
								<span title="${name}">${name}</span>
								<small>${column.type}</small>
							</span>
						`;

						li.querySelector('.name').on('click', () => {

							if(that.report.connection.editor)
								that.report.connection.editor.getSession().insert(that.report.connection.editor.getCursorPosition(), column.name);
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
							<span title="${name}">${name}</span>
							<small>${table.columns.length} columns, <a title="Preview first 100 rows">Pr</a></small>
						</span>
					`;

					li.appendChild(columns)

					li.querySelector('.name').on('click', () => {
						li.classList.toggle('opened');
						columns.classList.toggle('hidden')
					});

					li.querySelector('.name small a').on('click', e => {

						e.stopPropagation();

						if(!this.report)
							return;

						this.page.preview.load({
							query: `SELECT * FROM \`${database.name}\`.\`${table.name}\` LIMIT 100`,
							query_id: this.report.query_id,
						});
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

		renderList();

		container.appendChild(databases);

		this.schemaLists.set(this.report.connection_name, container);

		return container;
	}

	filters() {

		const tbody = this.container.querySelector('#filters table tbody');

		tbody.textContent = null;

		this.report.filters.sort((a, b) => {
			a = a.order;
			b = b.order;

			if (a < b)
				return -1;

			if (a > b)
				return 1;

			return a - b;
		});

		for(const filter of this.report.filters) {

			const row = document.createElement('tr');

			let datasetName = '';

			if(filter.dataset && DataSource.list.has(filter.dataset)) {

				const dataset = DataSource.list.get(filter.dataset);

				datasetName = `
					<a href="/report/${dataset.query_id}" target="_blank" title="${DataSource.list.get(dataset.query_id).name}">
						${dataset.name}
					</a>
				`;
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
			tbody.innerHTML = `<tr class="NA"><td>No filters added yet! :(</td></tr>`;

		this.filterForm.datasetMultiSelect.datalist = Array.from(DataSource.list.values()).filter(r => r.query_id != this.report.query_id).map(r => {return {name: r.name, value: r.query_id}});
		this.filterForm.datasetMultiSelect.render();
	}

	addFilter() {

		const filterForm = this.container.querySelector('#filter-form');

		filterForm.classList.remove('hidden');
		this.container.querySelector('#filter-list').classList.add('hidden');

		const select = filterForm.querySelector('select[name="type"]');

		select.textContent = null;

		for (const type of MetaData.filterTypes.values()) {

			if(!type.input_type)
				continue;

			select.insertAdjacentHTML('beforeend', `
				<option value="${type.name.toLowerCase()}">${type.name}</option>
			`);
		}

		this.filterForm.removeEventListener('submit', this.filterForm.listener);
		this.filterForm.on('submit', this.filterForm.listener = e => this.insertFilter(e));

		this.filterForm.datasetMultiSelect.clear();

		this.filterForm.reset();

		this.filterForm.name.focus();
	}

	async insertFilter(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query_id: this.report.query_id,
				dataset: this.filterForm.datasetMultiSelect.value[0] || '',
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

		const select = this.filterForm.querySelector('select[name="type"]');

		select.textContent = null;

		for(const type of MetaData.filterTypes.values()) {

			if(!type.input_type)
				continue;

			select.insertAdjacentHTML('beforeend', `
				<option value="${type.name.toLowerCase()}">${type.name}</option>
			`);
		}

		for(const key in filter) {
			if(key in this.filterForm)
				this.filterForm[key].value = filter[key];
		}

		this.filterForm.datasetMultiSelect.value = filter.dataset;

		this.filterForm.name.focus();
	}

	async updateFilter(e, filter) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				filter_id: filter.filter_id,
				dataset: this.filterForm.datasetMultiSelect.value[0] || '',
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

ReportsManger.stages.set('pick-visualization', class PickVisualization extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '4';
		this.title = 'Pick Visualization';
		this.description = 'Add or Edit a Visualization';

		this.form = this.page.container.querySelector('#add-visualization-form');

		this.container.querySelector('#add-visualization').on('click', () => {

			this.form.reset();

			this.page.preview.hidden = true;
			this.form.classList.remove('hidden');
			this.container.querySelector('#add-visualization-picker').classList.remove('hidden');
			this.container.querySelector('#visualization-list').classList.add('hidden');
		});

		this.container.querySelector('#visualization-picker-back').on('click', () => {

			this.container.querySelector('#add-visualization-picker').classList.add('hidden');
			this.container.querySelector('#visualization-list').classList.remove('hidden');

			this.page.preview.hidden = false;
		});

		for(const visualization of MetaData.visualizations.values()) {

			const label = document.createElement('label');

			label.innerHTML = `
				<figure>
					<img alt="${visualization.name}">
					<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>
					<span class="NA hidden">Preview not available! :(</span>
					<figcaption>${visualization.name}</figcaption>
				</figure>
			`;

			const
				img = label.querySelector('img'),
				loader = label.querySelector('.loader'),
				NA = label.querySelector('.NA');

			img.on('load', () => {
				img.classList.add('show');
				loader.classList.add('hidden');
			});

			img.on('error', () => {
				NA.classList.remove('hidden');
				loader.classList.add('hidden');
			});

			img.src = visualization.image;

			label.on('click', () => {

				if(this.form.querySelector('figure.selected'))
					this.form.querySelector('figure.selected').classList.remove('selected');

				label.querySelector('figure').classList.add('selected');

				this.insert(visualization);
			});

			this.form.appendChild(label);
		}

		if(!MetaData.visualizations.size)
			this.form.innerHTML = `<div class="NA">No visualizations found :(</div>`;
	}

	get url() {
		return `${this.key}/${this.report.query_id}`;
	}

	async insert(visualization) {

		const
			parameters = {
				query_id: this.report.query_id,
				name: this.report.name,
				type: visualization.slug,
			},
			options = {
				method: 'POST',
			};

		const response = await API.call('reports/visualizations/insert', parameters, options);

		await DataSource.load(true);

		window.history.pushState({}, '', `/reports/configure-visualization/${response.insertId}`);

		this.page.load();
		this.container.querySelector('#add-visualization-picker').classList.add('hidden');
		this.container.querySelector('#visualization-list').classList.remove('hidden');
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

		this.select();
	}

	async load() {

		this.report = this.selectedReport;

		this.page.preview.hidden = true;

		if(!this.page.stages.get('configure-visualization').lastSelectedVisualizationId)
			this.page.stages.get('configure-visualization').disabled = true;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

		const tbody = this.container.querySelector('table tbody');

		tbody.textContent = null;

		for(const visualization of this.report.visualizations) {

			if(!visualization.visualization_id)
				continue;

			const row = document.createElement('tr');

			let type = MetaData.visualizations.get(visualization.type);

			row.innerHTML = `
				<td>${visualization.name}</td>
				<td>${visualization.description || ''}</td>
				<td>${type ? type.name : ''}</td>
				<td class="action preview"><i class="fas fa-eye"></i></td>
				<td class="action edit"><i class="fas fa-cog"></i></td>
				<td class="action red delete"><i class="far fa-trash-alt"></i></td>
			`;

			if(this.visualization == visualization)
				row.classList.add('selected');

			row.querySelector('.preview').on('click', () => {

				this.page.preview.load({
					query_id: this.report.query_id,
					visualization: {
						id: visualization.visualization_id
					},
				});
			});

			row.querySelector('.edit').on('click', () => {

				window.history.pushState({}, '', `/reports/configure-visualization/${visualization.visualization_id}`);

				this.page.stages.get('configure-visualization').disabled = false;
				this.page.stages.get('configure-visualization').lastSelectedVisualizationId = visualization.visualization_id;

				this.page.load();
			});

			row.querySelector('.delete').on('click', () => this.delete(visualization));

			tbody.appendChild(row);
		}

		if(!this.report.visualizations.length)
			tbody.innerHTML = '<tr class="NA"><td colspan="6">No Visualization Found! :(</td></tr>';

		this.page.preview.position = 'right';
	}
});

ReportsManger.stages.set('configure-visualization', class ConfigureVisualization extends ReportsMangerStage {

	constructor(page, key) {

		super(page, key);

		this.order = '5';
		this.title = 'Configure Visualization';
		this.description = 'Define how the report is visualized';

		this.form = this.container.querySelector('#configure-visualization-form');

		this.container.querySelector('#configure-visualization-back').on('click', () => {

			if(window.history.state) {
				window.history.back();
				return;
			}

			history.pushState({}, '', `/reports/pick-visualization/${this.report.query_id}`);

			this.disabled = true;

			this.page.load();
		});

		for(const visualization of MetaData.visualizations.values()) {
			this.form.type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		this.form.on('submit', e => this.update(e));
		this.container.querySelector('#preview-configure-visualization').on('click', e => this.preview(e));

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

	get url() {
		return `${this.key}/${this.visualization ? this.visualization.visualization_id : ''}`;
	}

	async load() {

		this.report = this.selectedReport;

		if(!this.report)
			throw new Page.exception('Invalid Report ID');

		let visualization_id = window.location.pathname.split('/').pop();

		if(!window.location.pathname.includes('configure-visualization')) {

			if(!this.lastSelectedVisualizationId)
				return this.container.classList.add('hidden');

			visualization_id = this.lastSelectedVisualizationId;

			window.history.pushState({}, '', `/reports/${this.url}`);
		}

		this.lastSelectedVisualizationId = visualization_id;

		[this.visualization] = this.report.visualizations.filter(v => v.visualization_id == window.location.pathname.split('/').pop());

		if(!this.visualization)
			return;

		if(ConfigureVisualization.types.has(this.visualization.type))
			this.optionsForm = new (ConfigureVisualization.types.get(this.visualization.type))(this.visualization, this.page, this);

		else throw new Page.exception(`Unknown visualization type ${this.visualization.type}`);

		if(typeof this.visualization.options == 'string') {

			try {
				this.visualization.options = JSON.parse(this.visualization.options) || {};
			} catch(e) {}
		}

		if(!this.visualization.options)
			this.visualization.options = {};

		if(!this.visualization.options.transformations)
			this.visualization.options.transformations = [];

		if(!this.visualization.options.axes)
			this.visualization.options.axes = [];

		this.dashboards = new ReportVisualizationDashboards(this);
		this.transformations = new ReportTransformations(this.visualization, this);
		this.reportVisualizationFilters =  new ReportVisualizationFilters(this);

		this.form.reset();
		this.dashboards.clear();
		this.transformations.clear();
		this.reportVisualizationFilters.clear();

		this.form.name.value = this.visualization.name;
		this.form.type.value = this.visualization.type;
		this.form.description.value = this.visualization.description;

		const options = this.container.querySelector('.options');

		options.textContent = null;

		this.page.preview.position = 'right';

		await this.page.preview.load({
			query_id: this.report.query_id,
			visualization: {
				id: this.visualization.visualization_id
			},
		});

		this.dashboards.load();
		this.transformations.load();
		this.reportVisualizationFilters.load();

		options.appendChild(this.optionsForm.form);

		this.page.stages.get('pick-report').switcher.querySelector('small').textContent = this.report.name + ` #${this.report.query_id}`;

		const first = this.container.querySelector('.configuration-section');

		if(first && first.querySelector('.body.hidden'))
			first.querySelector('h3').click();
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
		this.visualization.options.filters = this.reportVisualizationFilters.json;

		options.form.set('options', JSON.stringify(this.visualization.options));

		await API.call('reports/visualizations/update', parameters, options);

		await DataSource.load(true);

		this.load();

		this.page.stages.get('pick-visualization').switcher.querySelector('small').textContent = this.form.name.value;
	}

	async preview() {
		this.page.preview.load({
			query_id: this.report.query_id,
			visualizationOptions: {...this.optionsForm.json, transformations: this.transformations.json},
			visualization: {
				id: this.visualization.visualization_id,
				type: this.form.type.value,
				name: this.form.name.value
			}
		});
	}
});

class ReportConnection {

	constructor(report, stage) {

		this.report = report;
		this.stage = stage;
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		const form = this.formElement = document.createElement('form');

		form.id = 'define-report-form';

		form.on('submit', e => this.stage.update(e));

		return form;
	}

	get json() {
		return {};
	}
}

ReportConnection.types = new Map();

ReportConnection.types.set('mysql', class ReportConnectionMysql extends ReportConnection {

	constructor(report, stage) {

		super(report, stage);

		this.editor = new CodeEditor({mode: 'sql'});

		this.editor.editor.getSession().on('change', () => this.stage.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.stage.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => this.stage.preview(),
			});
		});
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.appendChild(this.editor.container);

		if(this.report.definition)
			this.editor.value = this.report.definition.query;

		return super.form;
	}

	get json() {

		return {
			query: this.editor.value,
		};
	}
});

ReportConnection.types.set('mssql', class ReportConnectionMysql extends ReportConnection {

	constructor(report, stage) {

		super(report, stage);

		this.editor = new CodeEditor({mode: 'sql'});

		this.editor.editor.getSession().on('change', () => this.stage.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.stage.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => this.stage.preview(),
			});
		});
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.appendChild(this.editor.container);

		if(this.report.definition)
			this.editor.value = this.report.definition.query;

		return super.form;
	}

	get json() {

		return {
			query: this.editor.value,
		};
	}
});

ReportConnection.types.set('pgsql', class ReportConnectionMysql extends ReportConnection {

	constructor(report, stage) {

		super(report, stage);

		this.editor = new CodeEditor({mode: 'sql'});

		this.editor.editor.getSession().on('change', () => this.stage.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.stage.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => this.stage.preview(),
			});
		});
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.appendChild(this.editor.container);

		if(this.report.definition)
			this.editor.value = this.report.definition.query;

		return super.form;
	}

	get json() {

		return {
			query: this.editor.value,
		};
	}
});

ReportConnection.types.set('bigquery', class ReportConnectionMysql extends ReportConnection {

	constructor(report, stage) {

		super(report, stage);

		this.editor = new CodeEditor({mode: 'sql'});

		this.editor.editor.getSession().on('change', () => this.stage.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.stage.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => this.stage.preview(),
			});
		});
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.appendChild(this.editor.container);

		if(this.report.definition)
			this.editor.value = this.report.definition.query;

		return super.form;
	}

	get json() {

		return {
			query: this.editor.value,
		};
	}
});

ReportConnection.types.set('api', class ReportConnectionAPI extends ReportConnection {

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.classList.add('form');

		super.form.innerHTML = `

			<label>
				<span>URL</span>
				<input type="url" name="url">
			</label>

			<label>
				<span>Method</span>
				<select name="method">
					<option>GET</option>
					<option>POST</option>
				</select>
			</label>
		`;

		// Set the vlues from report definition
		for(const key in this.report.definition || {}) {
			if(key in super.form.elements)
				super.form.elements[key].value = this.report.definition[key];
		}

		return super.form;
	}

	get json() {

		return {
			url: this.form.url.value,
			method: this.form.method.value,
		};
	}
});

/**
 * Upload a CSV, TSV or JSON data file from the user into a report.
 */
ReportConnection.types.set('file', class ReportConnectionAPI extends ReportConnection {

	/**
	 * The upload-file container element.
	 * This also acts as a drop surface and a way to give user feedback on the upload status.
	 *
	 * @return HTMLElement
	 */
	get form() {

		if(this.formElement)
			return this.formElement;

		const form = super.form;

		form.classList.add('upload-file');

		form.innerHTML = `
			<input type="file" accept=".xlsx, .xls, .csv, .tsv, .json" class="hidden">
			<h2>Drop File Here</h2>
			<small>Or click to upload&hellip;</small>
			<div class="message hidden"></div>
		`;

		const input = form.querySelector('input');

		input.on('change', e => {
			if(e.target.files.length)
				this.upload(e.target.files[0]);
		});

		form.on('click', () => input.click());

		form.on('dragenter', e => e.preventDefault());

		form.on('dragover', e => {

			e.preventDefault();

			if(!e.dataTransfer.types || !e.dataTransfer.types.includes('Files'))
				return this.message('Please upload a valid file.', 'warning');

			if(e.dataTransfer.items.length > 1)
				return this.message('Please upload only one file.', 'warning');

			form.classList.add('drag-over');

			this.message('Drop to upload one file.', 'notice');
		});

		form.on('dragleave', () => {

			this.message();
			form.classList.remove('drag-over');
		});

		form.on('drop', e => {

			e.preventDefault();

			if(!e.dataTransfer.types || !e.dataTransfer.types.includes('Files'))
				return this.message('Please upload a valid file', 'warning');

			if(e.dataTransfer.items.length > 1)
				return this.message('Please upload only one file', 'warning');

			form.classList.remove('drag-over');

			const [file] = e.dataTransfer.files;

			this.upload(file);
		});

		return form;
	}

	/**
	 * Attach an event listener on the upload instance.
	 *
	 * @param string	event		The event type (eg. upload)
	 * @param Function	callback	The callback function to call when the event happens.
	 */
	on(event, callback) {

		if(event == 'upload')
			this.onUpload = callback;

		else throw new Page.exception(`Invalid event File Upload event type ${event}! :(`);
	}

	/**
	 * Upload a file's data to the report.
	 *
	 * @param File	The File object for the file that is being uploaded.
	 */
	upload(file) {

		if(!this.stage.report.load_saved)
			return this.message('This report doesn\'t have \'Store Result\' property enabled! :(', 'warning');

		this.message(`Uploading ${file.name}`, 'notice');

		const fileReader = new FileReader();

		let separator = ',';

		if(file.name.endsWith('.tsv'))
			separator = '\t';

		fileReader.onload = async e => {

			if(!e.target.result.trim())
				return this.message('Uploaded file is empty', 'warning');

			const
				parameter = {
					data: this.toJSON(e.target.result.trim(), separator),
					query_id: this.stage.report.query_id,
				},
				options = {
					method: 'POST',
				};

			try {
				await API.call('reports/engine/report', parameter, options);
			} catch(e) {
				this.message(e.message, 'warning');
			}

			if(this.onUpload)
				this.onUpload();

			this.message('Upload Complete', 'notice');
		};

		fileReader.readAsText(file);
	}

	/**
	 * Convert a file input to JSON.
	 * This will handle types of input like JSON, CSV or TSV.
	 *
	 * @param  string	input		The input string that needs to be converted.
	 * @param  string	separator	The column separator to use.
	 * @return string				The stringified JSON that was extracted from the input.
	 */
	toJSON(input, separator = ',') {

		try {
			return JSON.stringify(JSON.parse(input));
		} catch(e) {}

		const
			lines = input.split('\n'),
			result = [],
			headers = split(lines[0]);

		for(const line of lines.slice(1)) {

			const row = {};

			for(const [index, cell] of split(line).entries())
				row[headers[index]] = cell;

			result.push(row);
		}

		function split(string) {

			for (var splitString = string.split(separator), len = splitString.length - 1, tl; len >= 0; len--) {

				if (splitString[len].replace(/"\s+$/, '"').charAt(splitString[len].length - 1) === '"') {

					if ((tl = splitString[len].replace(/^\s+"/, '"')).length > 1 && tl.charAt(0) === '"') {

						splitString[len] = splitString[len].replace(/^\s*"|"\s*$/g, '').replace(/""/g, '"');
					}

					else if (len) {
						splitString.splice(len - 1, 2, [splitString[len - 1], splitString[len]].join(separator));
					}

					else splitString = splitString.shift().split(separator).concat(splitString);
				}

				else splitString[len].replace(/""/g, '"');
			}

			for(let [index, element] of splitString.entries()) {

				if(element.split(',').length === 1 && element.startsWith('"')) {

					splitString[index] = element.replace(/"/g, '');
				}
			}

			return splitString.map(v => v.trim());
		}

		return JSON.stringify(result);
	}

	/**
	 * Show a message to the user on the file upload window with give color.
	 *
	 * @param  string	body	The message body.
	 * @param  string	type	The type of the message (notice, warning or nothing)
	 */
	message(body = '', type = null) {

		const form = this.form.querySelector('.message');

		form.classList.remove('notice', 'warning');
		form.classList.toggle('hidden', !body);
		this.form.querySelector('h2').classList.toggle('hidden', body);
		this.form.querySelector('small').classList.toggle('hidden', body);

		if(type)
			form.classList.add(type);

		form.innerHTML = body;
	}
});

ReportConnection.types.set('mongo', class ReportConnectionMysql extends ReportConnection {

	constructor(report, stage) {

		super(report, stage);

		this.editor = new CodeEditor({mode: 'javascript'});

		this.editor.editor.getSession().on('change', () => this.stage.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: async () => {

					const cursor = this.editor.editor.getCursorPosition();

					await this.stage.update();

					this.editor.editor.gotoLine(cursor.row + 1, cursor.column);
				},
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			this.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => this.stage.preview(),
			});
		});
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		super.form.classList.add('form');

		super.form.innerHTML = `

			<label>
				<span>Collection Name</span>
				<input type="text" name="collection_name">
			</label>

			<label class="mongo-query">
				<span>Query</span>
			</label>
		`;

		// Set the vlues from report definition
		for(const key in this.report.definition || {}) {
			if(key in super.form.elements)
				super.form.elements[key].value = this.report.definition[key];
		}

		super.form.querySelector('label.mongo-query').appendChild(this.editor.container)

		if(this.report.definition)
			this.editor.value = this.report.definition.query;

		return super.form;
	}

	get json() {

		return {
			collection_name: this.form.collection_name.value,
			query: this.editor.value,
		};
	}
});

class Axes extends Set {

	constructor(axes, stage) {
		super();

		this.stage = stage;
		this.list = axes;
		this.clear();

		for(const axis of this.list)
			this.add(new Axis(axis, this));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('options', 'form', 'body', 'axes');

		this.render();

		return container;
	}

	render() {

		this.container.textContent = null;

		this.stage.formContainer.querySelector('.configuration-section .count').innerHTML = `${this.size ? this.size + ' axes added' : ''}`;

		for(const axis of this)
			this.container.appendChild(axis.container);

		if(!this.size)
			this.container.innerHTML = '<div class="NA">No axes added yet! :(</div>';

		this.container.insertAdjacentHTML('beforeend', `

			<div class="add-axis">
				<fieldset>
					<legend>Add Axis</legend>
					<div class="form">

						<label>
							<span>Position</span>
							<select name="position" value="${this.position}" required>
								<option value="bottom">Bottom</option>
								<option value="left">Left</option>
								<option value="top">Top</option>
								<option value="right">Right</option>
							</select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="button"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</div>
		`);

		this.container.querySelector('.add-axis button[type=button]').on('click', e => this.insert(e));
	}

	get json() {

		const response = [];

		for(const axis of this.values())
			response.push(axis.json);

		return response;
	}

	restCheck(action) {

		for(const rest of this.container.querySelectorAll('.restCheck'))
			rest.classList.toggle('hidden', action);
	}

	insert(e) {

		e.preventDefault();

		const position = this.container.querySelector('.add-axis select').value;

		this.add(new Axis({position}, this));
		this.render();
	}
}

class Axis {

	constructor(axis, axes) {

		for(const key in axis)
			this[key] = axis[key]

		this.axes = axes;

		if(!this.columns)
			this.columns = [];
	}

	get container() {

		if(this.axisContainer)
			return this.axisContainer;

		const container = this.axisContainer = document.createElement('div');
		let datalist = [];

		container.classList.add('axis');

		for(const [key, column] of this.axes.stage.page.preview.report.columns)
			datalist.push({name: column.name, value: key});

		let usedColumns = [];

		for(const axis of this.axes) {

			if(axis.position == this.position)
				continue;

			usedColumns = usedColumns.concat(axis.columns.map(x => x.key));
		}

		for(const column of usedColumns)
			datalist = datalist.filter(x => !column.includes(x.value));

		this.position = this.position || 'top';

		container.multiSelectColumns = new MultiSelect({datalist: datalist, expand: true});

		const axisColumn = container.multiSelectColumns.container;

		container.multiSelectColumns.value = this.columns ? this.columns.map(x => x.key) : [];

		container.innerHTML = `

			<fieldset>
				<legend>${this.position[0].toUpperCase() + this.position.slice(1)} Axis</legend>

				<div class="form">

					<label>
						<span>Label</span>
						<input type="text" name="label" value="${this.label || ''}">
					</label>

					<label class="axis-column">
						<span>Columns</span>
					</label>

					<label class="restCheck"><span><input type="checkbox" name="restcolumns" class="restcolumns" ${this.restcolumns ? 'checked' : ''}> Rest</span></label>

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
				</div>
			</fieldset>
		`;

		container.multiSelectColumns.on('change', () => {

			let usedColumns = [];
			const freeColumns = [];

			for(const axis of this.axes)
				usedColumns = usedColumns.concat(axis.container.multiSelectColumns.value);

			for(const axis of this.axes) {
				for(const item of axis.container.multiSelectColumns.datalist) {
					if(!freeColumns.some(c => c.value.includes(item.value)) && !usedColumns.includes(item.value))
						freeColumns.push(item);
				}
			}

			for(const axis of this.axes) {

				if(axis == this)
					continue;

				const selected = axis.container.multiSelectColumns.value;

				var newDataList = [];

				for(const data of axis.container.multiSelectColumns.datalist) {
				    if(!usedColumns.includes(data.value) || selected.includes(data.value)) {
				        newDataList.push(data);
				    }
				}

				for(const value of freeColumns) {
					if(!newDataList.some(k => k.value.includes(value.value)))
						newDataList.push(value);
				}

				if(axis.container.multiSelectColumns.datalist.map(x => x.value).sort().join() == newDataList.map(x => x.value).sort().join())
					continue;

				axis.container.multiSelectColumns.datalist = newDataList;
				axis.container.multiSelectColumns.render();
			}

		});

		const restColumns = container.querySelector('.restcolumns');

		restColumns.on('change', () => {

			this.axes.restCheck(restColumns.checked);
			axisColumn.classList.toggle('hidden');

			if(restColumns.checked)
				container.querySelector('.restCheck').classList.remove('hidden');
		});

		if(this.restcolumns) {

			this.axes.restCheck(true);
			axisColumn.classList.add('hidden');
		}

		container.querySelector('.axis-column').appendChild(axisColumn);

		container.querySelector('select[name=format]').value = this.format || '';

		container.querySelector('.delete').on('click', () => {
			this.axes.delete(this);
			this.axes.render();
		});

		return container;
	}

	get json() {

		return {
			position: this.position,
			label: this.container.querySelector('input[name=label]').value,
			columns: this.container.multiSelectColumns.value.map(c => {return {key: c}}),
			restcolumns: this.container.querySelector('input[name=restcolumns]').checked,
			format: this.container.querySelector('select[name=format]').value,
		};
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

		const result = {};

		for(const element of this.form.querySelectorAll('input, select'))
			result[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];

		return result;
	}
}

class ReportVisualizationLinearOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.classList.add('liner-visualization-options');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Axes <span class="count"></span></h3>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
						<label>
							<span>
								<input type="checkbox" name="showValues">Show Values
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		this.formContainer.axes = new Set();

		this.axes = new Axes(this.visualization.options.axes, this);

		container.querySelector('.configuration-section').appendChild(this.axes.container);

		this.stage.setupConfigurationSetions(container);

		if(this.visualization.options && this.visualization.options.hideLegend)
			container.querySelector('input[name=hideLegend]').checked = this.visualization.options.hideLegend;

		if(this.visualization.options && this.visualization.options.showValues)
			container.querySelector('input[name=showValues]').checked = this.visualization.options.showValues;

		return container;
	}

	get json() {

		const response = {
			axes: this.axes.json,
			hideLegend: this.formContainer.querySelector('input[name=hideLegend]').checked,
			showValues: this.formContainer.querySelector('input[name=showValues]').checked,
		};

		return response;
	}
}

class SpatialMapLayers extends Set {

	constructor(maps, stage) {

		super();

		this.stage = stage;

		for(const map of maps)
			this.add(new (SpatialMapLayer.types.get(map.map_type))(map, this));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('options', 'form', 'body', 'maps');

		this.render();

		return container;

	}

	render() {

		this.container.textContent = null;

		this.stage.formContainer.querySelector('.configuration-section .count').innerHTML = `${this.size ? this.size + ' map layer' + ( this.size == 1 ? ' added' :'s added') : ''}`;

		if (!this.size)
			this.container.innerHTML = '<div class="NA">No maps added yet! :(</div>';

		for(const map of this) {

			this.container.appendChild(map.container);
		}

		this.container.insertAdjacentHTML('beforeend', `

			<div class="add-map">
				<fieldset>
					<legend>Add Map</legend>
					<div class="form">

						<label>
							<span>Map Type</span>
							<select name="position" value="clusters" required>
								<option value="clusters">Clusters</option>
								<option value="heatmap">Heat Map</option>
								<!--<option value="scattermap">Scatter Map</option>-->
								<!--<option value="bubblemap">Bubble Map</option>-->
							</select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="button"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</div>
		`);

		this.container.querySelector('.add-map button[type=button]').on('click', () => {

			const map_type = this.container.querySelector('.add-map select').value;

			this.add(new (SpatialMapLayer.types.get(map_type))({map_type}, this));
			this.render();
		});

	}

	get json() {

		const response = [];

		for(const map of this.values()) {
			response.push(map.json);
		}

		return response;

	}

}

class SpatialMapLayer {

	constructor(map, maps) {

		Object.assign(this, map);

		this.maps = maps;
	}

	get container() {

		if(this.mapContainer)
			return this.mapContainer;

		const container = this.mapContainer = document.createElement('div');

		container.classList.add('map');

		container.innerHTML = `
			<fieldset>
				<legend>${this.map_type.slice(0, 1).toUpperCase() + this.map_type.slice(1)}</legend>
				<div class="form">
					<label>
						<span>Name</span>
						<input type="text" name="name">
					</label>
					
					<label>
						<span>Latitude Column</span>
						<select name="latitude"></select>
					</label>
					
					<label>
						<span>Longitude Column</span>
						<select name="longitude"></select>
					</label>
					
					<label>
						<button class="delete" type="button">
							<i class="far fa-trash-alt"></i> Delete
						</button>
					</label>
				</div>
			</fieldset>
		`;

		const
			latitude = container.querySelector('select[name=latitude]'),
			longitude = container.querySelector('select[name=longitude]');

		for(const [key, column] of this.maps.stage.page.preview.report.columns) {

			latitude.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			longitude.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		container.querySelector('.delete').on('click', () => {

			container.parentElement && container.parentElement.removeChild(container);
			this.maps.delete(this);
			this.maps.render();
		});

		return container;
	}

	get json() {

		const response = {
			map_type: this.map_type
		};

		for(const element of this.container.querySelectorAll('select, input')) {

			response[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];
		}

		return response;
	}
}

SpatialMapLayer.types = new Map();

SpatialMapLayer.types.set('clusters', class ClusterMapLayer extends SpatialMapLayer {
});

SpatialMapLayer.types.set('heatmap', class HeatMapLayer extends SpatialMapLayer {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = super.container;

		container.querySelector('.delete').parentNode.insertAdjacentHTML('beforebegin', `
			<label>
				<span>Weight Column</span>
				<select name="weight">
					<option value=""></option>
				</select>
			</label>
			
			<label class="opacity">
				<span>Opacity <span class="value">${this.opacity || 0.6}</span></span>
				<input type="range" name="opacity" min="0" max="1" step="0.01">
			</label>
		`);

		container.querySelector('.opacity input').on('input', () => {

			container.querySelector('.opacity .value').textContent = container.querySelector('.opacity input').value;
		});

		const weight = container.querySelector('select[name=weight]');

		for(const [key, column] of this.maps.stage.page.preview.report.columns) {

			weight.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		for(const element of container.querySelectorAll('select, input')) {

			if(this[element.name])
				element[element.type == 'checkbox' ? 'checked' : 'value'] = this[element.name];
		}

		return container;
	}

	get json() {

		const response = {
			map_type: this.map_type
		};

		for(const element of this.container.querySelectorAll('select, input')) {

			response[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];
		}

		return response;
	}
});

SpatialMapLayer.types.set('scattermap', class ScatterMapLayer extends SpatialMapLayer {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = super.container;

		container.querySelector('.delete').parentNode.insertAdjacentHTML('beforebegin', `
			<label>
				<span>Color Column</span>
				<select name="color">
					<option value=""></option>
				</select>
			</label>
		`);

		const color = container.querySelector('select[name=color]');

		for(const [key, column] of this.maps.stage.page.preview.report.columns) {

			color.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		for(const element of container.querySelectorAll('select, input')) {

			if(this[element.name])
				element[element.type == 'checkbox' ? 'checked' : 'value'] = this[element.name];
		}

		return container;
	}

	get json() {

		const response = {
			map_type: this.map_type
		};

		for(const element of this.container.querySelectorAll('select, input')) {

			response[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];
		}

		return response;
	}
});

SpatialMapLayer.types.set('bubblemap', class BubbleMapLayer extends SpatialMapLayer {

	get container() {

	}
});

const ConfigureVisualization = ReportsManger.stages.get('configure-visualization');

ConfigureVisualization.types = new Map;

ConfigureVisualization.types.set('table', class TableOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>
								<input type="checkbox" name="hideHeadingsBar">Hide Headings Bar
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideRowSummary">Hide Row Summary
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = this.visualization.options && this.visualization.options[element.name];

		this.stage.setupConfigurationSetions(container);

		return container;
	}
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

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>Show</span>
							<select name="showValue">
								<option value="value">Value</option>
								<option value="percentage">Percentage</option>
							</select>
						</label>

						<label>
							<span>
								<input type="checkbox" name="classicPie">Classic Pie
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = this.visualization.options && this.visualization.options[element.name];

		this.stage.setupConfigurationSetions(container);

		return container;
	}
});

ConfigureVisualization.types.set('funnel', class FunnelOptions extends ReportVisualizationOptions {
});

ConfigureVisualization.types.set('spatialmap', class SpatialMapOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');
		let theme;

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Map Layers <span class="count"></span></h3>
			</div>
			
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform map-options">						
						<label>
							<span>Zoom</span>
							<input type="number" step="1" name="zoom" min="1" max="25">
						</label>
						
						<label>
							<span>Center Latitude</span>
							<input type="text" name="centerLatitude">
						</label>
						
						<label>
							<span>Center Longitude</span>
							<input type="text" name="centerLongitude">
						</label>
						
						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
			
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Themes</h3>
				<div class="body">
					<div class="form subform map-themes"></div>
				</div>
			</div>
		`;

		this.maps = new SpatialMapLayers(this.visualization.options.maps || [], this);

		container.querySelector('.configuration-section').appendChild(this.maps.container);

		this.stage.setupConfigurationSetions(container);

		const mapOptions = container.querySelector('.map-options');

		if(this.visualization.options) {

			for(const element of mapOptions.querySelectorAll('select, input')) {

				if(!this.visualization.options[element.name])
					continue;

				element[element.type == 'checkbox' ? 'checked' : 'value'] = this.visualization.options[element.name];
			}

			theme = this.visualization.options.theme;
		}

		this.theme = new SpatialMapThemes(this);

		container.querySelector('.map-themes').appendChild(this.theme.container);

		return container;

	}

	get json() {

		const
			mapOptions = this.formContainer.querySelector('.map-options'),
			response = {
				maps: this.maps.json,
				theme: this.theme.value
			};

		for (const element of mapOptions.querySelectorAll('select, input'))
			response[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];

		return response;
	}
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
				<div class="body">
					<div class="form subform">
						<label>
							<span>Column</span>
							<select name="column"></select>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		const columnSelect = container.querySelector('select[name=column]');

		for(const [key, column] of this.page.preview.report.columns) {

			columnSelect.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';

		this.stage.setupConfigurationSetions(container);

		return container;
	}
});

ConfigureVisualization.types.set('livenumber', class LiveNumberOptions extends ReportVisualizationOptions {

	get form() {

		if (this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>Timing Column</span>
							<select name="timingColumn"></select>
						</label>

						<label>
							<span>Value Column</span>
							<select name="valueColumn"></select>
						</label>

						<label>
							<span>Center Offset</span>
							<input type="number" name="centerOffset">
						</label>

						<label>
							<span>Left Offset</span>
							<input type="number" name="leftOffset">
						</label>

						<label>
							<span>Right Offset</span>
							<input type="number" name="rightOffset">
						</label>

						<label class="sub-reports">
							<span>Sub-reports</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="invertValues">Invert Values
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="showGraph">Show Graph
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideYAxis">Hide Graph's Y Axis Graph
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		const datalist = [];

		for(const [index, report] of DataSource.list.entries()) {

			for(const visualisation of report.visualizations) {

				if(visualisation.type == 'livenumber' && visualisation.visualization_id != this.visualization.visualization_id) {

					datalist.push({
						'name': visualisation.name,
						'value': visualisation.visualization_id
					});
				}
			}
		}

		this.subReports = new MultiSelect({datalist: datalist, expand:true});

		container.querySelector('.form .sub-reports').appendChild(this.subReports.container);

		const
			timingColumn = container.querySelector('select[name=timingColumn]'),
			valueColumn = container.querySelector('select[name=valueColumn]');

		for(const [key, column] of this.page.preview.report.columns) {

			timingColumn.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			valueColumn.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		for(const element of this.formContainer.querySelectorAll('select, input')) {

			element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';
		}

		this.subReports.value = (this.visualization.options && this.visualization.options.subReports) || [];

		this.stage.setupConfigurationSetions(container);

		return container;
	}

	get json() {

		const result = super.json;

		if(this.subReports) {
			result.subReports = this.subReports.value;
		}

		return result;
	}
});

ConfigureVisualization.types.set('html', class HTMLOptions extends ReportVisualizationOptions {

	get form() {

		if (this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>
								<input type="checkbox" name="hideHeader">Hide Header
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';

		this.stage.setupConfigurationSetions(container);

		return container;
	}
});

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

		this.types = new Map([
			['pivot', {name: 'Pivot Table'}],
			['filter', {name: 'Filter'}],
			['stream', {name: 'Stream'}],
		]);
	}

	load() {

		this.process();

		this.render();
	}

	process() {

		this.clear();

		if(!this.visualization.options)
			return;

		for(const transformation_ of this.visualization.options.transformations || [])
			this.add(new ReportTransformation(transformation_, this.stage));
	}

	render() {

		this.container.textContent = null;

		for(const transformation of this)
			this.container.appendChild(transformation.container);

		if(!this.size)
			this.container.innerHTML = '<div class="NA">No transformation added yet! :(</div>';

		this.container.insertAdjacentHTML('beforeend', `

			<form class="add-transformation">
				<fieldset>
					<legend>Add Transformation</legend>
					<div class="form">

						<label>
							<span>Type</span>
							<select name="type"></select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</form>
		`);

		const select = this.container.querySelector('.add-transformation select');

		for(const [key, type] of this.types)
			select.insertAdjacentHTML('beforeend', `<option value="${key}">${type.name}</option>`);

		this.container.querySelector('.add-transformation').on('submit', e => this.insert(e));

		this.container.parentElement.querySelector('h3 .count').innerHTML = `
			${this.size ? this.size + ' transformation' + (this.size == 1 ? ' applied' : 's applied') : ''}
		`;
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
				options: {
					hideLegend: this.visualization.options.hideLegend
				},
			};

			report.visualizations.push(visualization);
			report.transformationVisualization = visualization;
		}

		report.transformationVisualization.options.transformations = this.json;

		this.page.preview.load({
			query_id: this.stage.report.query_id,
			visualization: {
				id: report.transformationVisualization.visualization_id
			},
		});
	}

	clear() {

		super.clear();
		this.container.innerHTML = '<div class="NA">Loading&hellip;</div>';
	}

	insert(e) {

		e.preventDefault();

		const type = this.container.querySelector('.add-transformation select').value;

		this.add(new ReportTransformation({type}, this.stage));

		this.render();
		this.preview();
	}
}

class ReportTransformation {

	constructor(transformation, stage) {

		this.stage = stage;
		this.page = this.stage.page;

		for(const key in transformation)
			this[key] = transformation[key];

		if(!this.stage.transformations.types.has(this.type))
			throw new Page.exception(`Invalid transformation type ${this.type}! :(`);
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('fieldset'),
			rows = document.createElement('div'),
			columns = document.createElement('div'),
			values = document.createElement('div');

		container.classList.add('subform', 'form');

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

		container.innerHTML	= `
			<legend>${this.stage.transformations.types.get(this.type).name}</legend>
			<div class="transformation"></div>
		`;

		const div = container.querySelector('div');

		div.appendChild(rows);
		div.appendChild(columns);
		div.appendChild(values);

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

class ReportVisualizationDashboards extends Set {

	constructor(stage) {

		super();

		this.stage = stage;

		this.container = this.stage.container.querySelector('#dashboards');
		this.addForm = this.container.querySelector('.add-dashboard');
	}

	async load(options) {

		await this.fetch(options);

		this.process();

		this.render();
	}

	async fetch({force = false} = {}) {

		if(ReportVisualizationDashboards.response && !force)
			return this.response = ReportVisualizationDashboards.response;

		ReportVisualizationDashboards.response = this.response = await API.call('dashboards/list');
	}

	process() {

		this.response = new Map(this.response.map(d => [d.id, d]));

		this.clear();

		for(const dashboard of this.response.values()) {

			if(!dashboard.format)
				dashboard.format = {};

			for(const report of dashboard.format.reports || []) {

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
			this.container.innerHTML = '<div class="NA">No dashboard added yet! :(</div>';

		this.container.parentElement.querySelector('h3 .count').innerHTML = `${this.size ? 'Added to ' + this.size + ' dashboard' + (this.size == 1 ? '' : 's') : ''}` ;

		this.container.insertAdjacentHTML('beforeend', `

			<form class="add-dashboard">
				<fieldset>
					<legend>Add Dashboard</legend>
					<div class="form">
						<label>
							<span>Dashboard</span>
							<select name="dashboard_id"></select>
						</label>

						<label>
							<span>Position</span>
							<input name="position" type="number">
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</form>
		`);

		const form = this.container.querySelector('.add-dashboard');

		for(const dashboard of this.response.values()) {

			form.dashboard_id.insertAdjacentHTML('beforeend',`
				<option value=${dashboard.id}>
					${dashboard.name} ${this.response.has(dashboard.parent) ? `(parent: ${this.response.get(dashboard.parent).name})` : ''}
				</option>
			`);
		}

		form.on('submit', e => ReportVisualizationDashboards.insert(e, this.stage));
	}

	clear() {

		super.clear();
		this.container.innerHTML = '<div class="NA">Loading&hellip;</div>';
	}

	static async insert(e, stage) {

		e.preventDefault();

		const form = stage.dashboards.container.querySelector('.add-dashboard');

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
		await stage.dashboards.load({force: true});
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
				<select name="dashboard_id"></select>
			</label>

			<label>
				<span>Position</span>
				<input type="number" name="position" value="${this.visualization.format.position || ''}">
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="submit"><i class="fa fa-save"></i> Save</button>
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="button" class="delete"><i class="far fa-trash-alt"></i></button>
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="button" class="view-dashboard"><i class="fas fa-external-link-alt"></i></button>
			</label>
		`;

		if(this.stage.dashboards.response) {
			for(const dashboard of this.stage.dashboards.response.values()) {

				form.dashboard_id.insertAdjacentHTML('beforeend',`
					<option value=${dashboard.id}>
						${dashboard.name} ${this.stage.dashboards.response.has(dashboard.parent) ? `(parent: ${this.stage.dashboards.response.get(dashboard.parent).name})` : ''}
					</option>
				`);
			}
		}

		form.dashboard_id.value = this.visualization.dashboard_id;
		form.querySelector('.view-dashboard').on('click', () => window.open('/dashboard/' + (form.dashboard_id.value)));

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
		await this.stage.dashboards.load({force: true});
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
		await this.stage.dashboards.load({force: true});
	}
}

class ReportVisualizationFilters extends Map {

	constructor(stage) {

		super();

		this.visualization = stage.visualization;
		this.container = stage.container.querySelector('.configuration-section #filters');
		this.stage = stage;

		if (this.stage.visualization.options && this.stage.visualization.options.filters) {

			for(const filter of this.stage.visualization.options.filters) {

				const [filterObj] = this.stage.report.filters.filter(x => x.filter_id == filter.filter_id);

				if(!filterObj)
					continue;

				this.set(filter.filter_id, new ReportVisualizationFilter(filter, filterObj, stage));
			}
		}
	}

	load() {

		this.container.textContent = null;

		if(!this.stage.report.filters.length)
			return this.container.innerHTML = '<div class="NA">No filters found!</div>';

		for(const filter of this.values())
			this.container.appendChild(filter.container);

		if(!this.size)
			this.container.innerHTML = '<div class="NA">No filters added yet! :(</div>';

		this.container.insertAdjacentHTML('beforeend', `

			<form class="add-filter">
				<fieldset>
					<legend>Add Filter</legend>

					<div class="form">

						<label>
							<span>Name</span>
							<select></select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</form>
		`);

		const optionsList = this.container.querySelector('.add-filter select');

		optionsList.textContent = null;

		for(const filter of this.stage.report.filters) {

			if(!this.has(filter.filter_id))
				optionsList.insertAdjacentHTML('beforeend', `<option value="${filter.filter_id}">${filter.name}</option>`);
		}

		this.container.querySelector('.add-filter').classList.toggle('hidden', this.size == this.stage.report.filters.length);

		this.container.parentElement.querySelector('h3 .count').innerHTML = `
			${this.size ? this.size + ' filter' + (this.size == 1 ? ' added' : 's added') : ''}
		`;

		this.container.querySelector('.add-filter').on('submit', (e) => {

			e.preventDefault();

			const
				filterOptions = this.container.querySelector('.add-filter select'),
				[filter] = this.stage.report.filters.filter(x => x.filter_id == parseInt(filterOptions.value));

			this.set(filter.filter_id, new ReportVisualizationFilter(
				{filter_id: filter.filter_id, default_value: ''},
				filter,
				this.stage,
			));

			this.load();
		});
	}

	get json() {

		const response = [];

		for(const filter of this.values()) {

			response.push(filter.json);
		}

		return response;
	}

	clear() {

		super.clear();
		this.container.innerHTML = `<div class="NA">Loading&hellip;</div>`;
	}
}

class ReportVisualizationFilter {

	constructor(reportVisualizationFilter, reportFilter, stage) {

		this.stage = stage;
		this.reportFilter = reportFilter;

		Object.assign(this, reportVisualizationFilter);
	}

	get container() {

		if (this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('fieldset');

		container.innerHTML = `
			<legend>${this.reportFilter.name}</legend>

			<div class="form">
				<label>
					<span>Default Value</span>
					<input type="text" placeholder="${this.reportFilter.default_value}" value="${this.default_value || ''}">
				</label>

				<label>

					<span>&nbsp;</span>
					<button class="delete" title="Delete"><i class="far fa-trash-alt"></i></button>
				</label>
			</div>
		`;

		container.querySelector('.delete').on('click', () => {

			this.container.parentElement.removeChild(container);
			this.stage.reportVisualizationFilters.delete(this.filter_id);

			this.stage.reportVisualizationFilters.load();
		});

		return container;
	}

	get json() {

		return {
			default_value: this.container.querySelector('input').value,
			filter_id: this.filter_id
		};
	}
}

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

/**
 * Let the user edit a report's saved data.
 *
 * Editing includes:
 *  - Edit row's data.
 *  - Add new rows.
 *  - Delete rows.
 *  - Sorting data by columns.
 */
class EditReportData {

	/**
	 * Return the editor's container.
	 *
	 * @return HTMLElement
	 */
	get container() {

		if(this.tableContainer)
			return this.tableContainer;

		const container = this.tableContainer = document.createElement('section');

		container.classList.add('edit-report-data');

		container.innerHTML = `
			<header class="toolbar">
				<button type="submit"><i class="fas fa-paper-plane"></i> Update Data</button>
			</header>
			<table></table>
		`;

		this.container.querySelector('.toolbar button').on('click', e => {
			e.preventDefault();
			this.save();
		});

		return container;
	}

	/**
	 * Load a given query's data into the editor.
	 *
	 * @param int	query_id	The report id whose data is to be loaded.
	 */
	async load(query_id) {

		this.container.querySelector('table').innerHTML = `<tr class="NA"><td>Loading&hellip;<td></tr>`;

		await DataSource.load();

		if(!DataSource.list.has(query_id))
			throw API.exception('Invalid report ID');

		this.datasource = new DataSource(DataSource.list.get(query_id));

		await this.datasource.fetch();
		this.data = this.datasource.response;

		this.rows = [];

		for(const item of this.data)
			this.rows.push([...item.values()]);

		this.render();
	}

	/**
	 * Sorts the data by the given column.
	 * This will update this.rows in-place and rende the UI.
	 *
	 * @param int			index	The position of the column
	 * @param HTMLElement	element	The th element that is to be sorted.
	 */
	sort(index, element) {

		if (this.rows.length === 1) {

			return this.rows;
		}

		const order = element.dataset.sorted;

		const asc = order === 'asc', desc = order === 'desc';

		element.dataset.sorted = asc ? 'desc' : 'asc';

		const sortFlag = asc ? -1 : 1;

		if (asc && desc) {

			return this.rows;
		}

		this.rows = this.rows.sort((x, y) => {

			let A = x[index], B = y[index];

			if(parseInt(A))
				A = parseInt(A);

			if(parseInt(B))
				B = parseInt(B);

			if (A < B) {

				return -1 * sortFlag;
			}

			if (A > B) {

				return sortFlag;
			}

			return 0;
		});

		this.render();
	}

	/**
	 * Clears the container and renders the current data into it.
	 */
	render() {

		this.columns = [...this.data[0].keys()];

		const
			table = this.container.querySelector('table'),
			thead = document.createElement('thead'),
			tbody = document.createElement('tbody'),
			tfoot = document.createElement('tfoot'),
			headings = document.createElement('tr');

		table.textContent = null;

		if(!this.data || !this.data.length)
			return table.innerHTML = '<tr class="NA"><td>No data found :(</td></tr>';

		tbody.setAttribute('contenteditable', '');

		thead.appendChild(headings);

		for(const [index, column] of this.columns.entries()) {

			const th = document.createElement('th');

			th.textContent = column;
			th.dataset.sorted = 'desc';

			th.on('click', () =>this.sort(index, th));

			headings.appendChild(th);
		}

		headings.insertAdjacentHTML('beforeend', `
			<th class="action">Add</th>
			<th class="action">Delete</th>
		`);

		for(const row of this.rows)
			this.addNewRow(row, tbody);

		tfoot.innerHTML = `
			<tr><td colspan="${this.columns.length + 2}">+ Add New Row</td></tr>
		`;

		tfoot.on('click', () => {
			this.addNewRow(new Array(this.columns.length).fill(''), this.container.querySelector('tbody'));
		});

		table.appendChild(thead);
		table.appendChild(tbody);
		table.appendChild(tfoot);
	}

	/**
	 * Adds a new row into the container.
	 * The row can be added next to a current row or at the end.
	 * We need the tbody reference here because the tbody may not necesserily exit in the container yet.
	 *
	 * @param Array			row		The array of row's data that is to be added.
	 * @param HTMLElement	tbody	The tbody reference.
	 * @param HTMLElement	before	The row before which the new row is to be added.
	 */
	addNewRow(row, tbody, before = null) {

		const tr = document.createElement('tr');

		for(const cell of row) {

			const td = document.createElement('td');
			td.textContent = cell;
			tr.appendChild(td);
		}

		tr.insertAdjacentHTML('beforeend', `
			<td class="action green" contenteditable="false" title="Add One Above">+</td>
			<td class="action red" contenteditable="false" title="Delete Row">&times;</td>
		`);

		tr.querySelector('td.green').on('click', () => {
			this.addNewRow(new Array(this.columns.length).fill(''), tbody, tr);
		});

		tr.querySelector('td.red').on('click', () => {

			if(confirm('Are you sure?!'))
				tr.remove();
		});

		if(before)
			tbody.insertBefore(tr, before);

		else tbody.appendChild(tr);
	}

	/**
	 * Saves the current container's contents to the server.
	 */
	async save() {

		const table = this.container.querySelector('table');
		const result = [];

		for (const row of table.querySelectorAll('tbody tr')) {

			const temp = {};

			for (const [index, data] of row.querySelectorAll('td:not(.action)').entries()) {

				temp[this.columns[index]] = data.textContent;
			}

			result.push(temp);
		}

		const
			parameter = {
				data: JSON.stringify(result),
				query_id: this.datasource.query_id,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/engine/report', parameter, options);
	}
}