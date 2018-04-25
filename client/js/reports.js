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

		let what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return Report.add();

		what = parseInt(what);

		if(location.pathname.includes('/reports/') && Reports.list.has(what))
			return Reports.list.get(what).edit();

		if(location.pathname.includes('/visualization/') && what) {

			let visualization = null;

			for(const report of Reports.list.values()) {

				if(report.visualizations.list.has(what))
					visualization = report.visualizations.list.get(what);
			}

			if(visualization) {
				visualization.visualizations.report.edit();
				visualization.edit();
				return;
			}
		}

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

		Reports.prepareColumns();
	}

	static prepareColumns() {

		const searchRow = Reports.container.querySelector('table thead tr');
		const columns = Reports.container.querySelector('table thead tr.table-head');

		for(const column of columns.children){

			const col = document.createElement('th');

			if(
				column.textContent.toLowerCase() != 'edit' &&
				column.textContent.toLowerCase() != 'delete'
			){
				col.innerHTML = `<input type="search" class="column-search" name="${column.title}" placeholder="${column.textContent}">`;
				col.querySelector('.column-search').on('keyup', () => {
					Reports.columnValue = column.title;
					Reports.render();
				});
			}

			searchRow.appendChild(col);

			if(column.classList.value == 'sort'){
				column.on('click', () => {
					Reports.sortOrder = column.sort =  !column.sort;
					Reports.columnSorted = column.title;
					Reports.process();
					Reports.render();
				});
			}
		}
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


		Reports.sort();

		Reports.list = new Map;

		for(const report of Reports.response || [])
			Reports.list.set(report.query_id, new Report(report));
	}

	static sort() {

		if(!Reports.columnSorted)
			return;

		Reports.response = Reports.response.sort(function(a, b) {

			if( Reports.columnSorted == 'name' || Reports.columnSorted == 'description'){
				a = a[Reports.columnSorted] ? a[Reports.columnSorted].toUpperCase() : '';
				b = b[Reports.columnSorted] ? b[Reports.columnSorted].toUpperCase() : '';
			}
			else if( Reports.columnSorted == 'visualizations' || Reports.columnSorted == 'filters') {

				a = a[Reports.columnSorted].length;
				b = b[Reports.columnSorted].length;
			}
			else {
				a = a[Reports.columnSorted];
				b = b[Reports.columnSorted];
			}

			let result = 0;
			if (a < b) {
				result = -1;
			}
			if (a > b) {
				result = 1;
			}
			if(!Reports.sortOrder){
				result *= -1;
			}

			return result;
		});
	}

	static render() {

		const container = Reports.container.querySelector('table tbody');
		const theadSearch = document.querySelectorAll('.column-search');

		container.textContent = null;

		for(const report of Reports.list.values()) {

			let found = true;

			for(const inputs of theadSearch) {

				const key = inputs.name == 'filters' ? 'query_filter' : inputs.name == 'visualizations' ? 'query_visualization' : inputs.name;

				if(inputs.value == "") {
					found = found && true;
					continue;
				}

				const check = report[key] && report[key].toString().toLowerCase().includes(inputs.value) ? true : false;
				found = found && check;

				if(!found)
					break;
			}

			if(found)
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
		Report.form = Report.container.querySelector('#report-form');
		Report.testContainer = Report.container.querySelector('#test-container');

		window.onbeforeunload = () => Report.container.querySelector('.unsaved');

		Report.container.querySelector('.toolbar #import').on('click', () => {
			Report.import();
		});

		Report.container.querySelector('.toolbar #back').on('click', () => {
			Reports.back();
		});

		Report.container.querySelector('.toolbar #test').on('click', async () => {

			if(!Report.selected)
				return;

			await Report.selected.update();
			await Report.selected.run();
		});

		Report.container.querySelector('.toolbar #force-test').on('click', () => Report.selected && Report.selected.test(true));

		Report.form.querySelector('#full-screen-editor').on('click', () => {

			if(document.webkitFullscreenElement)
				document.webkitExitFullscreen();
			else
				Report.form.querySelector('#query').webkitRequestFullscreen();
		});

		for(const tab of Report.container.querySelectorAll('.tab')) {
			tab.on('click', () => {
				for(const _tab of Report.container.querySelectorAll('.tab')) {
					Report.testContainer.querySelector(`#${_tab.id}-content`).classList.toggle('hidden', _tab != tab);
					_tab.classList.toggle('active', _tab == tab);
				}
			});
		}

		Report.schemas = new Map;

		for(const element of Report.form.elements) {
			element.on('change', () => Report.form.elements[0].classList.add('unsaved'));
			element.on('keyup', () => Report.form.elements[0].classList.add('unsaved'));
		}

		for(const key in this) {
			if(Report.form.elements[key])
				Report.form.elements[key].value = this[key];
		}

		Report.form.elements.connection_name.on('change', () => Report.renderSource());

		for(const category of MetaData.categories.values()) {
			Report.form.category_id.insertAdjacentHTML('beforeend', `
				<option value="${category.category_id}">${category.name}</option>
			`);
		}

		// Initiate the editor. All this only needs to be done once on page load.
		Report.editor = new Editor(Report.form.querySelector('#editor'));

		Report.editor.editor.getSession().on('change', () => {

			if(!Report.selected)
				return;

			Report.selected.filterSuggestions();

			Report.form.elements[0].classList.toggle('unsaved', Report.editor.value != Report.selected.query);
		});

		Report.form.is_redis.classList.add('hidden');

		Report.form.redis.removeEventListener('change', Report.handleRedisSelect);

		Report.form.redis.on("change", Report.handleRedisSelect = () => {

			Report.form.is_redis.type = Report.form.redis.value === "EOD" ? "text" : "number";

			Report.form.is_redis.value = Report.form.redis.value;
			Report.form.is_redis.classList.toggle('hidden', Report.form.redis.value !== "custom");


		});

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

					await Report.selected.run();

					Report.editor.editor.resize();
				}
			});
		});
	}

	static import() {

		const form = document.createElement('form');
		form.classList.add('form');
		form.insertAdjacentHTML('beforeend', `
			<textarea rows="10" cols="200" id="json"></textarea>
			<label>
				<button type="submit"><i class="fa fa-save"></i> Save</button>
			</label>
		`);

		Report.container.insertBefore(form, Report.form);

		form.on('submit', async (e) => {
			if(e)
				e.preventDefault();

			try {
				JSON.parse(form.json.value);
			}
			catch(e) {
				alert('Invalid Json Format');
				return;
			}

			const parameters = {
				json: form.json.value
			};

			const options = {
				method: 'POST'
			};

			const response = await API.call('import/json', parameters, options);

			await Reports.load(true);

			Reports.list.get(response.insertId).edit();

			history.pushState({what: response.insertId}, '', `/reports/${response.insertId}`);
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
		Report.form.elements[0].classList.remove('unsaved');

		Report.form.querySelector('#added-by').textContent = user.email;

		ReportFilters.container.innerHTML = '<div class="NA">You can add filters to this report once you add the query.</div>';
		ReportVisualizations.container.classList.add('hidden');

		ReportFilter.insert.form.reset();
		ReportFilter.insert.form.classList.add('hidden');

		ReportVisualization.insert.form.reset();
		ReportVisualization.insert.form.classList.add('hidden');

		Report.container.querySelector('.toolbar #test').classList.add('hidden');
		Report.container.querySelector('.toolbar #force-test').classList.add('hidden');

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

				let response = null;

				const container = Report.form.querySelector('#query #schema');

				try {
					response = await API.call('credentials/schema', { id: Report.form.elements.connection_name.value });
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

				const search = document.createElement('input');

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

				Report.schemas.set(Report.form.elements.connection_name.value, schema);

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
									Report.editor.editor.getSession().insert(Report.editor.editor.getCursorPosition(), column.name);
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

		let
			query_filter = [],
			query_visualization = [];

		for(const filter of this.filters.list)
			query_filter.push(filter.name);

		for(const visual of this.visualizations.list.values())
			query_visualization.push(visual.name);

		this.query_visualization = query_visualization.join(', ');
		this.query_filter = query_filter.join(', ');

		let tags = this.tags ? this.tags.split(',') : [];
		tags = tags.filter(t => t).map(tag => `<a>${tag.trim()}</a>`).join('');

		const [connection] = this.connection_name ? Reports.credentials.filter(c => c.id == this.connection_name) : [];
		this.connection = connection ? connection.connection_name + ' ('+connection.type+')' : '';

		this.container.innerHTML = `
			<td>${this.query_id}</td>
			<td>
				<a href="/report/${this.id}" target="_blank">
					${this.name}
				</a>
			</td>
			<td>${this.description || ''}</td>
			<td>${this.connection}</td>
			<td class="tags"><div>${tags}</div></td>
			<td title="${this.query_filter}" >${this.filters.list.size}</td>
			<td title="${this.query_visualization}" >${this.visualizations.list.size}</td>
			<td>${this.is_enabled ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit">Edit</td>
			<td class="action red" title="Delete">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => {

			this.edit();
			history.pushState({what: this.query_id}, '', `/reports/${this.query_id}`);
		});

		this.container.querySelector('.red').on('click', () => this.delete());

		// for(const tag of this.container.querySelectorAll('.tags a') || []) {
		// 	tag.on('click', () => {
		// 		Reports.filters.column_search.value = 'tags';
		// 		Reports.filters.search.value = tag.textContent;
		// 		Reports.render();
		// 	});
		// }

		return this.container;
	}

	async edit() {

		Report.selected = this;

		const view = Report.container.querySelector('.toolbar #view');

		Report.form.parentElement.querySelector('h1').innerHTML = `${this.name} <span class="NA">#${this.query_id}</span>`;

		Report.form.removeEventListener('submit', Report.form.listener);

		view.removeEventListener('click', Report.container.viewListener);

		view.on('click', Report.container.viewListener = () => window.open(`/report/${this.query_id}`));

		Report.form.on('submit', Report.form.listener = e => this.update(e));

		ReportFilter.insert.form.removeEventListener('submit', ReportFilter.insert.form.listener);
		ReportFilter.insert.form.on('submit', ReportFilter.insert.form.listener = e => ReportFilter.insert(e, this));

		ReportVisualization.insert.form.removeEventListener('submit', ReportVisualization.insert.form.listener);
		ReportVisualization.insert.form.on('submit', ReportVisualization.insert.form.listener = e => ReportVisualization.insert(e, this));

		if(ReportVisualizations.preview.classList.contains('hidden'))
			ReportVisualizations.container.classList.remove('hidden');


		Report.form.reset();
		Report.form.elements[0].classList.remove('unsaved');

		if(parseInt(Report.form.is_redis.value) > 0) {

			Report.form.redis.value = "custom";
			Report.form.is_redis.classList.remove('hidden');
		}
		else {

			Report.form.redis.value = this.is_redis;
			Report.form.is_redis.classList.add('hidden');
		}

		for (const key in this) {
			if (Report.form.elements[key])
				Report.form.elements[key].value = this[key];
		}

		if (parseInt(this.is_redis) > 0) {

			Report.form.redis.value = "custom";
			Report.form.is_redis.classList.remove('hidden');
		}
		else {

			Report.form.redis.value = this.is_redis;
			Report.form.is_redis.classList.add('hidden');
		}


		Report.form.method.value = this.url_options.method;
		Report.form.format.value = this.format ? JSON.stringify(this.format, 0, 4) : '';

		Report.editor.value = this.query;
		Report.editor.editor.focus();
		Report.form.querySelector('#added-by').textContent = this.added_by || 'Not Available';
		Report.form.redis.value = parseInt(Report.form.is_redis.value) > 0 ? "custom" : this.is_redis;

		Report.form.querySelector('#roles').value = '';

		if(this.roles)
			Array.from(Report.form.querySelectorAll('#roles option')).map(o => o.selected = this.roles.split(',').includes(o.value));

		ReportFilter.insert.form.reset();
		ReportFilter.insert.form.classList.remove('hidden');

		ReportVisualization.insert.form.reset();
		ReportVisualization.insert.form.classList.remove('hidden');

		Report.container.querySelector('.toolbar #test').classList.remove('hidden');
		Report.container.querySelector('.toolbar #force-test').classList.remove('hidden');

		Report.renderSource();
		this.filters.render();
		this.visualizations.render();

		Report.selected.filterSuggestions();

		await Sections.show('form');
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

	async run() {

		await DataSource.load();

		let report = DataSource.list.get(this.id);

		if(!report)
			return;

		report = new DataSource(report);

		report.query = Report.editor.editor.getSelectedText() || Report.editor.value;
		report.queryOverride = true;

		report.visualizations = report.visualizations.filter(v => v.type == 'table');

		report.container.querySelector('header').classList.add('hidden');

		const executing = Report.container.querySelector('#test-executing');

		let executingTime = Date.now();

		executing.classList.remove('hidden');

		(function showTime() {

			if(!executingTime)
				return;

			executing.innerHTML = `Executing Query&hellip; ${Format.number((Date.now() - executingTime) / 1000)}s`

			setTimeout(() => window.requestAnimationFrame(() => showTime()), 100);
		})();

		const promises = [];

		for(const filter of report.filters.values()) {
			if(filter.dataset)
				promises.push(filter.dataset.fetch());
		}

		await Promise.all(promises);

		await report.visualizations.selected.load();

		report.container.querySelector('.menu-toggle').click();

		const oldContainer = Report.testContainer.querySelector('.data-source');

		if(oldContainer)
			Report.testContainer.removeChild(oldContainer);

		Report.testContainer.appendChild(report.container);

		executingTime = false;

		executing.classList.add('hidden');
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
		this.list = new Map;

		for(const visualization of this.report.visualizations || [])
			this.list.set(visualization.visualization_id, new ReportVisualization(visualization, this));
	}

	render() {

		const tbody = ReportVisualizations.container.querySelector('tbody');

		tbody.textContent = null;

		for(const visualization of this.list.values())
			tbody.appendChild(visualization.row);

		if(!this.list.size)
			tbody.innerHTML = '<tr class="NA"><td>No visualizations found!</td></tr>';
	}
}

class ReportVisualization {

	static setup() {

		ReportVisualization.form = ReportVisualizations.preview.querySelector('#visualization-form');
		ReportVisualization.insert.form = ReportVisualizations.container.querySelector('#add-visualization');

		ReportVisualizations.preview.querySelector('#visualization-back').on('click', () => {

			if(history.state)
				return history.back();

			Sections.show('form');

			history.pushState(null, '', `/reports/${Report.selected ? Report.selected.id : ''}`);
		});

		const type = ReportVisualization.insert.form.type;

		for(const visualization of MetaData.visualizations) {

			ReportVisualization.form.type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);

			type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		for(const element of ReportVisualization.form.elements) {
			element.on('change', () => ReportVisualization.form.classList.add('unsaved'));
			element.on('keyup', () => ReportVisualization.form.classList.add('unsaved'));
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

		this.optionsForm = null;
    
		if(ReportVisualization.types.has(this.type))
			this.optionsForm = new (ReportVisualization.types.get(this.type))(this);
	}

	get row() {

		if(this.rowContainer)
			return this.rowContainer;

		const row = this.rowContainer = document.createElement('tr');

		row.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.type}</td>
			<td class="action green"><i class="fa fa-edit"></i></td>
			<td class="action red"><i class="far fa-trash-alt"></i></td>
		`;

		row.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState(null, '', `/visualization/${this.id}`);
		});

		row.querySelector('.red').on('click', () => this.delete());

		return row;
	}

	async edit() {

		const form = ReportVisualization.form;

		form.name.value = this.name;
		form.type.value = this.type;

		form.removeEventListener('submit', ReportVisualization.submitListener);
		form.on('submit', ReportVisualization.submitListener = e => this.update(e));

		try {
			await this.loadPreview();
		} catch(e) {}

		const options = form.querySelector('.options');

		options.textContent = null;

		if(this.optionsForm)
			options.appendChild(this.optionsForm.form);
	}

	async loadPreview() {

		Sections.show('visualization-preview');

		await DataSource.load(true);

		const
			report = new DataSource(DataSource.list.get(this.visualizations.report.query_id)),
			preview = ReportVisualizations.preview.querySelector('.preview');

		const promises = [];

		for(const filter of report.filters.values()) {
			if(filter.dataset)
				promises.push(filter.dataset.load());
		}

		await Promise.all(promises);

		[report.visualizations.selected] = report.visualizations.filter(v => v.visualization_id == this.visualization_id);

		preview.textContent = null;
		preview.appendChild(report.container);

		if(this.optionsForm)
			this.optionsForm.report = report;

		await report.visualizations.selected.load();
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				visualization_id: this.id,
			},
			options = {
				method: 'POST',
				form: new FormData(ReportVisualization.form),
			};

		if(this.optionsForm)
			parameters.options = JSON.stringify(this.optionsForm.json);

		await API.call('reports/visualizations/update', parameters, options);

		await Reports.load(true);

		const report = Reports.list.get(this.visualizations.report.id);

		report.edit();

		await report.visualizations.list.get(this.visualization_id).edit();
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

class ReportVisualizationOptions {

	constructor(visualization) {
		this.visualization = visualization;
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
			<h4>Axes</h4>
			<div class="axes"></div>
			<button class="add-axis" type="button">
				<i class="fa fa-plus"></i> Add New Axis
			</button>
		`;

		const axes = container.querySelector('.axes');

		for(const axis of this.visualization.options ? this.visualization.options.axes : [])
			axes.appendChild(this.axis(axis));

		container.querySelector('.add-axis').on('click', () => {
			axes.appendChild(this.axis());
		});

		return container;
	}

	get json() {

		const response = {
			axes: []
		};

		for(const axis of this.formContainer.querySelectorAll('.axis')) {

			const columns = [];

			for(const option of axis.querySelectorAll('select[name=columns] option:checked'))
				columns.push({key: option.value});

			response.axes.push({
				position: axis.querySelector('select[name=position]').value,
				label: axis.querySelector('input[name=label]').value,
				columns,
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
				<select name="position" value="${axis.position}">
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

			<label>
				<button class="delete" type="button">
					<i class="far fa-trash-alt"></i> Delete
				</button>
			</label>
		`;

		const columns = container.querySelector('select[name=columns]');

		for(const [key, column] of this.report.columns) {

			columns.insertAdjacentHTML('beforeend', `
				<option value="${key}" ${axis.columns && axis.columns.some(c => c.key == key) ? 'selected' : ''}>${column.name}</option>
			`)
		}

		container.querySelector('select[name=position]').value = axis.position;

		container.querySelector('.delete').on('click', () => container.parentElement && container.parentElement.removeChild(container));

		return container;
	}
}

ReportVisualization.types = new Map;

ReportVisualization.types.set('table', class TableOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('line', class LineOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('scatter', class ScatterOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('bubble', class BubbleOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('bar', class BarOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('dualaxisbar', class DualAxisBarOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('stacked', class StackedOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('area', class AreaOptions extends ReportVisualizationLinearOptions {
});

ReportVisualization.types.set('pie', class PieOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('funnel', class FunnelOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('spatialmap', class SpatialMapOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('cohort', class CohortOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('json', class JSONOptions extends ReportVisualizationOptions {
});

ReportVisualization.types.set('bigtext', class BigTextOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.classList.add('subform');

		container.innerHTML = `
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
		`;

		const
			columnSelect = container.querySelector('select[name=column]'),
			valueType = container.querySelector('select[name=valueType]');

		for(const [key, column] of this.report.columns) {

			columnSelect.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		columnSelect.value = (this.visualization.options && this.visualization.options.column) || '';
		valueType.value = (this.visualization.options && this.visualization.options.valueType) || '';

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

ReportVisualization.types.set('livenumber', class LiveNumberOptions extends ReportVisualizationOptions {

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