Page.class = class Dashboards extends Page {

	constructor() {

		super();

		Dashboard.setup(this);
		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

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

		this.load();

		window.on('popstate', e => {
			this.load(e.state)
		});
	}

	async load(state) {

		await DataSource.load(); //get report list
		const dashboards = await API.call('dashboards/list'); //get dashboard list
		this.list = new Map;

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
			privateDashboard = {
				...JSON.parse(JSON.stringify(dummyDashboard)),
				name: "Private Dashboards",
				id: -1,
				icon: "fas fa-user-secret"
			},
			sharedWithMeDashboard = {
				...JSON.parse(JSON.stringify(dummyDashboard)),
				name: "Shared With Me",
				id: -2,
				icon: "fas fa-user-plus"
			},
			publicDashboard = {
				...JSON.parse(JSON.stringify(dummyDashboard)),
				name: "Public Dashboards",
				id: -3,
				icon: "fas fa-user-secret"
			};


		for (const dashboard of dashboards) {

			if ((dashboard.added_by === user.user_id || dashboard.added_by === null) && dashboard.visibility === "private" && dashboard.parent === null) {

				dashboard.parent = privateDashboard.id;
			}

			else if (dashboard.added_by !== user.user_id && dashboard.visibility === "private" && dashboard.parent === null) {

				dashboard.parent = sharedWithMeDashboard.id;
			}

			else if (dashboard.parent === null) {
				dashboard.parent = publicDashboard.id;
			}

			this.list.set(dashboard.id, new Dashboard(dashboard, this));
		}

		this.list.set(publicDashboard.id, new Dashboard(publicDashboard, this));
		this.list.set(privateDashboard.id, new Dashboard(privateDashboard, this));
		this.list.set(sharedWithMeDashboard.id, new Dashboard(sharedWithMeDashboard, this));

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

			if(!item) {
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

		if (!tbody.children.length)
			tbody.innerHTML = `<tr class="NA"><td colspan="6">No Reports Found! :(</td></tr>`;
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
	};

	renderNav(id) {

		const showLabelIds = this.parentList(id).map(x => x);
		const nav = document.querySelector('main > nav');

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

				item.querySelector(".angle") ? item.querySelector(".angle").classList.remove("down") : {};
			}
		});

		for (const dashboard of this.list.values()) {

			if (!dashboard.parent) {

				let menuItem = dashboard.menuItem, showItemList;
				menuItem.classList.add("parentDashboard");
				const label = menuItem.querySelector(".label");

				label.on("click", () => {

					this.closeOtherDropDowns(label.id, nav);
				});

				showItemList = menuItem.querySelectorAll(".hidden");

				if (showLabelIds.includes(dashboard.id)) {

					[].forEach.call(showItemList, (el) => {

						el.classList.remove("hidden");
						el.querySelector(".angle") ? el.querySelector(".angle").classList.remove("down") : {}
					});
				}

				nav.appendChild(menuItem);
			}
		}

		nav.insertAdjacentHTML('beforeend', `
			<footer>
				<span class="powered-by hidden"> Powered By <a target="_blank" href="https://github.com/Jungle-Works/AllSpark">AllSpark</a></span>
				<div class="collapse-panel">
					<span class="left"><i class="fa fa-angle-double-left"></i></span>
					<span class="right hidden"><i class="fa fa-angle-double-right"></i></span>
				</div<
			</footer>
		`);

		// nav.querySelector('.powered-by').classList.toggle('hidden', account.settings.has('disable_powered_by') && account.settings.get('disable_powered_by'))

		nav.querySelector('.collapse-panel').on('click', (e) => {

			nav.classList.toggle('collapsed-nav');

			const right = e.currentTarget.querySelector('.right')

			right.classList.toggle('hidden');
			e.currentTarget.querySelector('.left').classList.toggle('hidden');

			// if(!nav.querySelector('.powered-by').classList.contains('hidden') && !account.settings.get('disable_powered_by'))
			// 	nav.querySelector('.powered-by').classList.add('hidden');
			// else if( !account.settings.get('disable_powered_by'))
			// 	nav.querySelector('.powered-by').classList.remove('hidden');

			document.querySelector('main').classList.toggle('collapsed-grid');

			for (const item of nav.querySelectorAll('.item')) {

				if (!right.hidden) {
					item.classList.remove('list-open');
				}

				if (!item.querySelector('.label .name').parentElement.parentElement.parentElement.className.includes('submenu'))
					item.querySelector('.label .name').classList.toggle('hidden');
				item.querySelector('.submenu') ? item.querySelector('.submenu').classList.toggle('collapsed-submenu-bar') : '';
			}

		});

		if (!nav.children.length) {

			nav.innerHTML = `<div class="NA">No dashboards found!</div>`;
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
			container = this.reports.querySelector('.list');

		this.loadedVisualizations.clear();
		this.loadedVisualizations.add(report);

		container.textContent = null;

		const promises = [];

		for (const filter of report.filters.values()) {

			if (filter.dataset) {

				promises.push(filter.dataset.fetch());
			}
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


		if (this.container) {

			return this.container;
		}
		const allVisualizations = this.childrenVisualizations(this);

		const container = this.container = document.createElement('div');

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

		if (!allVisualizations.length && !parseInt(this.format.category_id)) {

			container.classList.add('hidden');
		}

		container.innerHTML = `
			<div class="label" id=${"dashboard-" + this.id}>
				${icon}
				<span class="name">${this.name}</span>
				${this.children.size ? '<span class="angle down"><i class="fa fa-angle-down"></i></span>' : ''}
			</div>
			${this.children.size ? '<div class="submenu hidden"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');


		container.querySelector('.label').on('click', () => {

			if (container.querySelector('.collapsed-submenu-bar')) {

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

				history.pushState({what: this.id, type: 'dashboard'}, '', `/dashboard/${this.id}`);
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

		const side_button = page.container.querySelector('#reports .side');
		const container = page.container.querySelector('#reports #blanket');

		side_button.on('click', () => {
			container.classList.toggle('hidden');
			page.container.querySelector('#reports .datasets').classList.toggle('show');
			side_button.classList.toggle('show');
			side_button.classList.toggle('selected');
			side_button.innerHTML = `<i class="fas fa-angle-double-${container.classList.contains('hidden') ? 'left' : 'right'}"></i>`;
		});

		container.on('click', () => {

			container.classList.add('hidden');
			page.container.querySelector('#reports .datasets').classList.remove('show');
			side_button.classList.remove('show');
			side_button.classList.remove('selected');
			side_button.innerHTML = '<i class="fas fa-angle-double-left"></i>';
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
			return;
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
			this.datasets = new DashboardDatasets(this);

			await this.datasets.load();
		}
		catch (e) {

			console.log(e);
		}

		if (!this.datasets.size)
			this.page.container.querySelector('#reports .side').classList.add('hidden');
	}

	loadVisitedVisualizations(heightScrolled, resize, offset = Dashboard.screenHeightOffset) {

		for (const visualization in this.visualizationsPositionObject) {

			if ((parseInt(this.visualizationsPositionObject[visualization].position) < heightScrolled + offset) && !this.visualizationsPositionObject[visualization].loaded) {

				//scroll karte hue report paar gaye(offset mila kar)

				this.page.loadedVisualizations.add(this.visualizationsPositionObject[visualization].report);
				this.visualizationsPositionObject[visualization].report.selectedVisualization.load(resize);
				this.visualizationsPositionObject[visualization].loaded = true;
			}
		}
	}

	resetSideButton() {

		const side_button = this.page.container.querySelector('#reports .side');

		side_button.classList.remove('hidden');
		side_button.classList.remove('show');
		side_button.classList.remove('selected');
		side_button.innerHTML = '<i class="fas fa-angle-double-left"></i>';
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

	async render(resize = {resize: true}) {

		if (this.format && this.format.category_id)
			return;

		await Sections.show('reports');

		const menuElement = this.page.container.querySelector("#dashboard-" + this.id);


		for (const element of this.page.container.querySelectorAll(".label")) {

			element.classList.remove("selected");
		}

		if (menuElement) {

			menuElement.classList.add("selected");
		}

		const mainObject = document.querySelector("main");

		this.visualizationsPositionObject = {};

		Dashboard.container.textContent = null;

		for (const queryDataSource of this.visualizationList) {

			queryDataSource.container.appendChild(queryDataSource.selectedVisualization.container);

			Dashboard.container.appendChild(queryDataSource.container);

			Dashboard.container.classList.remove("singleton");

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

		if (!this.page.loadedVisualizations.size) {

			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';
		}

		if (this.page.user.privileges.has('reports')) {

			const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

			edit.classList.remove('hidden');
			edit.innerHTML = `<i class="fa fa-edit"></i> Edit`;

			edit.removeEventListener('click', Dashboard.toolbar.editListener);

			edit.on('click', Dashboard.toolbar.editListener = () => {
				console.log(this);
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
		mailto.classList.remove('hidden');

		if (Dashboard.mail_listener)
			mailto.removeEventListener('click', Dashboard.mail_listener);

		mailto.on('click', Dashboard.mail_listener = () => {
			mailto.classList.toggle('selected');
			this.mailto();
		});

		if (!this.datasets.size) {

			this.page.container.querySelector('#reports .side').classList.add('hidden');
		}
	}

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

		edit.classList.add('hidden');

		for (let report of this.page.loadedVisualizations) {

			const [selectedVisualizationProperties] = this.page.list.get(this.id).visualizations.filter(x => x.visualization_id === report.selectedVisualization.visualization_id);

			report.selectedVisualization = selectedVisualizationProperties

			// Object.assign(report, visualizationProperties);

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

		console.log(format, id);

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


class DashboardDatasets extends Map {

	constructor(dashboard) {

		super();

		this.dashboard = dashboard;
		this.page = this.dashboard.page;
		this.container = this.page.container.querySelector('#reports .datasets');

		const datasets = {};

		for (const visualization of this.dashboard.visualizationList) {

			for (const filter of visualization.filters.values()) {

				if (!filter.dataset) {

					continue;
				}

				if (!datasets[filter.dataset.id]) {
					datasets[filter.dataset.id] = {
						id: filter.dataset.id,
						multiple: true,
						placeholder: `dataset-${filter.dataset.id}`,
					}
				}

				if (!filter.multiple)
					datasets[filter.dataset.id].multiple = false;
			}
		}

		for (const dataset of Object.values(datasets))
			this.set(dataset.id, new Dataset(dataset.id, dataset));
	}

	async load() {

		await this.fetch();

		await this.render();
	}

	async fetch() {

		const promises = [];

		for (const dataset of this.values())
			promises.push(dataset.fetch());

		await Promise.all(promises);
	}

	async render() {

		const container = this.container;

		container.textContent = null;

		container.classList.remove('show');

		if (!this.size)
			return;

		container.innerHTML = '<h3>Global Filters</h3>';

		const datasets = Array.from(this.values()).sort((a, b) => {
			if (!a.order)
				return 1;
			if (!b.order)
				return -1;

			return a.order - b.order;
		});

		for (const dataset of datasets) {

			const
				label = document.createElement('label'),
				input = document.createElement('select');

			label.classList.add('dataset-container');

			label.insertAdjacentHTML('beforeend', `<span>${dataset.name}</span>`);

			label.appendChild(dataset.container);

			if (Dashboard.selectedValues.has(dataset.id))
				dataset.value = Dashboard.selectedValues.get(dataset.id);

			container.appendChild(label);
		}

		container.insertAdjacentHTML('beforeend', `
			<div class="actions">
				<button class="apply" title="Apply Filters"><i class="fas fa-paper-plane"></i> Apply</button>
				<button class="reload icon" title="Fore Refresh"><i class="fas fa-sync"></i></button>
				<button class="reset-toggle clear icon" title="Clear All Filters"><i class="far fa-check-square"></i></button>
			</div>
		`);

		container.querySelector('button.apply').on('click', () => this.apply());
		container.querySelector('button.reload').on('click', () => this.apply({cached: 0}));

		const resetToggle = container.querySelector('button.reset-toggle');

		resetToggle.on('click', () => {

			if (resetToggle.classList.contains('check')) {

				this.all();

				resetToggle.classList.remove('check');
				resetToggle.classList.add('clear');

				resetToggle.title = 'Clear All Filters';
				resetToggle.innerHTML = `<i class="far fa-check-square"></i>`;
			}

			else {

				this.clear();

				resetToggle.classList.add('check');
				resetToggle.classList.remove('clear');

				resetToggle.title = 'Check All Filters';
				resetToggle.innerHTML = `<i class="far fa-square"></i>`;
			}
		});
	}

	apply(options = {}) {

		for (const report of this.page.loadedVisualizations) {
			report.filters.container;
		}

		setTimeout(() => {
			for (const report of this.page.loadedVisualizations) {

				let found = false;

				for (const filter of report.filters.values()) {

					filter.label;

					if (!filter.dataset || !this.has(filter.dataset.id))
						continue;

					filter.dataset.value = this.get(filter.dataset.id);

					found = true;
				}

				if (found) {
					setTimeout(() => report.visualizations.selected.load(options));
					report.container.style.opacity = 1;
				}

				else
					report.container.style.opacity = 0.4;
			}
		});

		Dashboard.selectedValues.clear();
		for (const [key, value] of this) {
			const inputs = [];
			for (const input of value.containerElement.querySelectorAll('.list label')) {
				if (input.querySelector('input').checked) {
					inputs.push(input.querySelector('input').value)
				}
			}
			Dashboard.selectedValues.set(key, inputs);
		}
	}

	clear() {

		for (const dataset of this.values())
			dataset.clear();
	}

	all() {

		for (const dataset of this.values())
			dataset.all();
	}
}

Dashboard.selectedValues = new Map;