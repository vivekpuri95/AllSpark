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

		await DataSource.load(true);

		const dashboards = await API.call('dashboards/list');

		const dummyDashboard = {
			"id": -1,
			"account_id": account.account_id,
			"name": "dummy",
			"parent": null,
			"icon": null,
			"status": 1,
			"visibility": "public",
			"added_by": null,
			"roles": null,
			"format": {},
			"created_at": "",
			"updated_at": "",
			"shared_user": [],
			"visualizations": []
		};

		const
			privateDashboard = {...JSON.parse(JSON.stringify(dummyDashboard)), name: "Private Dashboards", id: -1},
			sharedWithMeDashboard = {...JSON.parse(JSON.stringify(dummyDashboard)), name: "Shared With Me", id: -2};

		for (const dashboard of dashboards) {

			if ((dashboard.added_by === user.user_id || dashboard.added_by === null) && dashboard.visibility === "private" && dashboard.parent === null) {

				dashboard.parent = privateDashboard.id;
			}

			else if (dashboard.added_by !== user.user_id && dashboard.visibility === "private" && dashboard.parent === null) {

				dashboard.parent = sharedWithMeDashboard.id;
			}

			dashboard.format.reports.sort((a, b) => parseInt(a.position) - parseInt(b.position))
		}
    
		for(const dashboard of dashboards || [])
			this.list.set(dashboard.id, new Dashboard(dashboard, this));

		this.list.set(privateDashboard.id, new Dashboard(privateDashboard, this));
		this.list.set(sharedWithMeDashboard.id, new Dashboard(sharedWithMeDashboard, this));

		for(const [id, dashboard] of this.list) {
			if(dashboard.parent && this.list.has(dashboard.parent))
				this.list.get(dashboard.parent).children.add(dashboard);
		}

		const id = state ? state.filter : parseInt(window.location.pathname.split('/').pop());

		this.render();
		this.renderList();

		if(window.location.pathname.endsWith('first') && this.list.size) {

			if(localStorage.lastOpenedDashboard && this.list.has(localStorage.lastOpenedDashboard))
				await this.list.get(localStorage.lastOpenedDashboard).load();

			else await Array.from(this.list.values())[0].load();
		}

		else if(id && this.list.has(id) && window.location.pathname.includes('dashboard'))
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

			const right = e.currentTarget.querySelector('.right')

			e.currentTarget.querySelector('.left').classList.toggle('hidden');

			right.classList.toggle('hidden');

			e.currentTarget.querySelector('.name').classList.toggle('hidden');

			document.querySelector('main').classList.toggle('collapsed-grid');

			for(const item of nav.querySelectorAll('.item')) {

				if(!right.hidden) {
					item.classList.remove('list-open');
				}

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

		const side_button = page.container.querySelector('#reports .side');
		const container = page.container.querySelector('#reports #blanket');

		side_button.on('click', () => {

			container.classList.remove('hidden');
			page.container.querySelector('#reports .datasets').classList.add('show');
		});

		container.on('click', () => {

			container.classList.add('hidden');
			page.container.querySelector('#reports .datasets').classList.remove('show');
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

		this.format.reports = this.format.reports.sort((a, b) => a.position - b.position);

		this.datasets = new DashboardDatasets(this);
	}

	async load(resize) {

		this.lastOpenedDashboard = this.id;

		if(!Dashboard.container)
			return;

		this.page.container.querySelector('#reports .side').classList.remove('hidden');

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

		Sections.show('reports');

		await this.datasets.load();
		let reportPositionObject = {};
		for(const report of this.reports) {

			report.container.setAttribute('style', `
				order: ${report.dashboard.position || 0};
				grid-column: auto / span ${report.dashboard.width || Dashboard.grid.columns};
				grid-row: auto / span ${report.dashboard.height || Dashboard.grid.rows};
			`);

			if(report.dashboard.visualization_id) {

				const [visualization] = report.visualizations.filter(v => v.visualization_id == report.dashboard.visualization_id);

				if(visualization)
					report.visualizations.selected = visualization;
			}

			report.container.appendChild(report.visualizations.selected.container);

			Dashboard.container.appendChild(report.container);

			reportPositionObject[report.query_id] = ({
				position: report.container.getBoundingClientRect().y,
				loaded: false,
				report: report
			});

			this.page.list.selectedReports.add(report);
		}

		const mainObject = document.querySelector("main");

		let maxScrollHeightAchieved = Math.max(screen.availHeight, mainObject.scrollTop);

		Dashboard.loadReportsBasedOnScreenHeight(reportPositionObject, maxScrollHeightAchieved, resize, screen.availHeight);


		mainObject.addEventListener("scroll", () => {

			for(const report of this.reports) {
				reportPositionObject[report.query_id].position = report.container.getBoundingClientRect().y;
			}
			maxScrollHeightAchieved = Math.max(mainObject.scrollTop, maxScrollHeightAchieved);
			Dashboard.loadReportsBasedOnScreenHeight(reportPositionObject, maxScrollHeightAchieved, resize, screen.availHeight);
			},
			{passive: true}
			);

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

		const configure = Dashboard.toolbar.querySelector('#configure');
		configure.on('click', () => location.href = `/dashboards/${this.id}`);
		configure.classList.remove('hidden');


		const exportButton = Dashboard.toolbar.querySelector('#export-dashboard');
		exportButton.classList.remove('hidden');

		exportButton.removeEventListener('click', Dashboard.toolbar.exportListener);

		exportButton.on('click', Dashboard.toolbar.exportListener = () => {
			const jsonFile = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.export));

			const downloadAnchor = document.createElement('a');
			downloadAnchor.setAttribute('href', jsonFile);
			downloadAnchor.setAttribute('download', 'dashboard.json');
			downloadAnchor.click();
		});

		Dashboard.toolbar.querySelector('#mailto').classList.remove('selected');
		this.page.reports.querySelector('.mailto-content').classList.add('hidden');

		const mailto = Dashboard.toolbar.querySelector('#mailto');
		mailto.classList.remove('hidden');

		if(Dashboard.mail_listener)
			mailto.removeEventListener('click', Dashboard.mail_listener);

		mailto.on('click', Dashboard.mail_listener = () => {
			mailto.classList.toggle('selected');
			this.mailto();
		});

		if(!this.datasets.size)
			this.page.container.querySelector('#reports .side').classList.add('hidden');
	}

	static loadReportsBasedOnScreenHeight(reportPositionObject, heightScrolled, resize, offset=500) {
		for(const report in reportPositionObject) {

			if((parseInt(reportPositionObject[report].position) < heightScrolled + offset) && !reportPositionObject[report].loaded) {
				reportPositionObject[report].report.visualizations.selected.load(null, resize);
				reportPositionObject[report].loaded = true;
			}
		}
	}

	mailto() {

		const form = this.page.reports.querySelector('.mailto-content');
		form.classList.toggle('hidden');

		form.subject.value = this.name;
		form.body.value = location.href;

		form.on('submit', (e) => {

			e.preventDefault();

			const searchParams = new URLSearchParams();
			searchParams.set('subject', form.subject.value);
			searchParams.set('body', form.body.value);

			const a = document.createElement('a');
			a.setAttribute('href',`mailto: ${form.email.value}?${searchParams}`);

			a.click();
		})
	}

	get export() {

		const data = {
			dashboard: {
				name: this.name,
				parent: this.parent,
				type: this.type,
				icon: this.icon,
				status: this.status,
				roles: this.roles,
				format: this.format
			},
			query: []
		};

		for (const report of this.format.reports){
			data.query.push(DataSource.list.get(report.query_id));
		}

		return data;
	}

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

		edit.innerHTML = `<i class="fa fa-save"></i> Save`;

		if(Dashboard.toolbar.editListener)
			edit.removeEventListener('click', Dashboard.toolbar.editListener);

		edit.on('click', Dashboard.toolbar.editListener = () => this.save());

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
					<span class="move-up" title="Move visualization up"><i class="fas fa-angle-up"></i></span>
					<span class="move-down" title="Move visualization down"><i class="fas fa-angle-down"></i></span>
				</div>
			`);

			header.querySelector('.move-up').on('click', () => {

				const [current] = this.format.reports.filter(r => r.visualization_id == report.visualizations.selected.visualization_id);

				let previous = null;

				for(let i = 0; i < this.format.reports.length; i++) {

					if(this.format.reports[i] == current)
						previous = this.format.reports[i - 1];
				}

				if(!previous)
					return;

				current.format.position = Math.max(1, current.format.position - 1);
				previous.format.position = Math.min(this.format.reports.length, previous.format.position + 1);

				const
					currentParameters = {
						id: current.id,
						format: JSON.stringify(current.format),
					},
					currentOptions = {
						method: 'POST',
					};

				API.call('reports/dashboard/update', currentParameters, currentOptions);

				const
					previousParameters = {
						id: previous.id,
						format: JSON.stringify(previous.format),
					},
					previousOptions = {
						method: 'POST',
					};

				API.call('reports/dashboard/update', previousParameters, previousOptions);

				this.page.load();
			});

			header.querySelector('.move-down').on('click', () => {

				const [current] = this.format.reports.filter(r => r.visualization_id == report.visualizations.selected.visualization_id);

				let next = null;
				for(let i = 0; i < this.format.reports.length; i++) {

					if(this.format.reports[i] == current)
						next = this.format.reports[i + 1];
				}

				if(!next)
					return;

				current.format.position = Math.min(this.format.reports.length, current.format.position + 1);
				next.format.position = Math.max(1, next.format.position - 1);

				const
					currentParameters = {
						id: current.id,
						format: JSON.stringify(current.format),
					},
					currentOptions = {
						method: 'POST',
					};

				API.call('reports/dashboard/update', currentParameters, currentOptions);

				const
					nextParameters = {
						id: next.id,
						format: JSON.stringify(next.format),
					},
					nextOptions = {
						method: 'POST',
					};

				API.call('reports/dashboard/update', nextParameters, nextOptions);

				this.page.load();
			});

			header.querySelector('.remove').on('click', () => {

				const
					parameters = {
						id: this.format.reports.filter(r => r.visualization_id == report.visualizations.selected.visualization_id)[0].id,
					},
					options = {
						method: 'POST',
					};

				API.call('reports/dashboard/delete', parameters, options);

				this.page.load();
			});

			// report.container.setAttribute('draggable', 'true');

			// report.container.on('dragstart', e => {
			// 	this.page.list.selectedReports.beingDragged = report;
			// 	e.effectAllowed = 'move';
			// 	report.container.classList.add('being-dragged');
			// });

			// report.container.on('dragend', e => {

			// 	if(!this.page.list.selectedReports.beingDragged)
			// 		return;

			// 	report.container.classList.remove('being-dragged');
			// 	this.page.list.selectedReports.beingDragged = null;
			// });

			// report.container.on('dragenter', e => {

			// 	if(!this.page.list.selectedReports.beingDragged)
			// 		return;

			// 	report.container.classList.add('drag-enter');
			// });

			// report.container.on('dragleave', () =>  {

			// 	if(!this.page.list.selectedReports.beingDragged)
			// 		return;

			// 	report.container.classList.remove('drag-enter');
			// });

			// // To make the targate droppable
			// report.container.on('dragover', e => {

			// 	e.preventDefault();

			// 	if(!this.page.list.selectedReports.beingDragged)
			// 		return;

			// 	e.stopPropagation();

			// 	report.container.classList.add('drag-enter');
			// });

			// report.container.on('drop', e => {

			// 	report.container.classList.remove('drag-enter');

			// 	if(!this.page.list.selectedReports.beingDragged)
			// 		return;

			// 	if(this.page.list.selectedReports.beingDragged == report)
			// 		return;

			// 	const
			// 		beingDragged = this.page.list.selectedReports.beingDragged,
			// 		format = this.format.reports[beingDragged.dashboard.position];

			// 	this.format.reports.splice(beingDragged.dashboard.position, 1);

			// 	this.format.reports.splice(report.dashboard.position, 0, format);

			// 	this.load(true);
			// });

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

		await API.call('dashboards/update', parameters, options);

		await this.page.list.get(this.id).load();
	}

	get menuItem() {

		if (this.container)
			return this.container;

		function getReports(dashboard) {

			let reports = Array.from(dashboard.reports);

			for(const child of dashboard.children)
				reports = reports.concat(getReports(child));

			return reports;
		}

		const container = this.container = document.createElement('div');

		let icon;

		if(this.icon && this.icon.startsWith('http')) {
			icon = `<img src="${this.icon}" height="20" width="20">`;
		}

		else if(this.icon && this.icon.startsWith('fa')){
			icon = `<i class="${this.icon}"></i>`
		}
		else
			icon = '';

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

			if(container.querySelector('.collapsed-submenu-bar')) {

				for(const item of container.parentElement.querySelectorAll('.item')) {

					item.classList.remove('list-open');
					if(item == container) {
						container.classList.add('list-open');
						continue;
					}

					if(item.querySelector('.submenu')) {
						item.querySelector('.angle').classList.add('down');
						item.querySelector('.submenu').classList.add('hidden');
					}
				}
			}

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

	get reports() {

		if(this.reportsList)
			return this.reportsList;

		this.reportsList = new Set;

		if(this.format && this.format.reports && this.format.reports.length) {

			for(const [position, _report] of this.format.reports.entries()) {

				if(!DataSource.list.has(_report.query_id))
					continue;

				const report = JSON.parse(JSON.stringify(DataSource.list.get(_report.query_id)));

				report.dashboard = JSON.parse(JSON.stringify(_report));
				report.dashboard.position = position;

				this.reportsList.add(new DataSource(report));
			}
		}

		return this.reportsList;
	}
}

class DashboardDatasets extends Map {

	constructor(dashboard) {

		super();

		this.dashboard = dashboard;
		this.page = this.dashboard.page;
		this.container = this.page.container.querySelector('#reports .datasets');

		const datasets = {};

		for(const report of this.dashboard.reports) {

			for(const filter of report.filters.values()) {

				if(!filter.dataset)
					continue;

				if(!datasets[filter.dataset.id]) {
					datasets[filter.dataset.id] = {
						id: filter.dataset.id,
						multiple: true,
						placeholder: `dataset-${filter.dataset.id}`,
					}
				}

				if(!filter.multiple)
					datasets[filter.dataset.id].multiple = false;
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

		const container = this.container;

		container.textContent = null;

		container.classList.remove('show');

		if(!this.size)
			return;

		container.innerHTML = '<h3>Global Filters</h3>';

		let counter = 1;

		for(const dataset of this.values()) {

			const
				label = document.createElement('label'),
				input = document.createElement('select');

			label.classList.add('dataset-container');

			label.insertAdjacentHTML('beforeend', `<span>${dataset.name}</span>`);

			if(counter++ > 4)
				label.classList.add('hidden');

			label.appendChild(dataset.container);

			container.appendChild(label);
		}

		container.insertAdjacentHTML('beforeend', `
			<div class="actions">
				<button class="apply" title="Apply Filters"><i class="fas fa-paper-plane"></i> Apply</button>
				<button class="more icon" title="More Filters"><i class="fas fa-filter"></i></button>
				<button class="reload icon" title="Fore Refresh"><i class="fas fa-sync"></i></button>
				<button class="reset-toggle clear icon" title="Clear All Filters"><i class="far fa-check-square"></i></button>
			</div>
		`);

		container.querySelector('button.apply').on('click', () => this.apply());
		container.querySelector('button.reload').on('click', () => this.apply());

		const resetToggle = container.querySelector('button.reset-toggle');

		resetToggle.on('click', () => {

			if(resetToggle.classList.contains('check')) {

				this.all();

				resetToggle.classList.remove('check');
				resetToggle.classList.add('clear');

				resetToggle.title = 'Clear All Filters';
				resetToggle.innerHTML = `<i class="far fa-check-square"></i>`;
			} else {

				this.clear();

				resetToggle.classList.add('check');
				resetToggle.classList.remove('clear');

				resetToggle.title = 'Check All Filters';
				resetToggle.innerHTML = `<i class="far fa-square"></i>`;
			}
		});

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