Page.class = class Dashboards extends Page {

	constructor() {

		super();

		Dashboard.setup(this);

		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

		this.reports.querySelector('.toolbar #back').on('click', async () => {
			await Sections.show('list');
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		this.list = new Map;
		this.list.selectedReports = new Set;

		for(const category of MetaData.categories.values())
			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.category_id}">${category.name}</option>`);

		this.listContainer.form.category.on('change', () => this.renderList());
		this.listContainer.form.search.on('keyup', () => this.renderList());

		this.load();

		window.on('popstate', e => this.load(e.state));
	}

	async load(state) {

		this.list.clear();

		await DataSource.load();

		const dashboards = await API.call('dashboards/list');

		for(const dashboard of dashboards || [])
			this.list.set(dashboard.id, new Dashboard(dashboard, this));

		for(const [id, dashboard] of this.list) {
			if(dashboard.parent && this.list.has(dashboard.parent))
				this.list.get(dashboard.parent).children.add(dashboard);
		}

		const id = state ? state.filter : parseInt(window.location.pathname.split('/').pop());

		this.render();
		this.renderList();

		if(id && this.list.has(id) && window.location.pathname.includes('dashboard'))
			await this.list.get(id).load();

		else if(id && window.location.pathname.includes('report'))
			await this.report(id);

		else
			await Sections.show('list');
	}

	render() {

		const nav = document.querySelector('main > nav');

		nav.textContent = null;

		for(const dashboard of this.list.values()) {
			if(!dashboard.parent)
				nav.appendChild(dashboard.menuItem);
		}

		nav.insertAdjacentHTML('beforeend', `
			<div class="item collapse">
				<div class="label">
					<span class="name left"><i class="fa fa-angle-double-left" aria-hidden="true"></i><span>Collapse Sidebar</span></span>
					<span class="name right hidden"><i class="fa fa-angle-double-right" aria-hidden="true"></i></span>
				</div>
			</div>
		`);

		nav.querySelector('.collapse').on('click', (e) => {

			nav.classList.toggle('collapsed-nav');

			e.currentTarget.querySelector('.left').classList.toggle('hidden');
			e.currentTarget.querySelector('.right').classList.toggle('hidden');
			e.currentTarget.querySelector('.name').classList.toggle('hidden');

			document.querySelector('main').classList.toggle('collapsed-grid');

			for(const item of nav.querySelectorAll('.item')) {
				if(!item.querySelector('.label .name').parentElement.parentElement.parentElement.className.includes('submenu'))
					item.querySelector('.label .name').classList.toggle('hidden');
				item.querySelector('.submenu') ? item.querySelector('.submenu').classList.toggle('collapsed-submenu-bar') : '';
			}

		});

		if(!nav.children.length)
			nav.innerHTML = `<div class="NA">No dashboards found!</div>`;
	}

	renderList() {

		const
			thead = this.listContainer.querySelector('thead'),
			tbody = this.listContainer.querySelector('tbody');

		tbody.textContent = null;

		thead.innerHTML = `
			<tr>
				<th>ID</th>
				<th>Title</th>
				<th>Description</th>
				<th>Tags</th>
				<th>Category</th>
				<th>Visualizations</th>
			</tr>
		`;

		for(const report of DataSource.list.values()) {

			if(!report.is_enabled)
				continue;

			if(this.listContainer.form.category.value && report.category_id != this.listContainer.form.category.value)
				continue;

			if(this.listContainer.form.search.value) {

				let found = false;

				for(const value of [report.query_id, report.name, report.description, report.tags]) {
					if(value && value.toString().toLowerCase().includes(this.listContainer.form.search.value.trim().toLowerCase()))
						found = true;
				}

				if(!found)
					continue;
			}

			const tr = document.createElement('tr');

			let description = report.description ? report.description.split(' ').slice(0, 20) : [];

			if(description.length == 20)
				description.push('&hellip;');

			tr.innerHTML = `
				<td>${report.query_id}</td>
				<td><a href="/report/${report.query_id}" target="_blank" class="link">${report.name}</a></td>
				<td>${description.join(' ') || ''}</td>
				<td>${report.tags || ''}</td>
				<td>${MetaData.categories.has(report.category_id) && MetaData.categories.get(report.category_id).name || ''}</td>
				<td>${report.visualizations.map(v => v.type).filter(t => t != 'table').join(', ')}</td>
			`;

			tr.querySelector('.link').on('click', e => e.stopPropagation());

			tr.on('click', async () => {
				this.report(report.query_id);
				history.pushState({filter: report.query_id}, '', `/report/${report.query_id}`);
			});

			tbody.appendChild(tr);
		}

		if(!tbody.children.length)
			tbody.innerHTML = `<tr class="NA"><td colspan="6">No Reports Found! :(</td></tr>`;
	}

	async report(id) {

		const
			report = new DataSource(DataSource.list.get(id)),
			container = this.reports.querySelector('.list');

		this.list.selectedReports.clear();
		this.list.selectedReports.add(report);

		container.textContent = null;

		const promises = [];

		for(const filter of report.filters.values()) {

			if(filter.dataset)
				promises.push(filter.dataset.load());
		}

		await Promise.all(promises);

		report.container.removeAttribute('style');
		container.classList.add('singleton');
		this.reports.querySelector('.toolbar').classList.add('hidden');

		report.container.querySelector('.menu').classList.remove('hidden');
		report.container.querySelector('.menu-toggle').classList.add('selected');

		report.container.querySelector('.filters').classList.remove('hidden');
		report.container.querySelector('.filters-toggle').classList.add('selected');

		container.appendChild(report.container);

		report.visualizations.selected.load();

		await Sections.show('reports');
	}
}

class Dashboard {

	static setup(page) {

		Dashboard.grid = {
			columns: 8,
			rows: 2,
			rowHeight: 250,
		};

		Dashboard.toolbar = page.container.querySelector('section#reports .toolbar');
		Dashboard.container = page.container.querySelector('section#reports .list');
	}

	constructor(dashboard, page) {

		for(const key in dashboard)
			this[key] = dashboard[key];

		this.children = new Set;

		this.page = page;

		if(!this.format)
			this.format = {};

		if(!this.format.reports)
			this.format.reports = [];

		this.datasets = new DashboardDatasets(this);
	}

	async load(resize) {

		if(!Dashboard.container)
			return;

		for(const selected of document.querySelectorAll('main nav .label.selected'))
			selected.classList.remove('selected');

		this.menuItem.querySelector('.label').classList.add('selected');

		this.page.reports.querySelector('.list').classList.remove('singleton');
		this.page.reports.querySelector('.toolbar').classList.remove('hidden');

		let parent = this.menuItem.parentElement.parentElement;

		while(parent.classList && parent.classList.contains('item')) {
			parent.querySelector('.label').classList.add('selected');
			parent = parent.parentElement.parentElement;
		}

		Dashboard.container.textContent = null;

		this.page.list.selectedReports.clear();

		if(this.format.list) {

			this.page.listContainer.form.category.value = this.format.list.category_id;

			this.page.renderList();
			await Sections.show('list');

			return;
		}

		await this.datasets.load();

		for(const _report of this.reports()) {

			const report = new DataSource(_report);

			for(const filter of report.filters.values()) {

				if(filter.dataset && this.datasets.has(filter.dataset.id))
					await filter.dataset.load();
			}

			report.container.setAttribute('style', `
				order: ${report.dashboard.position || 0};
				grid-column: auto / span ${report.dashboard.width || Dashboard.grid.columns};
				grid-row: auto / span ${report.dashboard.height || Dashboard.grid.rows};
			`);

			if(report.dashboard.visualization) {

				const [visualization] = report.visualizations.filter(v => v.type == report.dashboard.visualization);

				if(visualization)
					report.visualizations.selected = visualization;
			}

			report.container.appendChild(report.visualizations.selected.container);

			Dashboard.container.appendChild(report.container);

			report.visualizations.selected.load(null, resize);

			this.page.list.selectedReports.add(report);
		}

		if(!this.page.list.selectedReports.size)
			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';

		if(this.page.user.privileges.has('reports')) {

			const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

			edit.classList.remove('hidden');
			edit.innerHTML = `<i class="fa fa-edit"></i> Edit`;

			edit.removeEventListener('click', Dashboard.toolbar.editListener);

			edit.on('click', Dashboard.toolbar.editListener = () => this.edit());

			if(Dashboard.editing)
				edit.click();
		}

		await Sections.show('reports');
	}

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

		edit.innerHTML = `<i class="fa fa-save"></i> Save`;

		if(Dashboard.toolbar.editListener)
			edit.removeEventListener('click', Dashboard.toolbar.editListener);

		edit.on('click', Dashboard.toolbar.editListener = () => this.save());

		Dashboard.container.insertAdjacentHTML('beforeend', `
			<section class="data-source add-new" style="order: ${this.page.list.selectedReports.size};">
				Add New Report
			</section>
		`);

		Dashboard.container.querySelector('.data-source.add-new').on('click', async () => {

			const query_id = parseInt(window.prompt('Enter the report ID'));

			if(!query_id || !DataSource.list.has(query_id))
				return;

			this.format.reports.push({
				query_id: parseInt(query_id),
			});

			this.load();
		});

		for(const report of this.page.list.selectedReports) {

			const
				header = report.container.querySelector('header'),
				format = this.format.reports[report.dashboard.position];

			if(!format.width)
				format.width = Dashboard.grid.columns;

			if(!format.height)
				format.height = Dashboard.grid.rows;

			header.insertAdjacentHTML('beforeend', `
				<div class="edit">
					<span class="remove" title="Remove Graph"><i class="fa fa-times"></i></span>
				</div>
			`);

			header.querySelector('.remove').on('click', () => {

				this.format.reports.splice(report.dashboard.position, 1);
				this.page.list.selectedReports.delete(report);
				report.dashboard.position = undefined;

				Dashboard.container.removeChild(report.container);

				this.load(true);
			});

			report.container.setAttribute('draggable', 'true');

			report.container.on('dragstart', e => {
				this.page.list.selectedReports.beingDragged = report;
				e.effectAllowed = 'move';
				report.container.classList.add('being-dragged');
			});

			report.container.on('dragend', e => {

				if(!this.page.list.selectedReports.beingDragged)
					return;

				report.container.classList.remove('being-dragged');
				this.page.list.selectedReports.beingDragged = null;
			});

			report.container.on('dragenter', e => {

				if(!this.page.list.selectedReports.beingDragged)
					return;

				report.container.classList.add('drag-enter');
			});

			report.container.on('dragleave', () =>  {

				if(!this.page.list.selectedReports.beingDragged)
					return;

				report.container.classList.remove('drag-enter');
			});

			// To make the targate droppable
			report.container.on('dragover', e => {

				e.preventDefault();

				if(!this.page.list.selectedReports.beingDragged)
					return;

				e.stopPropagation();

				report.container.classList.add('drag-enter');
			});

			report.container.on('drop', e => {

				report.container.classList.remove('drag-enter');

				if(!this.page.list.selectedReports.beingDragged)
					return;

				if(this.page.list.selectedReports.beingDragged == report)
					return;

				const
					beingDragged = this.page.list.selectedReports.beingDragged,
					format = this.format.reports[beingDragged.dashboard.position];

				this.format.reports.splice(beingDragged.dashboard.position, 1);

				this.format.reports.splice(report.dashboard.position, 0, format);

				this.load(true);
			});

			report.container.insertAdjacentHTML('beforeend', `
				<div class="resize right" draggable="true" title="Resize Graph"></div>
				<div class="resize bottom" draggable="true" title="Resize Graph"></div>
			`);

			const
				right = report.container.querySelector('.resize.right'),
				bottom = report.container.querySelector('.resize.bottom');

			right.on('dragstart', e => {
				e.stopPropagation();
				report.draggingEdge = right;
				this.page.list.selectedReports.beingResized = report
			});

			right.on('dragend', e => {
				e.stopPropagation();
				this.page.list.selectedReports.beingResized = null;
			});

			bottom.on('dragstart', e => {
				e.stopPropagation();
				report.draggingEdge = bottom;
				this.page.list.selectedReports.beingResized = report
			});

			bottom.on('dragend', e => {
				e.stopPropagation();
				this.page.list.selectedReports.beingResized = null;
			});
		}

		Dashboard.container.on('dragover', e => {

			e.preventDefault();
			e.stopPropagation();

			const report = this.page.list.selectedReports.beingResized;

			if(!report)
				return;

			const format = this.format.reports[report.dashboard.position];

			if(report.draggingEdge.classList.contains('right')) {

				const
					column = getColumn(e.clientX) + 1,
					columnStart = getColumn(report.container.offsetLeft);

				if(column <= columnStart)
					return;

				format.width = column - columnStart;
			}

			if(report.draggingEdge.classList.contains('bottom')) {

				const
					row = getRow(e.clientY) + 1,
					rowStart = getRow(report.container.offsetTop);

				if(row <= rowStart)
					return;

				format.height = row - rowStart;
			}

			if(
				format.width != report.container.style.gridColumnEnd.split(' ')[1] ||
				format.height != report.container.style.gridRowEnd.split(' ')[1]
			) {

				report.container.setAttribute('style', `
					order: ${report.dashboard.position || 0};
					grid-column: auto / span ${format.width || Dashboard.grid.columns};
					grid-row: auto / span ${format.height || Dashboard.grid.rows};
				`);

				report.visualizations.selected.render(true);
			}
		});

		function getColumn(position) {
			return Math.floor(
				(position - Dashboard.container.offsetLeft) /
				((Dashboard.container.clientWidth / Dashboard.grid.columns) + 10)
			);
		}

		function getRow(position) {
			return Math.floor((position - Dashboard.container.offsetTop) / Dashboard.grid.rowHeight);
		}
	}

	async save() {

		Dashboard.editing = false;

		const
			parameters = {
				id: this.id,
				format: JSON.stringify(this.format),
			},
			options = {
				method: 'POST',
			};

		await API.call('dashboards/updateFormat', parameters, options);

		await this.page.list.get(this.id).load();
	}

	get menuItem() {

        if (this.container)
            return this.container;

		function getReports(dashboard) {

			let reports = Array.from(dashboard.reports());

			for(const child of dashboard.children)
                reports = reports.concat(getReports(child));

			return reports;
		}

		const
			container = this.container = document.createElement('div'),
			icon = this.icon ? `<img src="${this.icon}" height="20" width="20">` : '';

		container.classList.add('item');

        if(!getReports(this).length && !this.page.user.privileges.has('report'))
            container.classList.add('hidden');

		container.innerHTML = `
			<div class="label">
				${icon}
				<span class="name">${this.name}</span>
				${this.children.size ? '<span class="angle down"><i class="fa fa-angle-down"></i></span>' : ''}
			</div>
			${this.children.size ? '<div class="submenu hidden"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');

		container.querySelector('.label').on('click', () => {

			if(this.children.size) {
				container.querySelector('.angle').classList.toggle('down');
				submenu.classList.toggle('hidden');
			}

			else {
				history.pushState({what: this.id, type: 'dashboard'}, '', `/dashboard/${this.id}`);
				this.load();
			}
		});


		for(const child of this.children)
			submenu.appendChild(child.menuItem);

		return container;
	}

	* reports() {

		if(this.format && this.format.reports && this.format.reports.length) {

			for(const [position, _report] of this.format.reports.entries()) {

				if(!DataSource.list.has(_report.query_id))
					continue;

				const report = JSON.parse(JSON.stringify(DataSource.list.get(_report.query_id)));

				report.dashboard = JSON.parse(JSON.stringify(_report));
				report.dashboard.position = position;

				yield report;
			}
		}
	}
}

class DashboardDatasets extends Map {

	constructor(dashboard) {

		super();

		this.dashboard = dashboard;
		this.page = this.dashboard.page;

		const datasets = {};

		for(const report of this.dashboard.reports()) {

			for(const filter of report.filters || []) {

				if(!filter.dataset)
					continue;

				if(!datasets[filter.dataset]) {
					datasets[filter.dataset] = {
						id: filter.dataset,
						multiple: true,
						placeholder: `dataset-${filter.dataset}`,
					}
				}

				if(!filter.multiple)
					datasets[filter.dataset].multiple = false;
			}
		}

		for(const dataset of Object.values(datasets))
			this.set(dataset.id, new Dataset(dataset.id, dataset));
	}

	async load() {

		await this.fetch();

		await this.render();
	}

	async fetch() {

		const promises = [];

		for(const dataset of this.values())
			promises.push(dataset.fetch());

		await Promise.all(promises);
	}

	async render() {

		const container = Dashboard.toolbar.querySelector('.datasets');

		container.textContent = null;

		if(!this.size)
			return;

		for(const dataset of this.values()) {

			const
				label = document.createElement('label'),
				input = document.createElement('select');

			label.classList.add('dataset-container');

			label.insertAdjacentHTML('beforeend', `<span>${dataset.name}</span>`);

			if(!['Program','Region','Market','Bid Zone'].includes(dataset.name))
				label.classList.add('hidden');

			label.appendChild(dataset.container);

			container.appendChild(label);
		}

		container.insertAdjacentHTML('beforeend', `
			<div class="actions">
				<button class="apply" title="Apply Filters"><i class="fas fa-paper-plane"></i> Apply</button>
				<button class="more icon" title="More Filters"><i class="fas fa-filter"></i></button>
				<button class="reload icon" title="Fore Refresh"><i class="fas fa-sync"></i></button>
				<button class="reset icon" title="Check All Filters"><i class="far fa-check-square"></i></button>
				<button class="clear icon" title="Clear All Filters"><i class="far fa-square"></i></button>
			</div>
		`);

		container.querySelector('button.apply').on('click', () => this.apply());
		container.querySelector('button.reload').on('click', () => this.apply());
		container.querySelector('button.reset').on('click', () => this.all());
		container.querySelector('button.clear').on('click', () => this.clear());

		container.querySelector('button.more').on('click', () => {

			container.querySelector('button.more').classList.add('hidden');
			for(const dataset of container.querySelectorAll('label.hidden'))
				dataset.classList.remove('hidden');
		});
	}

	apply() {

		for(const report of this.page.list.selectedReports) {

			let found = false;

			for(const filter of report.filters.values()) {

				if(!filter.dataset || !this.has(filter.dataset.id))
					continue;

				filter.dataset.value = this.get(filter.dataset.id);

				found = true;
			}

			if(found) {
				report.visualizations.selected.load();
				report.container.style.opacity = 1;
			}

			else
				report.container.style.opacity = 0.4;
		}
	}

	clear() {

		for(const dataset of this.values())
			dataset.clear();
	}

	all() {

		for(const dataset of this.values())
			dataset.all();
	}
}