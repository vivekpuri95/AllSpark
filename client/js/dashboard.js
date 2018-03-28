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
			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.id}">${category.name}</option>`);

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
				<td><a href="#/app/reports-new/${report.query_id}" target="_blank">${report.name}</a></td>
				<td>${description.join(' ') || ''}</td>
				<td>${report.tags || ''}</td>
				<td>${MetaData.categories.has(report.category_id) && MetaData.categories.get(report.category_id).name || ''}</td>
				<td>${report.visualizations.map(v => v.type).filter(t => t != 'table').join(', ')}</td>
			`;

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

		report.container.removeAttribute('style');
		report.container.classList.add('singleton');

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
		};

		Dashboard.toolbar = page.container.querySelector('section#reports .toolbar');
		Dashboard.container = page.container.querySelector('section#reports .list');

		if(page.user.privileges.has('reports'))
			Dashboard.toolbar.insertAdjacentHTML('beforeend', `<button class="edit-dashboard hidden"></button>`);

		$('#reports .toolbar input[name="date-range"]').daterangepicker({
			opens: 'left',
			ranges: {
				'Last 7 Days': [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()],
				'Last 15 Days': [new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), new Date()],
				'Last 30 Days': [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
				'Last 90 Days': [new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()],
				'Last 1 Year': [new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()],
			},
			locale: {
				format: 'MMMM D, YYYY'
			}
		});

		$('#reports .toolbar input[name="date-range"]').on('apply.daterangepicker', (e, picker) => {

			for(const source of page.list.selectedReports) {

				const
					start = Array.from(source.filters.values()).filter(f => f.name == 'Start Date')[0],
					end = Array.from(source.filters.values()).filter(f => f.name == 'End Date')[0];

				if(!start || !end)
					continue;

				start.label.querySelector('input').value = picker.startDate.format('YYYY-MM-DD');
				end.label.querySelector('input').value = picker.endDate.format('YYYY-MM-DD');

				source.visualizations.selected.load();
			}
		});
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
	}

	async load() {

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

		this.page.list.selectedReports.clear();

		if(this.format && this.format.reports && this.format.reports.length) {

			for(const [position, _report] of this.format.reports.entries()) {

				if(!DataSource.list.has(_report.query_id))
					continue;

				const source = JSON.parse(JSON.stringify(DataSource.list.get(_report.query_id)));

				source.postProcessor = _report.postProcessor;

				const report = new DataSource(source);

				report.dashboardPosition = position;

				report.container.setAttribute('style', `
					order: ${position || 0};
					grid-column: auto / span ${_report.width || Dashboard.grid.columns};
					grid-row: auto / span ${_report.height || Dashboard.grid.rows};
				`);

				if(_report.visualization) {

					const [visualization] = report.visualizations.filter(v => v.type == _report.visualization);

					if(visualization)
						report.visualizations.selected = visualization;
				}

				report.visualizations.selected.load();

				report.container.appendChild(report.visualizations.selected.container);

				Dashboard.container.appendChild(report.container);

				this.page.list.selectedReports.add(report);
			}
		} else {
			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';
		}

		if(this.page.user.privileges.has('reports')) {

			const edit = Dashboard.toolbar.querySelector('.edit-dashboard');

			edit.classList.remove('hidden');

			edit.innerHTML = `<i class="fa fa-edit"></i> Edit`;

			if(Dashboard.toolbar.editListener)
				edit.removeEventListener('click', Dashboard.toolbar.editListener);

			edit.on('click', Dashboard.toolbar.editListener = () => this.edit());

			if(Dashboard.editing)
				edit.click();
		}

		Dashboard.resizeHint = document.createElement('div');
		Dashboard.resizeHint.classList.add('resize-hint', 'hidden');
		Dashboard.container.appendChild(Dashboard.resizeHint);

		await Sections.show('reports');
	}

	async render() {

		if(!Dashboard.container)
			return;

		for(const report of this.page.list.selectedReports) {

			const
				format = this.format.reports[report.dashboardPosition],
				position = this.format.reports.indexOf(format);

			report.container.setAttribute('style', `
				order: ${position || 0};
				grid-column: auto / span ${format.width || Dashboard.grid.columns};
				grid-row: auto / span ${format.height || Dashboard.grid.rows};
			`);

			report.visualizations.selected.render();
		}
	}

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('.edit-dashboard');

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
				format = this.format.reports[report.dashboardPosition];

			if(!format.width)
				format.width = Dashboard.grid.columns;

			if(!format.height)
				format.height = Dashboard.grid.rows;

			header.insertAdjacentHTML('beforeend', `
				<div class="edit">
					<button class="remove" title="Remove Graph"><i class="fa fa-times"></i></button>
				</div>
			`);

			header.querySelector('.remove').on('click', () => {

				this.format.reports.splice(report.dashboardPosition, 1);
				this.page.list.selectedReports.delete(report);
				report.dashboardPosition = undefined;

				Dashboard.container.removeChild(report.container);

				this.load();
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
					format = this.format.reports[beingDragged.dashboardPosition];

				this.format.reports.splice(beingDragged.dashboardPosition, 1);

				this.format.reports.splice(report.dashboardPosition, 0, format);

				this.load();
			});

			report.container.insertAdjacentHTML('beforeend', `
				<div class="resize left" draggable="true"></div>
				<div class="resize right" draggable="true"></div>
			`);

			const
				left = report.container.querySelector('.resize.left'),
				right = report.container.querySelector('.resize.right');

			left.on('dragstart', e => {
				e.stopPropagation();
				report.draggingEdge = left;
				this.page.list.selectedReports.beingResized = report;
			});

			right.on('dragstart', e => {
				e.stopPropagation();
				report.draggingEdge = right;
				this.page.list.selectedReports.beingResized = report
			});

			left.on('dragend', e => {
				e.stopPropagation();
				this.page.list.selectedReports.beingResized = null;
				Dashboard.resizeHint.classList.add('hidden');
			});

			right.on('dragend', e => {
				e.stopPropagation();
				this.page.list.selectedReports.beingResized = null;
				Dashboard.resizeHint.classList.add('hidden');
			});
		}

		Dashboard.container.on('dragover', e => {

			e.preventDefault();

			const report = this.page.list.selectedReports.beingResized;

			if(!report)
				return;

			const
				format = this.format.reports[report.dashboardPosition],
				column = getColumn(e.clientX) + 1,
				reportStart = getColumn(report.container.offsetLeft),
				reportEnd = getColumn(report.container.offsetLeft + report.container.clientWidth);

			Dashboard.resizeHint.classList.remove('hidden');
			Dashboard.resizeHint.style.left = ((column * ((Dashboard.container.clientWidth / Dashboard.grid.columns) + 10)) + 8) + 'px';
		});

		Dashboard.container.on('drop', e => {

			const report = this.page.list.selectedReports.beingResized;

			if(!report)
				return;

			const
				format = this.format.reports[report.dashboardPosition],
				column = getColumn(e.clientX) + 1,
				reportStart = getColumn(report.container.offsetLeft),
				reportEnd = getColumn(report.container.offsetLeft + report.container.clientWidth);

			if(report.draggingEdge.classList.contains('left')) {

				if(column >= reportEnd)
					return;

				format.width = reportEnd - column;
			}

			if(report.draggingEdge.classList.contains('right')) {

				if(column <= reportStart)
					return;

				format.width = column - reportStart;
			}

			if(Dashboard.resizeTimeout)
				clearTimeout(Dashboard.resizeTimeout);

			Dashboard.resizeHint.classList.add('hidden');

			Dashboard.resizeTimeout = setTimeout(() => this.render(), 300);
		});

		function getColumn(position) {
			return Math.floor(
				(position - Dashboard.container.offsetLeft) /
				((Dashboard.container.clientWidth / Dashboard.grid.columns) + 10)
			) + 1;
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
				this.load();
			}
		});

		for(const child of this.children)
			submenu.appendChild(child.menuItem);

		return container;
	}
}