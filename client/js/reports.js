class Reports extends Page {

	constructor() {

		super();

		(async () => {

			await Reports.setup(this.container.querySelector('section#list'));
			Report.setup(this.container.querySelector('section#form'));

			ReportFilters.setup(this.container.querySelector('#filters-list'));
			ReportVisualizations.setup(this);

			await Reports.load();

			ReportFilter.setup();
			ReportVisualization.setup();

			Reports.loadState();
		})();

		window.on('popstate', e => Reports.loadState(e.state));
	}

	static async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return Report.add();

		if(Reports.list.has(parseInt(what)))
			return Reports.list.get(parseInt(what)).edit();

		await Sections.show('list');
	}

	static back() {

		if(history.state)
			return history.back();

		Sections.show('list');
		history.pushState(null, '', `/reports`);
	}

	static async setup(container) {

		Reports.container = container;

		Reports.container.querySelector('#add-report').on('click', () => {
			Report.add();
			history.pushState({id: 'add'}, '', `/reports/add`);
		});

		Reports.filters = Reports.container.querySelector('form.filters');

		Reports.filters.elements.search.on('keyup', Reports.render);
		Reports.filters.elements.column_search.on('change', Reports.render);

		if (Reports.search)
			Reports.filters.elements.search.value = Reports.search;

		if (Reports.column_search)
			Reports.filters.elements.column_search.value = Reports.column_search;
	}

	static async load(force) {

		await Reports.fetch(force);

		Reports.process();

		Reports.render();
	}

	static async fetch(force) {

		if(Reports.response && !force)
			return;

		[Reports.response, Reports.datasets, Reports.credentials] = await Promise.all([
			API.call('reports/report/list'),
			API.call('datasets/list'),
			API.call('credentials/list'),
		]);
	}

	static process() {

		Reports.list = new Map;

		for(const report of Reports.response || [])
			Reports.list.set(report.query_id, new Report(report));
	}

	static render() {

		const container = Reports.container.querySelector('table tbody');

		container.textContent = null;

		for(const report of Reports.list.values()) {

			let found = false,
				columns = Object.keys(report);

			if(Reports.filters.elements.column_search.value)
				columns = columns.filter(key => key == Reports.filters.elements.column_search.value);

			for(const key of columns) {
				if(report[key] && report[key].toString().toLowerCase().includes(Reports.filters.search.value.toLowerCase()))
					found = true;
			}

			if(!found)
				continue;

			container.appendChild(report.row);
		}

		if(!container.textContent)
			container.innerHTML	 = '<tr class="NA"><td colspan="5">No reports found! :(</td></tr>';

		Report.form.connection_name.textContent = null;

		for(const credential of Reports.credentials) {
			Report.form.connection_name.insertAdjacentHTML('beforeend',
				`<option value="${credential.id}">${credential.connection_name} (${credential.type})</option>`
			)
		}
	}
}

Page.class = Reports;

class Report {

