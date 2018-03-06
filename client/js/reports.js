window.on('DOMContentLoaded', async () => {

	await Reports.setup(document.querySelector('section.section#list'));
	Report.setup(document.querySelector('section.section#form'));

	ReportFilters.setup(document.getElementById('filters-list'));
	ReportVisualizations.setup(document.getElementById('visualizations-list'));

	await Reports.load();

	ReportFilter.setup();
	ReportVisualization.setup();

	Reports.loadState();
});

window.on('popstate', e => Reports.loadState(e.state));

class Reports extends Page {

	static async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return Report.add();

		if(Reports.list.has(parseInt(what)))
			return Reports.list.get(parseInt(what)).edit();

		Sections.show('list');
	}

	static back() {

		if(history.state)
			return history.back();

		Sections.show('list');
		history.pushState(null, '', `/reports`);
	}

	static async setup(container) {

		await Page.setup();

		Reports.container = container;

		Reports.container.querySelector('#add-report').on('click', () => {
			Report.add();
			history.pushState({id: 'add'}, '', `/reports/add`);
		});

		Reports.filters = Reports.container.querySelector('form.filters');

		Reports.filters.elements.search.on('keyup', Reports.render);
		Reports.filters.elements.search.on('search', Reports.render);
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

		[ReportFilter.dataset, Reports.response, Reports.credentials] = await Promise.all([
			API.call('v2/reports/datasets/names'),
			API.call('v2/reports/report/list'),
			API.call('v2/credentials/list'),
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

class Report {

	static setup(container) {

		Report.container = container;
		Report.form = Report.container.querySelector('form');
		Report.testContainer = Report.container.querySelector('#test-body');

		Report.container.querySelector('.toolbar #back').on('click', () => {
			Reports.back();
		});
		Report.container.querySelector('.toolbar #test').on('click', () => Report.selected && Report.selected.test());
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

		// Initiate the editor. All this only needs to be done once on page load.
		Report.editor = ace.edit('editor');

		Report.editor.setTheme("ace/theme/monokai");
		Report.editor.getSession().setMode("ace/mode/sql");
		Report.editor.setFontSize(16);
		Report.editor.$blockScrolling = Infinity;

		setTimeout(() => {

			// The keyboard shortcut to submit the form on Ctrl + S inside the editor.
			Report.editor.commands.addCommand({
				name: 'save',
				bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
				exec: () => Report.selected && Report.selected.update()
			});

			// The keyboard shortcut to test the report on Ctrl + E inside the editor.
			Report.editor.commands.addCommand({
				name: 'execute',
				bindKey: { win: 'Ctrl-E', mac: 'Cmd-E' },
				exec: () => Report.selected && Report.selected.test()
			});
		});
	}

	static add() {

		Report.selected = null;

		Report.container.querySelector('h1').textContent = 'Add New Report';

		if(Report.form.listener)
			Report.form.removeEventListener('submit', Report.form.listener);

		Report.form.on('submit', Report.form.listener = e => Report.insert(e));

		Report.form.reset();
		Report.editor.setValue('', 1);
		Report.editor.focus();

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
				query: Report.editor.getValue(),
				added_by: user.email,
				url_options: JSON.stringify({method: Report.form.elements.method.value}),
				roles: Array.from(Report.form.roles.selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('report-form')),
			};

		const response = await API.call('v2/reports/report/insert', parameters, options);

		await Reports.load(true);

		Reports.list.get(response.insertId).edit();

		history.pushState({what: this.response}, '', `/reports/${this.response}`);
	}

	static async renderSource() {

		const source = Reports.credentials.filter(s => s.id == Report.form.elements.connection_name.value)[0];

		if(source && source.type == 'mysql') {

			Report.form.querySelector('#query').classList.remove('hidden');
			Report.form.querySelector('#api').classList.add('hidden');

			if(!Report.schemas.has(Report.form.elements.connection_name.value)) {

				const
					parameters = { id: Report.form.elements.connection_name.value },
					response = await API.call('v2/credentials/schema', parameters),
					container = Report.form.querySelector('#query #schema');

				const
					schema = [],
					databases = document.createElement('ul');

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
									<i class="fa fa-columns"></i>
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
							<span class="name" title="${table.columns.length} columns">
								<i class="fa fa-table"></i>
								<span>${table.name}</span>
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
						<span class="name" title="${database.tables.length} tables">
							<i class="fa fa-database"></i>
							<span>${database.name}</span>
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

			// Report.editor.setAutoComplete(Report.schemas.get(Report.form.elements.connection_name.value));

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
			<td class="action edit">Edit</td>
			<td class="action delete">Delete</td>
		`;

		this.container.querySelector('.edit').on('click', () => {
			Reports.search = Reports.filters.elements.search.value;
			Reports.column_search = Reports.filters.elements.column_search.value;

			this.edit();
			history.pushState({what: this.query_id}, '', `/reports/${this.query_id}`);
		});

		this.container.querySelector('.delete').on('click', () => this.delete());

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

		Report.form.parentElement.querySelector('h1').innerHTML = `
			${this.name}
			<a href="/report/${this.id}" target="_blank">
				View
				<i class="fas fa-external-link-alt"></i>
			</a>&nbsp;
		`;

		if(Report.form.listener)
			Report.form.removeEventListener('submit', Report.form.listener);

		Report.form.on('submit', Report.form.listener = e => this.update(e));

		if(ReportFilter.insert.form.listener)
			ReportFilter.insert.form.removeEventListener('submit', ReportFilter.insert.form.listener);

		ReportFilter.insert.form.on('submit', ReportFilter.insert.form.listener = e => ReportFilter.insert(e, this));


		if(ReportVisualization.insert.form.listener)
			ReportVisualization.insert.form.removeEventListener('submit', ReportVisualization.insert.form.listener);

		ReportVisualization.insert.form.on('submit', ReportVisualization.insert.form.listener = e => ReportVisualization.insert(e, this));

		Report.form.reset();

		Report.selected.filterSuggestions();

		for(const key in this) {
			if(Report.form.elements[key])
				Report.form.elements[key].value = this[key];
		}

		Report.form.elements.method.value = this.url_options.method;

		Report.editor.setValue(this.query, 1);
		Report.editor.focus();
		Report.form.querySelector('#added-by').textContent = this.added_by || 'Not Available';

		Report.form.querySelector('#roles').value = '';

		if(this.roles)
			Array.from(Report.form.querySelectorAll('#roles option')).map(o => o.selected = this.roles.split(',').includes(o.value));

		ReportFilter.insert.form.reset();
		ReportFilter.insert.form.classList.remove('hidden');

		Report.editor.getSession().on('change', () => Report.selected && Report.selected.filterSuggestions());

		ReportVisualization.insert.form.reset();
		ReportVisualization.insert.form.classList.remove('hidden');

		Report.renderSource();
		this.filters.render();
		this.visualizations.render();

		Report.container.querySelector('#test-container').classList.add('hidden');
		Sections.show('form');
	}

	async update(e) {

		if(e)
			e.preventDefault();

		const
			parameters = {
				query_id: this.query_id,
				query: Report.editor.getValue(),
				url_options: JSON.stringify({method: Report.form.elements.method.value}),
				roles: Array.from(Report.form.querySelector('#roles').selectedOptions).map(a => a.value).join(),
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('report-form')),
			};

		await API.call('v2/reports/report/update', parameters, options);

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

		await API.call('v2/reports/report/update', parameters, options);

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

		try {

			let response = await API.call('v2/reports/engine/report', parameters, options);

			if(!response)
				response = [];

			else response = response.data;

			Report.container.querySelector('#row-count').textContent = 'Rows: '+Format.number(response ? response.length : 0);

			Report.testContainer.querySelector('#json-content').innerHTML = `<code>${JSON.stringify(response, 0, 1)}</code>`;

			Report.testContainer.querySelector('#query-content').innerHTML = `<code>${response.query || ''}</code>`;

			if(response.length) {

				const
					headings = Object.keys(response[0]).map(key => `<th>${key}</th>`),
					rows = response.map(row => '<tr>'+Object.keys(row).map(key => `<td>${row[key]}</td>`).join('')+'</tr>');

				Report.testContainer.querySelector('#table-content').innerHTML = `
					<table>
						<thead>
							<tr>${headings.join('')}</tr>
						</thead>

						<tbody>
							${rows.join('')}
						</tbody>
					</table>
				`;

				if(!Object.values(response[0]).filter(value => (typeof value == 'object')).length)
					tab = 'table';
			}

			Report.container.querySelector(`#${tab}`).click();

		} catch(e) {

			Report.testContainer.querySelector('#json-content').innerHTML = `<code>${JSON.stringify(JSON.parse(e.response || '{}'), 0, 1)}</code>`;
		}

		Report.testContainer.parentElement.classList.remove('hidden');
		// document.getElementById('content').scrollTo(0, 0);
	}

	filterSuggestions() {

		let placeholders = Report.editor.getValue().match(/{{([a-zA-Z0-9_-]*)}}/g) || [];

		placeholders = new Set(placeholders.map(a => a.match('{{(.*)}}')[1]));

		const
			missing = new Set(placeholders),
			missingContainer = Report.container.querySelector('#missing-filters');

		this.filters.suggestions = placeholders;

		for(const filter of this.filters.list) {

			if(!filter.container)
				continue;

			filter.container.elements.placeholder.classList.remove('red');

			if(!placeholders.has(filter.placeholder) && filter.is_enabled)
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

		for(const row of ReportFilter.dataset) {

			ReportFilter.insert.form.elements.dataset.insertAdjacentHTML('beforeend', `
				<option>${row.dataset}</option>
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

		await API.call('v2/reports/filters/insert', parameters, options);

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
		this.container.classList.add('filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `
			<label>
				<input type="text" name="name" value="${this.name}" placeholder="Name" required>
			</label>

			<label>
				<input type="text" name="placeholder" value="${this.placeholder}" placeholder="Placeholder" required>
			</label>

			<label>
				<select name="type" required>
					<option value="0">Integer</option>
					<option value="1">String</option>
					<option value="2">Date</option>
					<option value="3">Month</option>
					<option value="4">city</option>
				</select>
			</label>

			<label>
				<input type="text" name="description" value="${this.description || ''}" placeholder="Description">
			</label>

			<label>
				<input type="text" name="default_value" value="${this.default_value || ''}" placeholder="Default Value">
			</label>

			<label>
				<input type="text" name="offset" value="${this.offset === null ? '' : this.offset}" placeholder="Offset">
			</label>

			<label>
				<select name="dataset">
					<option value="">None</option>
				</select>
			</label>

			<label>
				<select name="is_enabled" required>
					<option value="1">Enabled</option>
					<option value="0">Disabled</option>
				</select>
			</label>

			<label class="save">
				<input type="submit" value="Save">
			</label>

			<label class="delete">
				<input type="button" value="Delete">
			</label>
		`;

		this.container.elements.dataset.innerHTML = `<option value="">None</option>`;

		for(const row of ReportFilter.dataset) {

			this.container.elements.dataset.insertAdjacentHTML('beforeend', `
				<option>${row.dataset}</option>
			`);
		}

		this.container.on('submit', e => this.update(e));
		this.container.querySelector('.delete').on('click', () => this.delete());

		this.container.elements.type.value = this.type;
		this.container.elements.dataset.value = this.dataset || '';
		this.container.elements.is_enabled.value = this.is_enabled;

		if(!parseInt(this.is_enabled))
			this.container.classList.add('disabled');

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

		await API.call('v2/reports/filters/update', parameters, options);

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

		await API.call('v2/reports/filters/delete', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.filters.report.id).edit();
	}
}

class ReportVisualizations {

	static setup(container) {
		ReportVisualizations.container = container;
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
	}

	static async insert(e, report) {

		e.preventDefault();

		const
			parameters = {
				query_id: report.id
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('add-visualization')),
			};

		await API.call('v2/reports/visualizations/insert', parameters, options);

		await Reports.load(true);

		Reports.list.get(report.id).edit();
	}

	constructor(visualization, visualizations) {

		this.visualizations = visualizations;

		for(const key in visualization)
			this[key] = visualization[key];

		this.id = this.visualization_id;

		// Generate the form
		this.row;
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('form');
		this.container.classList.add('visualization');
		this.container.id = 'visualizations-form-'+this.id;

		this.container.innerHTML = `
			<label>
				<input type="text" name="name" value="${this.name}" required>
			</label>

			<label>
				<select name="type" required>
					<option value="table">Table</option>
					<option value="spatialmap">Spatial Maps</option>
					<option value="funnel">Funnel</option>
					<option value="cohort">Cohort</option>
					<option value="line">Line</option>
					<option value="bar">Bar</option>
					<option value="area">Area</option>
					<option value="stacked">Stacked</option>
				</select>
			</label>

			<label>
				<select name="is_enabled" required>
					<option value="1">Enabled</option>
					<option value="0">Disabled</option>
				</select>
			</label>

			<label class="save">
				<input type="submit" value="Save">
			</label>

			<label class="delete">
				<input type="button" value="Delete">
			</label>
		`;

		this.container.on('submit', e => this.update(e));
		this.container.querySelector('.delete').on('click', () => this.delete());

		this.container.elements.type.value = this.type;
		this.container.elements.is_enabled.value = this.is_enabled;

		if(!parseInt(this.is_enabled))
			this.container.classList.add('disabled');

		return this.container;
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				visualization_id: this.id
			},
			options = {
				method: 'POST',
				form: new FormData(this.container),
			};

		await API.call('v2/reports/visualizations/update', parameters, options);

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

		await API.call('v2/reports/visualizations/delete', parameters, options);

		await Reports.load(true);

		Reports.list.get(this.visualizations.report.id).edit();
	}
}