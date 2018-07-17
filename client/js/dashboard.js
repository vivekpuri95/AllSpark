Page.class = class Dashboards extends Page {

	constructor() {

		super();

		Dashboard.setup(this);
		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

		if(this.account.settings.get('disable_footer'))
			this.container.parentElement.querySelector('main > footer').classList.add('hidden');

		else  {
			const deployTime = this.container.parentElement.querySelector('main > footer .deploy-time')
			deployTime.textContent = Format.time(deployTime.textContent);
		}

		this.reports.querySelector('.toolbar #back').on('click', async () => {
			await Sections.show('list');
			this.renderList();
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		this.list = new Map;
		this.loadedVisualizations = new Set;

		for (const category of MetaData.categories.values())
			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.category_id}">${category.name}</option>`);

		this.listContainer.form.category.on('change', () => this.renderList());
		this.listContainer.form.search.on('keyup', () => this.renderList());

		window.on('popstate', e => {
			this.load(e.state)
		});

		(async () => {

			await this.load();

			if(window.innerWidth <= 750)
				this.collapseNav();
		})();
	}

	async load(state) {

		await DataSource.load(); //get report list
		const dashboards = await API.call('dashboards/list'); //get dashboard list
		this.list = new Map;

		for (const dashboard of dashboards) {

			this.list.set(dashboard.id, new Dashboard(dashboard, this));
		}
		// manage hierarchy

		for (const dashboard of this.list.values()) {

			if (dashboard.parent && this.list.has(dashboard.parent)) {

				(this.list.get(dashboard.parent)).children.add(dashboard);
			}
		}

		const id = state ? state.filter : parseInt(window.location.pathname.split('/').pop());

		if (window.location.pathname.split('/').pop() === "first") {

			this.renderNav();

			let item = this.container.querySelector("nav .item:not(.hidden)");

			if (!item) {
				this.renderList();
				return await Sections.show("list");
			}

			while (item.querySelector(".submenu")) {

				item.querySelector(".label").click();
				item = item.querySelector(".submenu")
			}

			item.querySelector(".label").click();
			return;
		}

		if (!id) {

			this.renderList();
			this.renderNav();
			return await Sections.show("list");
		}

		const [loadReport] = window.location.pathname.split('/').filter(x => x === "report");

		await this.renderNav(id);
		if (loadReport) {
			await this.report(id);
		}

		else {

			await this.list.get(id).load();
			await this.list.get(id).render();
		}
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

			for(const tag of tags)
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

	tagSearch(e) {

		e.stopPropagation();

		this.listContainer.form.search.value = e.currentTarget.textContent;

		this.renderList();
	}

	closeOtherDropDowns(id, container) {

		const parents = container.querySelectorAll(".parentDashboard");

		for (const item of parents) {

			if (item.querySelector(".label").id === id) {

				continue;
			}

			const submenu = item.querySelector(".submenu");

			if (submenu) {

				submenu.classList.add("hidden");
			}

			item.querySelector(".angle") ? item.querySelector(".angle").classList.remove("down") : {}
		}

		const labels = container.querySelectorAll(".label");

		for (const item of labels)
			item.classList.remove("selected");
	}

	renderNav(id) {

		const
			showLabelIds = this.parentList(id).map(x => x),
			nav = document.querySelector('main > nav');

		nav.textContent = null;

		const search = document.createElement('label');

		search.classList.add('dashboard-search');

		search.innerHTML = `<input type="search" name="search" placeholder="Search..." >`;

		nav.appendChild(search);

		search.on('keyup', () => {

			const searchItem = search.querySelector("input[name='search']").value;

			this.closeOtherDropDowns('', nav);

			if (!searchItem.length) {

				return this.closeOtherDropDowns('', nav);
			}

			let matching = [];

			for (const dashboard of this.list.values()) {

				if (dashboard.name.toLowerCase().includes(searchItem.toLowerCase())) {

					matching = matching.concat(this.parentList(dashboard.id).map(x => '#dashboard-' + x));
					nav.querySelector("#dashboard-" + dashboard.id).parentNode.querySelector(".label").classList.add("selected")
				}
			}
			let toShowItems = [];

			try {
				toShowItems = nav.querySelectorAll([...new Set(matching)].join(", "));
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

						if(currentDashboard)
							currentDashboard.classList.add("selected");
					}
				});

				if (showLabelIds.includes(dashboard.id)) {

					for(const elem of menuItem.querySelectorAll(".submenu")) {

						elem.classList.remove("hidden");
					}

					for(const elem of menuItem.querySelectorAll(".label")) {

						const angle = elem.querySelector(".angle");

						if(angle) {

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

		if(!nav.children.length)
			nav.innerHTML = `<div class="NA">No dashboards found!</div>`;
	}

	collapseNav() {

		const nav = document.querySelector('main > nav');

		nav.classList.toggle('collapsed');

		const
			toggle = nav.querySelector('.collapse-panel'),
			right = toggle.querySelector('.right');

		right.classList.toggle('hidden');
		toggle.querySelector('.left').classList.toggle('hidden');

		this.container.classList.toggle('collapsed-grid');

		for (const item of nav.querySelectorAll('.item')) {

			if (!right.hidden)
				item.classList.remove('list-open');

			if (!item.querySelector('.label .name').parentElement.parentElement.parentElement.className.includes('submenu'))
				item.querySelector('.label .name').classList.toggle('hidden');
		}
	}

	parentList(id) {

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

	async report(id) {

		const
			report = new DataSource(DataSource.list.get(id)),
			container = this.reports.querySelector(':scope > .list');

		this.loadedVisualizations.clear();
		this.loadedVisualizations.add(report);

		report.container.removeAttribute('style');
		container.classList.add('singleton');
		Dashboard.toolbar.classList.add('hidden');
		this.container.querySelector('.dashboard-name').classList.add('hidden');
		this.container.querySelector('.global-filters').classList.add('hidden');

		container.textContent = null;

		const promises = [];

		for(const filter of report.filters.values()) {

			if(filter.multiSelect) {
				promises.push(filter.fetch());
			}
		}

		await Promise.all(promises);

		report.container.querySelector('.menu').classList.remove('hidden');
		report.container.querySelector('.menu-toggle').classList.add('selected');

		container.appendChild(report.container);

		report.visualizations.selected.load();

		await Sections.show('reports');
	}
};

class Dashboard {

	constructor(dashboardObject, page) {

		this.page = page;
		this.children = new Set;

		this.parentList = new Set;

		if (this.parent) {

			this.parentList.add(this.parent);
		}

		Object.assign(this, dashboardObject);

		Dashboard.grid = {
			columns: 32,
			rows: 10,
			rowHeight: 50,
		};

		Dashboard.screenHeightOffset = 2 * screen.availHeight;
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

		if (this.container)
			return this.container;

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
			<div class="label" id=${"dashboard-" + this.id}>
				${icon}
				<span class="name">${this.name}</span>
				${this.children.size ? '<span class="angle"><i class="fa fa-angle-right"></i></span>' : ''}
			</div>
			${this.children.size ? '<div class="submenu hidden"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');

		container.querySelector('.label').on('click', () => {

			if (this.page.container.querySelector('nav.collapsed')) {

				for (const item of container.parentElement.querySelectorAll('.item')) {

					item.classList.remove('list-open');

					if (item == container) {

						container.classList.add('list-open');
						continue;
					}

					if (item.querySelector('.submenu')) {

						item.querySelector('.angle').classList.add('down');
						item.querySelector('.submenu').classList.add('hidden');
					}
				}
			}

			if (this.children.size) {

				container.querySelector('.angle').classList.toggle('down');
				submenu.classList.toggle('hidden');
			}

			else {

				history.pushState({filter: this.id, type: 'dashboard'}, '', `/dashboard/${this.id}`);
				this.load();
				this.render();
			}
		});

		for (const child of this.children.values()) {

			submenu.appendChild(child.menuItem);
		}

		return container;
	}

	static setup(page) {

		Dashboard.grid = {
			columns: 32,
			rows: 10,
			rowHeight: 50,
		};

		Dashboard.toolbar = page.container.querySelector('section#reports .toolbar');
		Dashboard.container = page.container.querySelector('section#reports .list');

		const sideButton = page.container.querySelector('#reports .side');
		const container = page.container.querySelector('#reports #blanket');

		sideButton.on('click', () => {

			container.classList.toggle('hidden');
			sideButton.classList.toggle('selected');

			const globalFilters = page.container.querySelector('#reports .global-filters');

			globalFilters.classList.toggle('show');

			if(page.account.settings.get('global_filters_position') == 'top') {
				globalFilters.classList.toggle('top');
				globalFilters.classList.toggle('right');
			}
		});

		container.on('click', () => {

			container.classList.add('hidden');
			sideButton.classList.remove('selected');

			const globalFilters = page.container.querySelector('#reports .global-filters');

			globalFilters.classList.toggle('show');

			if(page.account.settings.get('global_filters_position') == 'top') {
				globalFilters.classList.toggle('top');
				globalFilters.classList.toggle('right');
			}
		});
	}

	static sortVisualizations(visualizationList) {

		return visualizationList.sort((v1, v2) => v1.format.position - v2.format.position);
	}

	async load() {

		if (this.format && this.format.category_id) {

			this.page.listContainer.form.category.value = this.format.category_id;

			this.page.renderList();

			await Sections.show('list');

			//removing selected from other containers
			for (const element of this.page.container.querySelectorAll(".selected") || []) {

				element.classList.remove("selected");
			}

			return this.page.container.querySelector("#dashboard-" + this.id).parentNode.querySelector(".label").classList.add("selected");
		}

		//no need for dashboard.format

		this.visualizationList = new Set;

		this.visualizations = Dashboard.sortVisualizations(this.visualizations);

		this.resetSideButton();

		for (const visualization of this.visualizations) {

			if (!visualization.format) {

				visualization.format = {};
			}

			if (!DataSource.list.has(visualization.query_id)) {

				continue;
			}

			const queryDataSource = new DataSource(JSON.parse(JSON.stringify(DataSource.list.get(visualization.query_id))), this.page);

			queryDataSource.container.setAttribute('style', `
				order: ${visualization.format.position || 0};
				grid-column: auto / span ${visualization.format.width || Dashboard.grid.columns};
				grid-row: auto / span ${visualization.format.height || Dashboard.grid.rows};
			`);

			queryDataSource.selectedVisualization = queryDataSource.visualizations.filter(v =>

				v.visualization_id === visualization.visualization_id
			);

			if (!queryDataSource.selectedVisualization.length) {

				continue;
			}

			queryDataSource.selectedVisualization = queryDataSource.selectedVisualization[0];

			this.visualizationList.add(queryDataSource);
		}

		try {
			this.globalFilters = new DashboardGlobalFilters(this);

			await this.globalFilters.load();
		}
		catch (e) {
			console.log(e);
		}

		if (!this.globalFilters.size)
			this.page.container.querySelector('#reports .side').classList.add('hidden');
	}

	loadVisitedVisualizations(heightScrolled, resize, offset = Dashboard.screenHeightOffset) {

		for (const visualization in this.visualizationsPositionObject) {

			if ((parseInt(this.visualizationsPositionObject[visualization].position) < heightScrolled + offset) && !this.visualizationsPositionObject[visualization].loaded) {

				this.page.loadedVisualizations.add(this.visualizationsPositionObject[visualization].report);
				this.visualizationsPositionObject[visualization].report.selectedVisualization.load(resize);
				this.visualizationsPositionObject[visualization].loaded = true;
			}
		}
	}

	resetSideButton() {

		const sideButton = this.page.container.querySelector('#reports .side');

		sideButton.classList.remove('hidden');
		sideButton.classList.remove('show');
		sideButton.classList.remove('selected');
		this.page.container.querySelector('#reports #blanket').classList.add('hidden');
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

	async render(resize) {

		if (this.format && this.format.category_id)
			return;

		if (!this.globalFilters.size)
			this.page.container.querySelector('#reports .side').classList.add('hidden');

		const dashboardName = this.page.container.querySelector('.dashboard-name');

		dashboardName.innerHTML = `
			${this.name}
			<div>
				<span class="toggle-dashboard-toolbar"><i class="fas fa-ellipsis-v"></i></span>
			</div>
		`;

		dashboardName.classList.remove('hidden');

		dashboardName.querySelector('.toggle-dashboard-toolbar').on('click', () => Dashboard.toolbar.classList.toggle('hidden'));

		await Sections.show('reports');

		const menuElement = this.page.container.querySelector('#dashboard-' + this.id);

		for (const element of this.page.container.querySelectorAll('.label'))
			element.classList.remove('selected');

		if (menuElement)
			menuElement.classList.add('selected');

		const mainObject = document.querySelector('main');

		this.visualizationsPositionObject = {};

		Dashboard.container.textContent = null;

		for (const queryDataSource of this.visualizationList) {

			queryDataSource.container.appendChild(queryDataSource.selectedVisualization.container);

			Dashboard.container.appendChild(queryDataSource.container);

			Dashboard.container.classList.remove('singleton');

			this.visualizationsPositionObject[queryDataSource.selectedVisualization.visualization_id] = ({
				position: queryDataSource.container.getBoundingClientRect().y,
				loaded: false,
				report: queryDataSource
			});
		}

		let maxScrollHeightAchieved = Math.max(Dashboard.screenHeightOffset, mainObject.scrollTop);

		this.loadVisitedVisualizations(maxScrollHeightAchieved, resize);

		mainObject.addEventListener("scroll", () => {

				for (const queryDataSource of this.visualizationList) {

					this.visualizationsPositionObject[queryDataSource.selectedVisualization.visualization_id].position = queryDataSource.container.getBoundingClientRect().y;
				}

				maxScrollHeightAchieved = Math.max(mainObject.scrollTop, maxScrollHeightAchieved);
				this.loadVisitedVisualizations(maxScrollHeightAchieved, resize,);

			}, {
				passive: true
			}
		);

		if (!this.page.loadedVisualizations.size)
			Dashboard.container.innerHTML = '<div class="NA no-reports">No reports found! :(</div>';

		if (this.page.user.privileges.has('report')) {

			const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

			edit.classList.remove('hidden');
			edit.innerHTML = `<i class="fa fa-edit"></i> Edit`;

			edit.removeEventListener('click', Dashboard.toolbar.editListener);

			edit.on('click', Dashboard.toolbar.editListener = () => {
				this.edit()
			});

			if (Dashboard.editing)
				edit.click();

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

		if(this.page.account.settings.get('enable_dashboard_share'))
			mailto.classList.remove('hidden');

		if (Dashboard.mail_listener)
			mailto.removeEventListener('click', Dashboard.mail_listener);

		mailto.on('click', Dashboard.mail_listener = () => {
			mailto.classList.toggle('selected');
			this.mailto();
		});

		if(Dashboard.selectedValues && Dashboard.selectedValues.size && this.globalFilters.size)
			this.globalFilters.apply();
	}

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

		edit.classList.add('hidden');

		for (let report of this.page.loadedVisualizations) {

			const [selectedVisualizationProperties] = this.page.list.get(this.id).visualizations.filter(x => x.visualization_id === report.selectedVisualization.visualization_id);

			report.selectedVisualization = selectedVisualizationProperties

			if(!report.format)
				report.format = {};

			report.format.format = selectedVisualizationProperties.format;

			const
				header = report.container.querySelector('header'),
				format = report.selectedVisualization.format;

			if (!format.width)
				format.width = Dashboard.grid.columns;

			if (!format.height)
				format.height = Dashboard.grid.rows;

			header.insertAdjacentHTML('beforeend', `
				<div class="edit">
					<span class="remove" title="Remove Graph"><i class="fa fa-times"></i></span>
					<span class="move-up" title="Move visualization up"><i class="fas fa-angle-up"></i></span>
					<span class="move-down" title="Move visualization down"><i class="fas fa-angle-down"></i></span>
				</div>
			`);

			header.querySelector('.move-up').on('click', () => {

				const current = report.selectedVisualization;

				let previous = null;

				for (let [index, value] of this.visualizations.entries()) {

					if (value.visualization_id === current.visualization_id) {
						previous = [...this.visualizations][index - 1];
						break;
					}
				}

				if (!previous)
					return;

				current.format.position = Math.max(1, current.format.position - 1);
				previous.format.position = Math.min(this.visualizations.length, previous.format.position + 1);

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

				const current = report.selectedVisualization;

				let next = null;
				for (let [index, value] of this.visualizations.entries()) {

					if (value.visualization_id === current.visualization_id) {
						next = [...this.visualizations][index + 1];
						break;
					}

				}

				if (!next)
					return;

				current.format.position = Math.min(this.visualizations.length, current.format.position + 1);
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
				this.page.loadedVisualizations.beingResized = report
			});

			right.on('dragend', e => {
				e.stopPropagation();
				this.page.loadedVisualizations.beingResized = null;
			});

			bottom.on('dragstart', e => {
				e.stopPropagation();
				report.draggingEdge = bottom;
				this.page.loadedVisualizations.beingResized = report
			});

			bottom.on('dragend', e => {
				e.stopPropagation();
				this.page.loadedVisualizations.beingResized = null;
			});
		}

		Dashboard.container.on('dragover', e => {

			e.preventDefault();
			e.stopPropagation();

			const report = this.page.loadedVisualizations.beingResized;

			if (!report)
				return;

			let format = report.format || {};

			if (!format.format)
				format.format = {};

			const visualizationFormat = format.format;

			if (report.draggingEdge.classList.contains('right')) {

				const
					columnStart = getColumn(report.container.offsetLeft),
					column = getColumn(e.clientX) + 1;

				if (column <= columnStart)
					return;

				visualizationFormat.width = column - columnStart;
			}

			if (report.draggingEdge.classList.contains('bottom')) {

				const
					rowStart = getRow(report.container.offsetTop),
					row = rowStart + getRow(e.clientY);

				if (row <= rowStart)
					return;

				visualizationFormat.height = row - rowStart - 1;
			}

			if (
				visualizationFormat.width != report.container.style.gridColumnEnd.split(' ')[1] ||
				visualizationFormat.height != report.container.style.gridRowEnd.split(' ')[1]
			) {

				report.container.setAttribute('style', `
					order: ${report.selectedVisualization.format.position || 0};
					grid-column: auto / span ${visualizationFormat.width || Dashboard.grid.columns};
					grid-row: auto / span ${visualizationFormat.height || Dashboard.grid.rows};
				`);

				if (this.dragTimeout)
					clearTimeout(this.dragTimeout);

				this.dragTimeout = setTimeout(() => report.visualizations.selected.render(true), 400);

				if (this.saveTimeout)
					clearTimeout(this.saveTimeout);

				this.saveTimeout = setTimeout(() => this.save(visualizationFormat, report.selectedVisualization.id), 1000);
			}
		});


		function getColumn(position) {
			return Math.floor(
				(position - Dashboard.container.offsetLeft) /
				((Dashboard.container.clientWidth / Dashboard.grid.columns))
			);
		}

		function getRow(position) {
			return Math.floor((position - Dashboard.container.offsetTop) / Dashboard.grid.rowHeight);
		}
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

		for(const visualization of dashboard.visualizationList) {

			for(const filter of visualization.filters.values()) {

				if(!Array.from(MetaData.globalFilters.values()).some(a => a.placeholder.includes(filter.placeholder)))
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

		this.page.container.removeEventListener('scroll', DashboardGlobalFilters.scrollListener);
		this.page.container.addEventListener('scroll', DashboardGlobalFilters.scrollListener = e => {
			this.globalFilterContainer.classList.toggle('scrolled', this.page.container.scrollTop > 45);
		}, {passive: true});
	}

	async load() {

		await this.fetch();

		await this.render();
	}

	async fetch() {

		const promises = [];

		for(const filter of this.values())
			promises.push(filter.fetch());

		await Promise.all(promises);
	}

	async render() {

		const container = this.globalFilterContainer;

		container.textContent = null;

		container.classList.remove('show');
		container.classList.toggle('hidden', !this.size);

		if(!this.size)
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

			for(const filter of this.values()) {

				filter.label.classList.remove('hidden');

				if(!filter.name.toLowerCase().trim().includes(searchInput.value.toLowerCase().trim()))
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

		for(const report of this.dashboard.visualizationList) {

			let found = false;

			for(const filter of report.filters.values()) {

				if(!this.has(filter.placeholder))
					continue;

				filter.value = this.get(filter.placeholder).value;

				found = true;
			}

			if(found && this.page.loadedVisualizations.has(report))
				report.visualizations.selected.load(options);

			report.container.style.opacity = found ? 1 : 0.4;
		}

		Dashboard.selectedValues.clear();

		// Save the value of each filter for use on other dashboards
		for(const [placeholder, filter] of this)
			Dashboard.selectedValues.set(placeholder, filter.value);
	}

	clear() {

		for(const filter of this.values()) {
			if(filter.multiSelect)
				filter.multiSelect.clear();
		}
	}

	all() {

		for(const filter of this.values()) {
			if(filter.multiSelect)
				filter.multiSelect.all();
		}
	}
}

Dashboard.selectedValues = new Map;