	static setup(container) {

		Report.container = container;
		Report.form = Report.container.querySelector('form');
		Report.testContainer = Report.container.querySelector('#test-body');

		Report.container.querySelector('.toolbar #back').on('click', () => {
			Reports.back();
		});

		Report.container.querySelector('.toolbar #test').on('click', async () => {

			if(!Report.selected)
				return;

			await Report.selected.update();
			await Report.selected.test();
		});

		Report.container.querySelector('.toolbar #force-test').on('click', () => Report.selected && Report.selected.test(true));

		for(const tab of Report.container.querySelectorAll('.tab')) {
			tab.on('click', () => {
				for(const _tab of Report.container.querySelectorAll('.tab')) {
					Report.testContainer.querySelector(`#${_tab.id}-content`).classList.toggle('hidden', _tab != tab);
					_tab.classList.toggle('active', _tab == tab);
				}
			});
		}

		Report.schemas = new Map;

		Report.container.querySelector('#test-container .close').on('click', function() {
			this.parentElement.parentElement.classList.toggle('hidden');
		});

		Report.form.elements.connection_name.on('change', () => Report.renderSource());

		for(const category of MetaData.categories.values()) {
			Report.form.category_id.insertAdjacentHTML('beforeend', `
				<option value="${category.category_id}">${category.name}</option>
			`);
		}

		// Initiate the editor. All this only needs to be done once on page load.
		Report.editor = new Editor(Report.form.querySelector('#editor'));

		Report.editor.editor.getSession().on('change', () => Report.selected && Report.selected.filterSuggestions());

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			Report.editor.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: () => Report.selected && Report.selected.update()
			});

			// The keyboard shortcut to test the query on Ctrl + E inside the editor.
			Report.editor.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: async () => {

					if(!Report.selected)
						return;

					await Report.selected.update();
					await Report.selected.test();
				}
			});
		});
	}

	static add() {

		Report.selected = null;

		const view = Report.container.querySelector('.toolbar #view');

		Report.container.querySelector('h1').textContent = 'Adding New Report';

		if(Report.form.listener)
			Report.form.removeEventListener('submit', Report.form.listener);

		Report.form.on('submit', Report.form.listener = e => Report.insert(e));

		if(Report.container.viewListener)
			view.removeEventListener('click', Report.container.viewListener);

		Report.form.reset();
		Report.editor.value = '';
		Report.editor.editor.focus();

		Report.form.querySelector('#added-by').textContent = user.email;

		ReportFilters.container.innerHTML = '<div class="NA">You can add filters to this report once you add the query.</div>';
		ReportVisualizations.container.innerHTML = '<div class="NA">You can add visualizations to this report once you add the query.</div>';

		ReportFilter.insert.form.reset();
		ReportFilter.insert.form.classList.add('hidden');

		ReportVisualization.insert.form.reset();
		ReportVisualization.insert.form.classList.add('hidden');

		Report.container.querySelector('#test-container').classList.add('hidden');
		Report.renderSource();
		Sections.show('form');

		setTimeout(() => Report.form.elements['name'].focus());
	}

	static async insert(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query: Report.editor.value,
				added_by: user.user_id,
				url_options: JSON.stringify({method: Report.form.elements.method.value}),
				roles: Array.from(Report.form.roles.selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('report-form')),
			};

		const response = await API.call('reports/report/insert', parameters, options);

		await Reports.load(true);

		Reports.list.get(response.insertId).edit();

		history.pushState({what: response.insertId}, '', `/reports/${response.insertId}`);
	}

	static async renderSource() {

		const source = Reports.credentials.filter(s => s.id == Report.form.elements.connection_name.value)[0];

		if(source && ['mysql', 'pgsql'].includes(source.type)) {

			Report.form.querySelector('#query').classList.remove('hidden');
			Report.form.querySelector('#api').classList.add('hidden');

			if(!Report.schemas.has(Report.form.elements.connection_name.value)) {

				const
					parameters = { id: Report.form.elements.connection_name.value },
					response = await API.call('credentials/schema', parameters),
					container = Report.form.querySelector('#query #schema');

				const
					schema = mysqlKeywords.map(k => {return {
						name: k,
						value: k,
						meta: 'MySQL Keyword',
					}}),
					databases = document.createElement('ul');

				if(Report.selected) {

					for(const filter of Report.selected.filters.list) {
						schema.push({
							name: filter.placeholder,
							value: filter.placeholder,
							meta: 'Report Filter',
						});
					}
				}

				container.textContent = null;

				for(const database of response) {

					schema.push({
						name: database.name,
						value: database.name,
						meta: '(d)',
					});

					const tables = document.createElement('ul');
					tables.classList.add('hidden');

					for(const table of database.tables) {

						const columns = document.createElement('ul');
						columns.classList.add('hidden');

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

							const li = document.createElement('li');

							li.innerHTML = `
								<span class="name">
									<strong>C</strong>
									<span>${column.name}</span>
									<small>${column.type}</small>
								</span>
							`;

							li.querySelector('span').on('click', () => {
								Report.editor.editor.getSession().insert(Report.editor.editor.getCursorPosition(), column.name);
							});

							columns.appendChild(li);
						}

						const li = document.createElement('li');

						li.innerHTML = `
							<span class="name">
								<strong>T</strong>
								<span>${table.name}</span>
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

					const li = document.createElement('li');

					li.innerHTML = `
						<span class="name">
							<strong>D</strong>
							<span>${database.name}</span>
							<small>${database.tables.length} tables</small>
						</span>
					`;

					li.appendChild(tables)

					li.querySelector('span').on('click', () => {
						li.classList.toggle('opened');
						tables.classList.toggle('hidden')
					});

					databases.appendChild(li);
				}

				Report.schemas.set(Report.form.elements.connection_name.value, schema);

				container.appendChild(databases);
			}

			Report.editor.setAutoComplete(Report.schemas.get(Report.form.elements.connection_name.value));

		}

		else {
			Report.form.querySelector('#query').classList.add('hidden');
			Report.form.querySelector('#api').classList.remove('hidden');
		}
	}

	constructor(report) {

		for(const key in report)
			this[key] = report[key];

		this.filters = new ReportFilters(this);
		this.visualizations = new ReportVisualizations(this);
		this.id = this.query_id;

		try {
			this.url_options = JSON.parse(this.url_options) || {};
		} catch(e) {
			this.url_options = {};
		}
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		let tags = this.tags ? this.tags.split(',') : [];
		tags = tags.filter(t => t).map(tag => `<a>${tag.trim()}</a>`).join('');

		this.container.innerHTML = `
			<td>${this.query_id}</td>
			<td>
				<a href="/report/${this.id}" target="_blank">
					${this.name}
				</a>
			</td>
			<td>${this.description || ''}</td>
			<td class="source">${this.source}</td>
			<td class="tags"><div>${tags}</div></td>
			<td>${this.filters.list.size}</td>
			<td>${this.visualizations.list.size}</td>
			<td>${this.is_enabled ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit">Edit</td>
			<td class="action red" title="Delete">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => {
			Reports.search = Reports.filters.elements.search.value;
			Reports.column_search = Reports.filters.elements.column_search.value;

			this.edit();
			history.pushState({what: this.query_id}, '', `/reports/${this.query_id}`);
		});

		this.container.querySelector('.red').on('click', () => this.delete());

		for(const tag of this.container.querySelectorAll('.tags a') || []) {
			tag.on('click', () => {
				Reports.filters.column_search.value = 'tags';
				Reports.filters.search.value = tag.textContent;
				Reports.render();
			});
		}

		return this.container;
	}

	edit() {

		Report.selected = this;

		const view = Report.container.querySelector('.toolbar #view');

		Report.form.parentElement.querySelector('h1').innerHTML = `${this.name} - ${this.query_id}`;

		Report.form.removeEventListener('submit', Report.form.listener);

		view.removeEventListener('click', Report.container.viewListener);

		view.on('click', Report.container.viewListener = () => window.open(`/report/${this.query_id}`));

		Report.form.on('submit', Report.form.listener = e => this.update(e));

		ReportFilter.insert.form.removeEventListener('submit', ReportFilter.insert.form.listener);
		ReportFilter.insert.form.on('submit', ReportFilter.insert.form.listener = e => ReportFilter.insert(e, this));

		ReportVisualization.insert.form.removeEventListener('submit', ReportVisualization.insert.form.listener);
		ReportVisualization.insert.form.on('submit', ReportVisualization.insert.form.listener = e => ReportVisualization.insert(e, this));

		Report.form.reset();

		for(const key in this) {
			if(Report.form.elements[key])
				Report.form.elements[key].value = this[key] || '';
		}

		Report.form.method.value = this.url_options.method;
		Report.form.format.value = JSON.stringify(this.format, 0, 4);

		Report.editor.value = this.query;
		Report.editor.editor.focus();
		Report.form.querySelector('#added-by').textContent = this.added_by || 'Not Available';

		Report.form.querySelector('#roles').value = '';

		if(this.roles)
			Array.from(Report.form.querySelectorAll('#roles option')).map(o => o.selected = this.roles.split(',').includes(o.value));

		ReportFilter.insert.form.reset();
		ReportFilter.insert.form.classList.remove('hidden');

		ReportVisualization.insert.form.reset();
		ReportVisualization.insert.form.classList.remove('hidden');

		Report.renderSource();
		this.filters.render();
		this.visualizations.render();

		Report.selected.filterSuggestions();

		Report.container.querySelector('#test-container').classList.add('hidden');
		Sections.show('form');
	}

	async update(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query_id: this.query_id,
				query: Report.editor.value,
				url_options: JSON.stringify({method: Report.form.elements.method.value}),
				roles: Array.from(Report.form.querySelector('#roles').selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('report-form')),
			};

		await API.call('reports/report/update', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.query_id).edit();
	}

	async delete() {

		if(!window.confirm('Are you sure?!'))
			return;

		const
			parameters = {
				query_id: this.id,
				is_deleted: 1,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/report/update', parameters, options);

		await Reports.load(true);
	}

	async test(is_redis) {

		const
			parameters = {
				query_id: this.id,
				email: user.email,
			},
			options = {
				method: 'POST',
			};

		let tab = 'json';

		if(is_redis)
			parameters.is_redis = 0;

		const content = {
			rowCount: Report.container.querySelector('#row-count'),
			json: Report.container.querySelector('#json-content'),
			query: Report.container.querySelector('#query-content'),
			table: Report.container.querySelector('#table-content'),
		};

		try {

			const response = await API.call('reports/engine/report', parameters, options) || [];

			content.rowCount.innerHTML = `
				<span>Execution Time: <strong>${Format.number(response.runtime / 1000)}s</strong></span>
				<span>Cached: <strong>${response.cached.status ? 'Yes' : 'No'}</strong></span>
				<span>Cache Age: <strong>${response.cached.status ? Format.number(response.cached.age / 1000 / 60 / 60) : '0'}h</strong></span>
				<span>Rows: <strong>${Format.number(response ? response.data.length : 0)}</strong></span>
				<span>Columns: <strong>${Format.number(response ? Object.keys(response.data[0]).length : 0)}</strong></span>
			`;

			content.json.innerHTML = `<code>${JSON.stringify(response.data, 0, 1)}</code>`;

			content.query.innerHTML = `<code>${response.query || ''}</code>`;

			if(response.data.length) {

				const
					headings = Object.keys(response.data[0]).map(key => `<th>${key}</th>`),
					rows = response.data.map(row => '<tr>'+Object.keys(row).map(key => `<td>${row[key]}</td>`).join('')+'</tr>');

				content.table.innerHTML = `
					<table>
						<thead>
							<tr>${headings.join('')}</tr>
						</thead>

						<tbody>
							${rows.join('')}
						</tbody>
					</table>
				`;

				if(!Object.values(response.data[0]).filter(value => (typeof value == 'object')).length)
					tab = 'table';
			}

		} catch(e) {
			content.rowCount.textContent = null;
			content.json.innerHTML = content.query.innerHTML = content.table.innerHTML = `<code class="warning">${e.message}</code>`;
		}

		Report.container.querySelector(`#${tab}`).click();

		Report.testContainer.parentElement.classList.remove('hidden');
	}

	filterSuggestions() {

		let placeholders = Report.editor.value.match(/{{([a-zA-Z0-9_-]*)}}/g) || [];

		placeholders = new Set(placeholders.map(a => a.match('{{(.*)}}')[1]));

		const
			missing = new Set(placeholders),
			missingContainer = Report.container.querySelector('#missing-filters');

		this.filters.suggestions = placeholders;

		for(const filter of this.filters.list) {

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
}

class ReportFilters {

	static setup(container) {
		ReportFilters.container = container;
	}

	constructor(report) {

		this.report = report;
		this.list = new Set;

		for(const filter of this.report.filters || [])
			this.list.add(new ReportFilter(filter, this));
	}

	render() {

		ReportFilters.container.textContent = null;

		for(const filter of this.list)
			ReportFilters.container.appendChild(filter.row);

		if(!this.list.size)
			ReportFilters.container.innerHTML = '<div class="NA">No filters found!</div>';

		ReportFilter.insert.form.elements.dataset.innerHTML = `<option value="">None</option>`;

		for(const dataset of Reports.datasets) {

			ReportFilter.insert.form.elements.dataset.insertAdjacentHTML('beforeend', `
				<option value="${dataset.id}">${dataset.name}</option>
			`);
		}
	}
}

class ReportFilter {

	static setup() {
		ReportFilter.insert.form = document.getElementById('add-filter');
	}

	static async insert(e, report) {

		e.preventDefault();

		const
			parameters = {
				query_id: report.id
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('add-filter')),
			};

		await API.call('reports/filters/insert', parameters, options);

		await Reports.load(true);

		Reports.list.get(report.id).edit();
	}

	constructor(filter, filters) {

		this.filters = filters;

		for(const key in filter)
			this[key] = filter[key];

		this.id = this.filter_id;
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('form');
		this.container.classList.add('form', 'filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `
			<label>
				<span>Name</span>
				<input type="text" name="name" value="${this.name}" required>
			</label>

			<label>
				<span>Placeholder</span>
				<input type="text" name="placeholder" value="${this.placeholder}" required>
			</label>

			<label>
				<span>Type</span>
				<select name="type" required>
					<option value="0">Integer</option>
					<option value="1">String</option>
					<option value="2">Date</option>
					<option value="3">Month</option>
					<option value="4">city</option>
				</select>
			</label>

			<label>
				<span>Description</span>
				<input type="text" name="description" value="${this.description || ''}">
			</label>

			<label>
				<span>Default Value</span>
				<input type="text" name="default_value" value="${this.default_value || ''}">
			</label>

			<label>
				<span>Offset</span>
				<input type="text" name="offset" value="${this.offset === null ? '' : this.offset}">
			</label>

			<label>
				<span>Dataset</span>
				<select name="dataset">
					<option value="">None</option>
				</select>
			</label>

			<label>
				<span>Multiple</span>
				<select name="multiple" required>
					<option value="0">No</option>
					<option value="1">Yes</option>
				</select>
			</label>

			<label class="save">
				<span>&nbsp;</span>
				<button type="submit"><i class="far fa-save"></i> Save</button>
			</label>

			<label class="delete">
				<span>&nbsp;</span>
				<button type="button"><i class="far fa-trash-alt"></i> Delete</button>
			</label>
		`;

		this.container.dataset.innerHTML = `<option value="">None</option>`;

		for(const dataset of Reports.datasets) {

			this.container.dataset.insertAdjacentHTML('beforeend', `
				<option value="${dataset.id}">${dataset.name}</option>
			`);
		}

		this.container.on('submit', e => this.update(e));
		this.container.querySelector('.delete').on('click', () => this.delete());

		this.container.type.value = this.type;
		this.container.dataset.value = this.dataset || '';
		this.container.multiple.value = this.multiple;

		for(const element of this.container.elements) {
			element.on('change', () => this.container.classList.add('unsaved'));
			element.on('keyup', () => this.container.classList.add('unsaved'));
		}

		return this.container;
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				filter_id: this.id
			},
			options = {
				method: 'POST',
				form: new FormData(this.container),
			};

		await API.call('reports/filters/update', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.filters.report.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			parameters = {
				filter_id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/filters/delete', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.filters.report.id).edit();
	}
}

class ReportVisualizations {

	static setup(page) {

		ReportVisualizations.container = page.container.querySelector('#visualizations-list');
		ReportVisualizations.preview = page.container.querySelector('#visualization-preview');
	}

	constructor(report) {

		this.report = report;
		this.list = new Set;

		for(const visualization of this.report.visualizations || [])
			this.list.add(new ReportVisualization(visualization, this));
	}

	render() {

		ReportVisualizations.container.textContent = null;

		for(const visualization of this.list)
			ReportVisualizations.container.appendChild(visualization.row);

		if(!this.list.size)
			ReportVisualizations.container.innerHTML = '<div class="NA">No visualizations found!</div>';
	}
}

class ReportVisualization {

	static setup() {

		ReportVisualization.insert.form = document.getElementById('add-visualization');

		const type = ReportVisualization.insert.form.type;

		for(const visualization of MetaData.visualizations) {
			type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		type.on('change', () => {
			ReportVisualization.insert.form.name.value = type.options[type.selectedIndex].textContent;
		});
	}

	static async insert(e, report) {

		e.preventDefault();

		const
			form = document.getElementById('add-visualization'),
			parameters = {
				query_id: report.id
			},
			options = {
				method: 'POST',
				form: new FormData(form),
			};

		if(['line', 'area', 'bar', 'stacked'].includes(form.type.value)) {
			parameters.options = JSON.stringify({
				axis: {
					x: {
						column: form.column.value,
					},
					y: {}
				}
			});
		}

		await API.call('reports/visualizations/insert', parameters, options);

		await Reports.load(true);

		Reports.list.get(report.id).edit();
	}

	constructor(visualization, visualizations) {

		this.visualizations = visualizations;

		for(const key in visualization)
			this[key] = visualization[key];

		this.id = this.visualization_id;

		try {
			this.options = JSON.parse(this.options);
		} catch(e) {
			this.options = null;
		}

		// Generate the form
		this.row;
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('form');
		this.container.classList.add('form', 'visualization');
		this.container.id = 'visualizations-form-'+this.id;

		this.container.innerHTML = `
			<label>
				<span>Name</span>
				<input type="text" name="name" value="${this.name}" required>
			</label>

			<label>
				<span>Type</span>
				<select name="type" required></select>
			</label>

			<label>
				<span>X-Axis Column</span>
				<input type="text" name="column" placeholder="X-Axis Column">
			</label>

			<label class="save">
				<span>&nbsp;</span>
				<button type="submit"><i class="far fa-save"></i> Save</button>
			</label>

			<label class="delete">
				<span>&nbsp;</span>
				<button type="button"><i class="far fa-trash-alt"></i> Delete</button>
			</label>

			<label class="preview">
				<span>&nbsp;</span>
				<button type="button"><i class="fas fa-eye"></i> Preview</button>
			</label>
		`;

		if(['line', 'area', 'bar', 'stacked'].includes(this.type))
			this.container.column.value = this.options ? this.options.axis.x.column : '';

		this.container.on('submit', e => this.update(e));
		this.container.querySelector('.delete').on('click', () => this.delete());
		this.container.querySelector('.preview').on('click', async () => {

			await DataSource.load(true);

			const report = new DataSource(DataSource.list.get(this.visualizations.report.query_id));

			ReportVisualizations.preview.textContent = null;

			ReportVisualizations.preview.appendChild(report.container);

			[report.visualizations.selected] = report.visualizations.filter(v => v.visualization_id == this.visualization_id);

			report.visualizations.selected.load();
		});

		for(const visualization of MetaData.visualizations) {
			this.container.type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		this.container.type.value = this.type;

		for(const element of this.container.elements) {
			element.on('change', () => this.container.classList.add('unsaved'));
			element.on('keyup', () => this.container.classList.add('unsaved'));
		}

		return this.container;
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				visualization_id: this.id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.container),
			};

		if(['line', 'area', 'bar', 'stacked'].includes(this.type)) {
			parameters.options = JSON.stringify({
				axis: {
					x: {
						column: this.container.column.value,
					},
					y: {}
				}
			});
		}

		await API.call('reports/visualizations/update', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.visualizations.report.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			parameters = {
				visualization_id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/visualizations/delete', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.visualizations.report.id).edit();
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
];