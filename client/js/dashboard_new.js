Page.class = class Dashboards extends Page {

	constructor() {

		super();

		this.list = new Map;
		this.loadedVisualizations = new Map;
		this.nav = document.querySelector('main > nav');

		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

		if (this.account.settings.get('disable_footer')) {

			this.container.parentElement.querySelector('main > footer').classList.add('hidden');
		}

		this.reports.querySelector('.toolbar #back').on('click', async () => {
			await Sections.show('list');
			this.renderList();
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		for (const category of MetaData.categories.values()) {

			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.category_id}">${category.name}</option>`);
		}

		this.listContainer.form.category.on('change', () => this.renderList());
		this.listContainer.form.search.on('keyup', () => this.renderList());

		window.on('popstate', e => this.load(e.state));
	}

	async load() {

		const dashboards = API.call('dashboards/list');

		for (const dashboard of dashboards) {

			dashboard.children = new Set;
			this.list.set(dashboard.id, new Dashboard(dashboard, this));
		}

		for (const dashboard of dashboards) {

			if (parseInt(dashboard.parent)) {

				dashboard.children.add(this.list.get(dashboard.parent).id);
			}
		}
	}

	async nav() {

		let search = this.nav.querySelector('dashboard-search');

		search.on('keyup', () => {

			const searchItem = search.querySelector("input[name='search']").value;

			this.sync(0);

			if (!searchItem.length) {

				return this.sync(0);
			}

			let matchingIds = [];

			for (const dashboard of this.list.values()) {

				if (dashboard.name.toLowerCase().includes(searchItem.toLowerCase())) {

					matchingIds = matchingIds.concat(this.parentList(dashboard.id).map(x => '#dashboard-' + x));
					this.nav.querySelector("#dashboard-" + dashboard.id).parentNode.querySelector(".label").classList.add("selected")
				}
			}
			let toShowItems = [];

			try {
				toShowItems = this.nav.querySelectorAll([...new Set(matchingIds)].join(", "));
			}
			catch (e) {
			}

			for (const item of toShowItems) {

				const hasHidden = item.parentNode.querySelector(".submenu");

				if (hasHidden) {

					hasHidden.classList.remove("hidden");
				}

				item.querySelector(".angle") ? item.querySelector(".angle").classList.add("down") : {};
			}
		});

		for (const dashboard of this.list.values()) {

			if (!dashboard.parent) {

				let menuItem = dashboard.menuItem;
				menuItem.classList.add("parentDashboard");
				const label = menuItem.querySelector(".label");

				label.on("click", () => {

					this.closeOtherDropDowns(label.id, nav);

					let currentDashboard = window.location.pathname.split("/");

					if (currentDashboard.includes("dashboard")) {

						currentDashboard = currentDashboard.pop();
						currentDashboard = nav.querySelector(`#dashboard-${currentDashboard}`);

						if (currentDashboard)
							currentDashboard.classList.add("selected");
					}
				});

				if (showLabelIds.includes(dashboard.id)) {

					for (const elem of menuItem.querySelectorAll(".submenu")) {

						elem.classList.remove("hidden");
					}

					for (const elem of menuItem.querySelectorAll(".label")) {

						const angle = elem.querySelector(".angle");

						if (angle) {

							angle.classList.add("down");
						}
					}
				}

				nav.appendChild(menuItem);
			}
		}

		nav.insertAdjacentHTML('beforeend', `
			<footer>
				<div class="collapse-panel">
					<span class="left"><i class="fa fa-angle-double-left"></i></span>
					<span class="right hidden"><i class="fa fa-angle-double-right"></i></span>
				</div>
			</footer>
		`);

		nav.querySelector('.collapse-panel').on('click', () => this.collapseNav());

		if (!nav.children.length)
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

		for (const report of DataSource.list.values()) {

			if (!report.is_enabled || report.is_deleted) {

				continue;
			}

			if (this.listContainer.form.category.value && report.category_id != this.listContainer.form.category.value) {

				continue;
			}

			if (this.listContainer.form.search.value) {

				let found = false;

				const searchItems = this.listContainer.form.search.value.split(" ").filter(x => x).slice(0, 5);


				for (const searchItem of searchItems) {

					const searchableText = report.query_id + " " + report.name + " " + report.description + " " + report.tags;

					found = searchableText.toLowerCase().includes(searchItem.toLowerCase());

					if (found) {

						break;
					}
				}

				if (!found) {

					continue;
				}
			}

			const tr = document.createElement('tr');

			let description = report.description ? report.description.split(' ').slice(0, 20) : [];

			if (description.length === 20) {

				description.push('&hellip;');
			}

			let tags = report.tags ? report.tags.split(',') : [];

			tags = tags.map(tag => {

				const a = document.createElement('a');
				a.classList.add('tag');
				a.textContent = tag.trim();

				a.on('click', e => this.tagSearch(e));

				return a;
			});

			tr.innerHTML = `
				<td>${report.query_id}</td>
				<td><a href="/report/${report.query_id}" target="_blank" class="link">${report.name}</a></td>
				<td>${description.join(' ') || ''}</td>
				<td class="tags"></td>
				<td>${MetaData.categories.has(report.category_id) && MetaData.categories.get(report.category_id).name || ''}</td>
				<td>${report.visualizations.map(v => v.type).filter(t => t != 'table').join(', ')}</td>
			`;

			for (const tag of tags)
				tr.querySelector('.tags').appendChild(tag);

			tr.querySelector('.link').on('click', e => e.stopPropagation());

			tr.on('click', async () => {
				this.report(report.query_id);
				history.pushState({filter: report.query_id}, '', `/report/${report.query_id}`);
			});

			tbody.appendChild(tr);
		}

		if (!tbody.children.length)
			tbody.innerHTML = `<tr class="NA no-reports"><td colspan="6">No Reports Found! :(</td></tr>`;
	}

	sync(dashboardId, nav = true) {

		if (dashboardId) {

			this.list.get(dashboardId).load();
			this.list.get(dashboardId).render();
		}

		if (nav) {

			let parentDashboards = this.parents(dashboardId || 0).map(x => `dashboard-${x}`);

			for (const label of this.nav.querySelectorAll('.label')) {

				label.parentElement.querySelector('.submenu').classList.add('hidden');
				//arrow revert
			}

			for (const element of parentDashboards) {

				const submenu = this.nav.querySelector(`#${element}`).parentElement.querySelector('.submenu');
				submenu.classList.remove('hidden');
			}
		}
	}

	parents(id) {

		let dashboard = this.list.get(id);

		const parents = [id];

		if (!dashboard) {

			return [];
		}

		if (!dashboard.parent) {

			return parents
		}

		while (dashboard.parent) {

			parents.push(dashboard.parent);
			dashboard = this.list.get(dashboard.parent);
		}

		return parents;
	}
}
;


class Dashboard {

	static setup() {

		Dashboard.grid = {
			columns: 32,
			rows: 10,
			rowHeight: 50,
		};

		Dashboard.screenHeightOffset = 2 * screen.availHeight;

		Dashboard.toolbar = page.container.querySelector('section#reports .toolbar');
		Dashboard.container = page.container.querySelector('section#reports .list');

		const sideButton = page.container.querySelector('#reports .side');
		const container = page.container.querySelector('#reports #blanket');

		sideButton.on('click', () => {

			container.classList.toggle('hidden');
			sideButton.classList.toggle('selected');

			const globalFilters = page.container.querySelector('#reports .global-filters');

			globalFilters.classList.toggle('show');

			if (page.account.settings.get('global_filters_position') == 'top') {
				globalFilters.classList.toggle('top');
				globalFilters.classList.toggle('right');
			}
		});

		container.on('click', () => {

			container.classList.add('hidden');
			sideButton.classList.remove('selected');

			const globalFilters = page.container.querySelector('#reports .global-filters');

			globalFilters.classList.toggle('show');

			if (page.account.settings.get('global_filters_position') == 'top') {
				globalFilters.classList.toggle('top');
				globalFilters.classList.toggle('right');
			}
		});
	}

	constructor(dashboard, page) {

		this.page = page;
		Object.assign(this, dashboard);

		this.children = new Map;
		this.parents = new Map;
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

		for (const report of this.format.reports) {
			data.query.push(DataSource.list.get(report.query_id));
		}

		return data;
	}

	get menuItem() {

		if (this.menuContainer) {

			return this.menuContainer;
		}

		const
			container = this.container = document.createElement('div'),
			allVisualizations = this.childrenVisualizations(this);

		let icon;

		if (this.icon && this.icon.startsWith('http')) {
			icon = `<img src="${this.icon}" height="20" width="20">`;
		}

		else if (this.icon && this.icon.startsWith('fa')) {
			icon = `<i class="${this.icon}"></i>`
		}
		else
			icon = '';

		container.classList.add('item');

		if (!allVisualizations.length && (!this.format || !parseInt(this.format.category_id))) {

			container.classList.add('hidden');
		}

		container.innerHTML = `
			<div class="label">
				${icon}
				<span class="name" id=${"dashboard-" + this.id}>${this.name}</span>
				${this.children.size ? '<span class="angle"><i class="fa fa-angle-right"></i></span>' : ''}
			</div>
			${this.children.size ? '<div class="submenu hidden"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');

		for (const child of this.children.values()) {

			submenu.appendChild(child.menuItem);
		}

		container.querySelector('.label').addEventListener('click', () => {

			this.page.sync(this.id);
		});

		this.menuContainer = container;

	}

	childrenVisualizations(dashboard) {
		let visualizationList = [];


		function getChildrenVisualizations(dashboard) {

			visualizationList = visualizationList.concat([...dashboard.visualizations]);

			for (const child of dashboard.children.values()) {

				getChildrenVisualizations(child);
			}
		}

		getChildrenVisualizations(dashboard);

		return visualizationList;
	}

	async load() {

		if (this.format && this.format.category_id) {

			this.page.listContainer.form.category.value = this.format.category_id;
			this.page.renderList();
			await Sections.show('list');
			this.page.sync(this.id);
		}

		this.visibleVisualizations = new Map;

		this.visualizations.sort((v1, v2) => v1.format.position - v2.format.position);

		for (const visualization of this.visualizations) {

			if (!DataSource.list.has(visualization.query_id)) {

				continue;
			}

			const dataSource = new DataSource(JSON.parse(JSON.stringify(DataSource.list.get(visualization.query_id))), this.page);

			dataSource.container.setAttribute('style', `
				order: ${visualization.format.position || 0};
				grid-column: auto / span ${visualization.format.width || Dashboard.grid.columns};
				grid-row: auto / span ${visualization.format.height || Dashboard.grid.rows};
			`);

			dataSource.selectedVisualization = dataSource.visualizations.filter(x => parseInt(x.visualization_id) === parseInt(visualization.visualization_id));

			if (!dataSource.selectedVisualization.length) {

				continue;
			}

			dataSource.selectedVisualization = dataSource.selectedVisualization[0];

			dataSource.container.appendChild(dataSource.selectedVisualization.container);

			this.visibleVisualizations.set(visualization.visualization_id, visualization);
		}
	}

	async render() {

		if (this.format && this.format.category_id) {

			return;
		}

		if (!this.globalFilters.size) {

			this.page.container.querySelector('#reports .side').classList.add('hidden');
		}

		this.page.container.querySelector('.dashboard-name').classList.remove('hidden');
		this.page.container.querySelector('.dashboard-name').classList.textContent = this.name;

		await Sections.show('reports');

		Dashboard.container.textContent = null;
		Dashboard.container.classList.remove('singleton');

		this.visualizationTrack = new Map;

		for (const dataSource of this.visibleVisualizations.values()) {

			Dashboard.container.appendChild(dataSource.container);

			this.visualizationTrack.set(dataSource.visualization_id, {
				position: dataSource.container.getBoundingClientRect().y,
				query: dataSource,
				loaded: false,
			});
		}

		const main = document.querySelector('main');

		this.maxScrollHeightAchieved = Math.max(Dashboard.screenHeightOffset, main.scrollTop);

		this.lazyLoad();

		if (![...this.page.loadedVisualizations].length) {

			Dashboard.container.innerHTML = '<div class="NA no-reports">No reports found! :(</div>';
		}


		main.addEventListener("scroll", () => {

				for (const queryDataSource of this.visualizationList) {

					this.visualizationsPositionObject[queryDataSource.selectedVisualization.visualization_id].position = queryDataSource.container.getBoundingClientRect().y;
				}

				this.maxScrollHeightAchieved = Math.max(main.scrollTop, this.maxScrollHeightAchieved);

				this.lazyLoad();

			}, {
				passive: true
			}
		);

		if (this.page.user.privileges.has('report')) {

			const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

			edit.classList.remove('hidden');
			edit.innerHTML = `<i class="fa fa-edit"></i> Edit`;

			edit.removeEventListener('click', Dashboard.toolbar.editListener);

			edit.on('click', Dashboard.toolbar.editListener = () => {
				this.edit()
			});

			if (Dashboard.editing) {

				edit.click();
			}

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

			const configure = Dashboard.toolbar.querySelector('#configure');
			configure.on('click', () => location.href = `/dashboards-manager/${this.id}`);
			configure.classList.remove('hidden');
		}

		Dashboard.toolbar.querySelector('#mailto').classList.remove('selected');
		this.page.reports.querySelector('.mailto-content').classList.add('hidden');

		const mailto = Dashboard.toolbar.querySelector('#mailto');

		if (this.page.account.settings.get('enable_dashboard_share'))
			mailto.classList.remove('hidden');

		if (Dashboard.mail_listener)
			mailto.removeEventListener('click', Dashboard.mail_listener);

		mailto.on('click', Dashboard.mail_listener = () => {
			mailto.classList.toggle('selected');
			this.mailto();
		});
	}

	lazyLoad() {

		const visitedVisualizations = new Set;

		for (const [visualization_id, visualization] of this.visualizationTrack) {

			if ((parseInt(this.visualizationTrack[visualization_id].position) < this.maxScrollHeightAchieved + offset) && !this.visualizationTrack[visualization].loaded) {

				this.visualizationTrack[visualization_id].query.selectedVisualization.load();
				this.visualizationTrack[visualization_id].loaded = true;
				this.page.loadedVisualizations.set(visualization_id, visualization);

				visitedVisualizations.add(visualization_id);
			}

			if (this.visualizationTrack[visualization].loaded) {

				visitedVisualizations.add(visualization_id);
			}
		}

		for (const visualizationId of visitedVisualizations.values()) {

			this.visualizationTrack.delete(visualizationId);
		}
	}

	edit() {


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
			a.setAttribute('href', `mailto: ${form.email.value}?${searchParams}`);

			a.click();
		})
	}

	async save(format, id) {

		Dashboard.editing = false;

		const
			parameters = {
				id: id,
				format: JSON.stringify(format || this.format),
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/dashboard/update', parameters, options);
	}
}


class DashboardGlobalFilters extends DataSourceFilters {

	constructor(dashboard) {

		const globalFilters = new Map;

		for (const visualization of dashboard.visualizationList) {

			for (const filter of visualization.filters.values()) {

				if (globalFilters.has(filter.placeholder) || ['hidden', 'daterange'].includes(filter.type))
					continue;

				globalFilters.set(filter.placeholder, {
					name: filter.name,
					placeholder: filter.placeholder,
					default_value: filter.default_value,
					dataset: filter.dataset,
					multiple: filter.multiple,
					offset: filter.offset,
					order: filter.order,
					type: filter.type,
				});
			}
		}

		super(Array.from(globalFilters.values()));

		this.dashboard = dashboard;
		this.page = this.dashboard.page;
		this.globalFilterContainer = this.page.container.querySelector('#reports .global-filters');

		this.globalFilterContainer.classList.add(this.page.account.settings.get('global_filters_position') || 'right');

		// Save the value of each filter for use on other dashboards
		// if(Dashboard.selectedValues.size) {
		// 	for(const [placeholder, filter] of this)
		// 		filter.value = Dashboard.selectedValues.get(placeholder);
		// }
	}

	async load() {

		await this.fetch();

		await this.render();
	}

	async fetch() {

		const promises = [];

		for (const filter of this.values())
			promises.push(filter.fetch());

		await Promise.all(promises);
	}

	async render() {

		const container = this.globalFilterContainer;

		container.textContent = null;

		container.classList.remove('show');

		if (!this.size)
			return;

		container.innerHTML = `
			<div class="head heading">
				<i class="fas fa-filter"></i>
				<input type="search" placeholder="Global Filters" class="global-filter-search">
			</div>
			<div class="head">
				<label><input type="checkbox" checked> Select All</label>
				<button class="reload icon" title="Fore Refresh"><i class="fas fa-sync"></i></button>
			</div>
			<div class="NA no-results hidden">No filters found! :(</div>
		`;

		container.appendChild(this.container);

		const searchInput = container.querySelector('.global-filter-search');

		searchInput.on('keyup', () => {

			for (const filter of this.values()) {

				filter.label.classList.remove('hidden');

				if (!filter.name.toLowerCase().trim().includes(searchInput.value.toLowerCase().trim()))
					filter.label.classList.add('hidden');
			}

			const shown = container.querySelectorAll('.filters > label:not(.hidden)');

			container.querySelector('.no-results').classList.toggle('hidden', shown.length > 1);
		});

		container.querySelector('button.reload').on('click', () => this.apply({cached: 0}));

		const input = container.querySelector('.head input[type=checkbox]');

		input.on('change', () => input.checked ? this.all() : this.clear());
	}

	async apply(options = {}) {

		for (const report of this.dashboard.visualizationList) {

			let found = false;

			for (const filter of report.filters.values()) {

				if (!this.has(filter.placeholder))
					continue;

				filter.value = this.get(filter.placeholder).value;

				found = true;
			}

			if (found && this.page.loadedVisualizations.has(report))
				report.visualizations.selected.load(options);

			report.container.style.opacity = found ? 1 : 0.4;
		}

		Dashboard.selectedValues.clear();

		// Save the value of each filter for use on other dashboards
		for (const [placeholder, filter] of this)
			Dashboard.selectedValues.set(placeholder, filter.value);
	}

	clear() {

		for (const filter of this.values()) {
			if (filter.multiSelect)
				filter.multiSelect.clear();
		}
	}

	all() {

		for (const filter of this.values()) {
			if (filter.multiSelect)
				filter.multiSelect.all();
		}
	}
}

Dashboard.selectedValues = new Map;