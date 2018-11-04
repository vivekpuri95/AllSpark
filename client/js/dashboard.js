Page.class = class Dashboards extends Page {

	constructor() {

		super();

		Dashboard.setup(this);

		this.list = new Map;
		this.loadedVisualizations = new Set;
		this.nav = document.querySelector('main > nav');

		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

		const menuToggle = document.createElement('span');
		menuToggle.classList.add('menu-toggle');
		menuToggle.innerHTML = `<i class="fa fa-bars"></i>`;
		document.querySelector('header').insertAdjacentElement('afterbegin', menuToggle);

		const navBlanket = this.container.querySelector('.nav-blanket');

		menuToggle.on('click', () => {
			this.nav.classList.toggle('show');
			navBlanket.classList.toggle('hidden');
			menuToggle.classList.toggle('selected');
			this.container.querySelector('.nav-blanket').classList.toggle('hidden', !this.nav.classList.contains('show'));
		});

		navBlanket.on('click', () => {

			this.nav.classList.remove('show');
			navBlanket.classList.add('hidden');
			menuToggle.classList.remove('selected');
			this.container.querySelector('.nav-blanket').classList.toggle('hidden', !this.nav.classList.contains('show'));
		});

		this.nav.querySelector('.collapse-panel').on('click', async () => {

			document.querySelector('body').classList.toggle('floating');

			await Storage.set('menu-collapsed', document.querySelector('body').classList.contains('floating'));
			this.nav.classList.remove('show');
			this.container.querySelector('.nav-blanket').classList.toggle('hidden', !this.nav.classList.contains('show'));
		});

		this.reports.querySelector('.toolbar #back').on('click', async () => {

			await this.renderList();
			await Sections.show('list');
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		for(const category of MetaData.categories.values())
			this.listContainer.form.subtitle.insertAdjacentHTML('beforeend', `<option value="${category.category_id}">${category.name}</option>`);

		this.listContainer.form.subtitle.on('change', () => this.renderList());

		window.on('popstate', e => this.load(e.state));

		this.navbar = new Navbar(new Map, this);

		this.load();
	}

	get currentDashboard() {

		return parseInt(window.location.pathname.split('/').includes('dashboard') ? window.location.pathname.split('/').pop() : 0);
	}

	get searchBar() {

		if(this.searchBarFilter)
			return this.searchBarFilter;

		const filters = [
			{
				key: 'Report ID',
				rowValue: row => [row.query_id],
			},
			{
				key: 'Name',
				rowValue: row => row.name ? [row.name] : [],
			},
			{
				key: 'Description',
				rowValue: row => row.description ? [row.description] : [],
			},
			{
				key: 'Tags',
				rowValue: row => row.tags ? row.tags.split(',') : [],
			},
			{
				key: 'Filters Length',
				rowValue: row => [row.filters.length]
			},
			{
				key: 'Filters Name',
				rowValue: row => row.filters.map(f => f.name),
			},
			{
				key: 'Visualizations Name',
				rowValue: row => row.visualizations.map(f => f.name),
			},
			{
				key: 'Visualizations Type',
				rowValue: row => {
					return row.visualizations.map(f => f.type)
											 .map(m => MetaData.visualizations.has(m) ?
											 (MetaData.visualizations.get(m)).name : []);
				},
			},
			{
				key: 'Visualizations Length',
				rowValue: row => [row.visualizations.length],
			},
			{
				key: 'Report Creation',
				rowValue: row => row.created_at ? [row.created_at] : [],
			},
			{
				key: 'Report Last Updated At',
				rowValue: row => row.updated_at ? [row.updated_at] : [],
			}
		];

		this.searchBarFilter = new SearchColumnFilters({
			data: Array.from(DataSource.list.values()),
			filters: filters,
			advanceSearch: true,
			page,
		});

		this.container.querySelector('.section#list').insertBefore(this.searchBarFilter.container, this.container.querySelector('.section .block'));

		this.container.querySelector('.section#list .toolbar').appendChild(this.searchBarFilter.globalSearch.container);

		this.searchBarFilter.on('change', () => this.renderList());

		this.renderList();
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

		while (dashboard && dashboard.parent && this.list.has(dashboard.parent)) {

			parents.push(dashboard.parent);
			dashboard = this.list.get(dashboard.parent);
		}

		return parents;
	}

	render({dashboardId = 0, renderNav = false, updateNav = true, reloadDashboard = true} = {}) {

		if (dashboardId && reloadDashboard) {

			this.nav.classList.remove('show');
			this.container.querySelector('.nav-blanket').classList.add('hidden');

			(async () => {
				this.loadedVisualizations.clear();
				history.pushState({
					filter: dashboardId,
					type: 'dashboard'
				}, '', `/dashboard/${dashboardId}`);
				await this.list.get(dashboardId).load();
				await this.list.get(dashboardId).render();
			})()
		}

		if (renderNav) {

			this.renderList();
			this.navbar.render();
		}

		if (updateNav) {

			let parentDashboards = this.parents(dashboardId || 0).map(x => `dashboard-${x}`);

			for (const label of this.nav.querySelectorAll('.label')) {

				const submenu = label.parentElement.querySelector('.submenu');

				if (submenu) {

					submenu.classList.add('hidden');
				}

				label.classList.remove('selected');
				label.parentElement.classList.remove('list-open');
			}

			for (const element of parentDashboards) {

				const label = this.nav.querySelector(`#${element}`);

				if (!label) {

					continue;
				}

				const submenu = label.parentElement.querySelector('.submenu');

				submenu && submenu.classList.remove('hidden');
				label && label.classList.add('selected');
				submenu && label.parentElement.classList.add('list-open');
			}
		}
	}

	tagSearch(e) {

		e.stopPropagation();

		const
			searchBarContainer = this.searchBarFilter.container,
			value = e.currentTarget.textContent;

		let existingData = {};

		for(const filter of searchBarContainer.querySelectorAll('select[name="searchType"], input')) {

			if(filter.name == "searchType")
				existingData[filter.name] = filter.value;
			else
				existingData['searchQuery'] = filter.value;

			if(existingData.searchType == 'equalto' && existingData.searchQuery == e.currentTarget.textContent) {

				new SnackBar({
					message: `${existingData.searchQuery} tag already exist.`,
					type: 'error',
				});

				return;
			}
		}

		searchBarContainer.classList.remove('hidden');

		const tagFilter = new SearchColumnFilter(this.searchBarFilter);

		this.searchBarFilter.add(tagFilter);

		this.searchBarFilter.render();
		const searchContainer = tagFilter.container;

		searchContainer.querySelector('.searchQuery').value = value;
		searchContainer.querySelector('.searchValue').value = 'Tags';
		searchContainer.querySelector('.searchType').value = 'equalto';

		this.renderList();
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

		let reports = [];

		if(this.searchBar)
			reports = this.searchBar.filterData;

		for (const report of reports) {

			if (!report.is_enabled || report.is_deleted) {

				continue;
			}

			if (this.listContainer.form.subtitle.value && report.subtitle != this.listContainer.form.subtitle.value) {

				continue;
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
				<td>${MetaData.categories.has(report.subtitle) && MetaData.categories.get(report.subtitle).name || ''}</td>
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
			tbody.innerHTML = `<tr class="NA no-reports"><td colspan="6">No Reports Found!</td></tr>`;
	}

	/**
	 * 0 parent means root, ie any dashboard with 0 parent means that dashboard is root dashboard.
	 flattens dashboard hierarchy and checks if there is single node cycle found.
	 */

	cycle() {

		const simplifiedTreeMapping = new Map;

		for (const node of this.list.keys()) {

			if (!simplifiedTreeMapping.has(node)) {

				simplifiedTreeMapping.set(node, new Set);
			}

			simplifiedTreeMapping.get(node).add(this.list.get(node).parent || 0);
		}

		for (const [dashboardId, parents] of simplifiedTreeMapping.entries()) {

			let moved = true;

			let toDelete = [], toReplace = [];

			while (moved) {

				for (const parent of parents) {

					if(simplifiedTreeMapping.has(parent) && simplifiedTreeMapping.get(parent).has(parent)) {

						this.list.delete(parent);
						moved = false;
						break;
					}

					if (parents.has(0) || parents.has(dashboardId)) {

						this.list.delete(parent);
						moved = false;
						break;
					}

					if(!simplifiedTreeMapping.has(parent)) {

						moved = false;
						break;
					}

					if(simplifiedTreeMapping.has(parent) && simplifiedTreeMapping.get(parent).has(parent)) {

						this.list.delete(parent);
						moved = false;
						break;
					}

					moved = false;

					if (simplifiedTreeMapping.has(parent)) {

						toDelete = [parent];
						moved = true;

						if (simplifiedTreeMapping.has(parent) && simplifiedTreeMapping.get(parent).has(0)) {

							toDelete = [...parents];
							toReplace = [parent];
							moved = false;

							break;
						}

						else {

							toReplace.push(...simplifiedTreeMapping.get(parent));
						}
					}
				}

				for (const element of toDelete) {

					simplifiedTreeMapping.get(dashboardId).delete(element);
				}

				for (const element of toReplace) {

					simplifiedTreeMapping.get(dashboardId).add(element);
				}
			}
		}

		for (const [k, v] of simplifiedTreeMapping) {

			if (v.has(k)) {

				this.list.delete(k);
			}
		}
	}

	async load(state) {

		const
			[_, dashboardList] = await Promise.all([
				DataSource.load(),
				API.call('dashboards/list'),
			]),
			currentId = state ? state.filter : parseInt(window.location.pathname.split('/').pop());

		for (const dashboard of dashboardList) {

			dashboard.children = new Set;
			this.list.set(dashboard.id, new Dashboard(dashboard, this));
		}

		this.cycle();
		this.renderList();

		for (const dashboard of this.list.values()) {

			if (dashboard.parent && this.list.has(dashboard.parent)) {

				(this.list.get(dashboard.parent)).children.add(dashboard);
			}
		}

		const emptyDashboards = [];


		for (const dashboard of this.list.values()) {

			if (dashboard.visibleVisuliaztions.size === 0) {

				emptyDashboards.push(this.parents(dashboard.id));
			}
		}

		for (const dashboard of emptyDashboards) {

			this.list.delete(dashboard);
		}

		this.navbar = new Navbar(this.list, this);

		this.navbar.render();

		if (this.account.settings.get('user_onboarding') && (await Storage.get('newUser') || (this.user.privileges.has('admin') && !DataSource.list.size))) {

			await Storage.set('newUser', (await Storage.get('newUser')) || {});

			Page.loadOnboardScripts();
		}

		if((await Storage.has('menu-collapsed')) && (await Storage.get('menu-collapsed'))) {

			document.querySelector('body').classList.toggle('floating', !document.querySelector('body').classList.contains('floating'));
		}

		if (window.location.pathname.split('/').pop() === 'first') {

			this.navbar.render();

			let dashboardReference = this.container.querySelector('nav .item:not(.hidden)');

			if (!dashboardReference) {

				this.renderList();
				return await Sections.show('list')
			}

			while (dashboardReference.querySelector('.submenu')) {

				dashboardReference.querySelector('.label').click();
				dashboardReference = dashboardReference.querySelector('.submenu');
			}

			return dashboardReference.querySelector('.label').click();
		}


		this.render({dashboardId: 0});

		if (!currentId) {

			return await Sections.show('list');
		}

		if(window.location.pathname.split('/').some(x => x == 'report'))
			return await this.report(currentId);

		if(window.location.pathname.split('/').some(x => x == 'visualization'))
			return await this.report(currentId, true);

		else {

			return this.render({dashboardId: currentId, renderNav: true, updateNav: false});
		}
	}

	async report(id, visualization = false) {

		let report = DataSource.list.get(id);

		if(visualization) {
			for(const source of DataSource.list.values()) {
				if(source.visualizations.some(v => v.visualization_id == id))
					report = source;
			}
		}

		report = new DataSource(report);

		const container = this.reports.querySelector(':scope > .list');

		this.loadedVisualizations.clear();
		this.loadedVisualizations.add(report);

		const dashboardName = this.container.querySelector('.dashboard-name');
		dashboardName.classList.add('hidden');

		container.textContent = null;

		const promises = [];

		for (const filter of report.filters.values()) {

			if (filter.multiSelect) {
				promises.push(filter.fetch());
			}
		}

		await Promise.all(promises);

		report.container.removeAttribute('style');
		container.classList.add('singleton');
		Dashboard.toolbar.classList.add('hidden');

		this.container.querySelector('#reports .global-filters').classList.add('hidden');

		if (!report.container.contains(report.menu))
			report.container.appendChild(report.menu);

		report.menu.classList.remove('hidden');

		if(visualization)
			[report.visualizations.selected] = report.visualizations.filter(v => v.visualization_id == id);

		container.appendChild(report.container);

		report.visualizations.selected.load();

		await Sections.show('reports');
	}
};

class Dashboard {

	constructor(dashboardObject, page) {

		this.page = page;
		this.children = new Set;

		this.parents = new Set;

		if (this.parent) {

			this.parents.add(this.parent);
		}

		Object.assign(this, dashboardObject);

		Dashboard.grid = {
			columns: 32,
			rows: 10,
			rowHeight: 50,
		};

		Dashboard.screenHeightOffset = 1.5 * screen.availHeight;

		this.visibleVisuliaztions = new Set;

		this.visualizations = Dashboard.sortVisualizations(this.visualizations);

		this.resetSideButton();

		for (const visualization of this.visualizations) {

			if (!visualization.format) {

				visualization.format = {};
			}

			if (!DataSource.list.has(visualization.query_id)) {

				continue;
			}

			const dataSource = new DataSource(JSON.parse(JSON.stringify(DataSource.list.get(visualization.query_id))), this.page);

			dataSource.container.setAttribute('style', `
				order: ${visualization.format.position || 0};
				grid-column: auto / span ${visualization.format.width || Dashboard.grid.columns};
				grid-row: auto / span ${visualization.format.height || Dashboard.grid.rows};
			`);

			dataSource.selectedVisualization = dataSource.visualizations.filter(v =>

				v.visualization_id === visualization.visualization_id
			);

			if (!dataSource.selectedVisualization.length) {

				continue;
			}

			dataSource.selectedVisualization = dataSource.selectedVisualization[0];

			this.visibleVisuliaztions.add(dataSource);

			dataSource.container.appendChild(dataSource.selectedVisualization.container);
		}
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

		const fullScreenButton = page.container.querySelector('#reports .toolbar #full-screen');

		fullScreenButton.on('click', () => {

			const dashboardList = page.container.querySelector('#reports');

			if(document.isFullScreen || document.webkitIsFullScreen || document.mozIsFullScreen) {

				if(document.exitFullscreen)
					document.exitFullscreen();

				else if(document.webkitExitFullscreen)
					document.webkitExitFullscreen();

				else if(document.mozExitFullscreen)
					document.mozExitFullscreen();
			}

			else {

				if(dashboardList.requestFullscreen)
					dashboardList.requestFullscreen();

				else if(dashboardList.webkitRequestFullscreen)
					dashboardList.webkitRequestFullscreen();

				else if(dashboardList.mozRequestFullscreen)
					dashboardList.mozRequestFullscreen();
			}
		});

		document.on('webkitfullscreenchange', () => {

			if(document.isFullScreen || document.webkitIsFullScreen || document.mozIsFullScreen)
				fullScreenButton.innerHTML = `<i class="fas fa-compress"></i> Exit Full Screen`;

			else
				fullScreenButton.innerHTML = `<i class="fas fa-expand"></i> Full Screen`;
		});
	}

	static sortVisualizations(visibleVisuliaztions) {

		return visibleVisuliaztions.sort((v1, v2) => v1.format.position - v2.format.position);
	}

	lazyLoad(resize, offset = Dashboard.screenHeightOffset) {

		const visitedVisualizations = new Set;

		for (const [visualization_id, visualization] of this.visualizationTrack) {

			//const visualization_id = visualization.visualization_id;

			if ((parseInt(visualization.position) < this.maxScrollHeightAchieved + offset) && !visualization.loaded) {

				visualization.query.selectedVisualization.load();
				visualization.loaded = true;
				this.page.loadedVisualizations.add(visualization);

				visitedVisualizations.add(visualization_id);
			}

			if (visualization.loaded) {

				visitedVisualizations.add(visualization_id);
			}
		}

		for (const visualizationId of visitedVisualizations.values()) {

			this.visualizationTrack.delete(visualizationId);
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

	edit() {

		Dashboard.editing = true;

		const edit = Dashboard.toolbar.querySelector('#edit-dashboard');

		edit.classList.add('hidden');

		Dashboard.container.classList.add('editing');

		for (let {query: report} of this.page.loadedVisualizations) {

			const [selectedVisualizationProperties] = this.page.list.get(this.id).visualizations.filter(x => x.visualization_id === report.selectedVisualization.visualization_id);

			report.selectedVisualization = selectedVisualizationProperties

			if (!report.format)
				report.format = {};

			report.format.format = selectedVisualizationProperties.format;

			const
				header = report.container.querySelector('header .actions'),
				format = report.selectedVisualization.format;

			if (!format.width)
				format.width = Dashboard.grid.columns;

			if (!format.height)
				format.height = Dashboard.grid.rows;

			header.insertAdjacentHTML('beforeend', `
				<a class="show move-up" title="Move visualization up"><i class="fas fa-angle-double-up"></i></a>
				<a class="show move-down" title="Move visualization down"><i class="fas fa-angle-double-down"></i></a>
				<a class="show remove" title="Remove Graph"><i class="fa fa-times"></i></a>
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

			header.querySelector('.remove').on('click', async () => {

				const
					parameters = {
						id: this.visualizations.filter(r => r.visualization_id == report.visualizations.selected.visualization_id)[0].id,
					},
					options = {
						method: 'POST',
					};

				await API.call('reports/dashboard/delete', parameters, options);

				await this.page.load();
			});

			report.container.insertAdjacentHTML('beforeend', `
				<div class="resize-dimentions hidden"></div>
				<div class="resize" draggable="true" title="Resize Graph"></div>
			`);

			const resize = report.container.querySelector('.resize');

			resize.on('dragstart', e => {
				e.stopPropagation();
				this.page.loadedVisualizations.beingResized = report
			});

			resize.on('dragend', e => {
				e.stopPropagation();
				this.page.loadedVisualizations.beingResized = null;
			});
		}

		Dashboard.container.parentElement.on('dragover', e => {

			e.preventDefault();
			e.stopPropagation();

			const report = this.page.loadedVisualizations.beingResized;

			if (!report)
				return;

			let format = report.format || {};

			if (!format.format)
				format.format = {};

			const
				visualizationFormat = format.format,
				columnStart = getColumn(report.container.offsetLeft),
				newColumn = getColumn(e.clientX) + 1,
				rowStart = getRow(report.container.offsetTop),
				newRow = getRow(e.pageY) + 1;

			if (newRow > rowStart)
				visualizationFormat.height = newRow - rowStart;

			if (newColumn > columnStart && newColumn <= Dashboard.grid.columns)
				visualizationFormat.width = newColumn - columnStart;

			if (
				visualizationFormat.width != report.container.style.gridColumnEnd.split(' ')[1] ||
				visualizationFormat.height != report.container.style.gridRowEnd.split(' ')[1]
			) {

				const dimentions = report.container.querySelector('.resize-dimentions');

				dimentions.classList.remove('hidden');
				dimentions.textContent = `${visualizationFormat.width} x ${visualizationFormat.height}`;

				report.container.setAttribute('style', `
					order: ${report.selectedVisualization.format.position || 0};
					grid-column: auto / span ${visualizationFormat.width || Dashboard.grid.columns};
					grid-row: auto / span ${visualizationFormat.height || Dashboard.grid.rows};
				`);

				if (this.dragTimeout)
					clearTimeout(this.dragTimeout);

				this.dragTimeout = setTimeout(() => report.visualizations.selected.render({resize: true}), 100);

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

	async load() {

		if (this.format && this.format.category_id) {

			this.page.listContainer.form.subtitle.value = this.format.category_id;

			this.page.renderList();

			await Sections.show('list');

			//removing selected from other containers
			for (const element of this.page.container.querySelectorAll('.selected') || []) {

				element.classList.remove('selected');
			}

			return this.page.container.querySelector('#dashboard-' + this.id).parentNode.querySelector('.label').classList.add('selected');
		}

		//no need for dashboard.format

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

	async render(resize) {

		if (this.format && this.format.category_id) {

			return;
		}

		if (!this.globalFilters.size) {

			this.page.container.querySelector('#reports .side').classList.add('hidden');
		}

		Sections.show('reports');

		await API.refreshToken();

		const dashboardName = this.page.container.querySelector('.dashboard-name');

		dashboardName.innerHTML = `
			<span>${this.page.parents(this.id).filter(x => this.page.list.has(x)).map(x => this.page.list.get(x).name).reverse().join(`<span class="NA">&rsaquo;</span>`)}</span>
			<div>
				<span class="toggle-dashboard-toolbar"><i class="fas fa-ellipsis-v"></i></span>
			</div>
		`;

		dashboardName.classList.remove('hidden');

        dashboardName.querySelector('.toggle-dashboard-toolbar').on('click', () => Dashboard.toolbar.classList.toggle('hidden'));

		this.page.render({dashboardId: this.id, renderNav: false, updateNav: true, reloadDashboard: false});

		const main = document.querySelector('main');

		this.visualizationTrack = new Map;

		Dashboard.container.textContent = null;

		for (const queryDataSource of this.visibleVisuliaztions) {

			queryDataSource.container.appendChild(queryDataSource.selectedVisualization.container);

			Dashboard.container.appendChild(queryDataSource.container);

			Dashboard.container.classList.remove('singleton');

			this.visualizationTrack.set(queryDataSource.selectedVisualization.visualization_id, ({
				position: queryDataSource.container.getBoundingClientRect().y,
				query: queryDataSource,
				loaded: false,
			}));
		}

		this.maxScrollHeightAchieved = Math.max(Dashboard.screenHeightOffset, main.scrollTop);

		this.globalFilters.apply({dontLoad: true});
		this.lazyLoad(this.maxScrollHeightAchieved, resize);

		document.addEventListener('scroll',

			() => {

				for (const queryDataSource of this.visibleVisuliaztions) {

					if (this.visualizationTrack.get(queryDataSource.selectedVisualization.visualization_id)) {

						this.visualizationTrack.get(queryDataSource.selectedVisualization.visualization_id).position = queryDataSource.container.getBoundingClientRect().y;
					}
				}

				this.maxScrollHeightAchieved = Math.max(main.scrollTop, this.maxScrollHeightAchieved);
				this.lazyLoad(resize,);

			}, {
				passive: true
			}
		);

		if (!this.page.loadedVisualizations.size) {

			Dashboard.container.innerHTML = '<div class="NA no-reports">No reports found!</div>';
		}

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

		if (Dashboard.selectedValues && Dashboard.selectedValues.size && this.globalFilters.size)
			this.globalFilters.apply();
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

class Navbar {

	constructor(dashboards, page) {

		this.dashboards = dashboards;
		this.page = page;

		this.list = new Map;

		if (this.dashboards.values()) {

			for (const dashboard of this.dashboards.values()) {

				if (!dashboard.parent) {

					this.list.set(dashboard.id, new Nav(dashboard.id, dashboard));
				}
			}

			for (const dashboard of dashboards.values()) {

				this.list.set(dashboard.id, new Nav(dashboard, this.page));
			}
		}
	}

	render() {

		const dashboardHirachy = this.page.nav.querySelector('.dashboard-hierarchy');
		const search = this.page.nav.querySelector('.dashboard-search');

		dashboardHirachy.textContent = null;

		for (const dashboardItem of this.list.values()) {

			if (!dashboardItem.dashboard.parent) {

				dashboardHirachy.append(dashboardItem.menuItem);
			}
		}

		if (dashboardHirachy.querySelectorAll('.item:not(.hidden)').length > 40) {

			search.classList.remove('hidden');
		}

		search.removeEventListener('keyup', this.navSearch);

		search.on('keyup', this.navSearch = () => {

			const searchItem = search.querySelector("input[name='search']").value;

			this.page.render({dashboardId: 0, renderNav: true});

			if (!searchItem.length) {

				return this.page.render({
					dashboardId: this.page.currentDashboard,
					renderNav: true,
					updateNav: true,
					reloadDashboard: false
				});
			}

			let matching = [];

			for (const dashboard of this.dashboards.values()) {

				if (dashboard.name.toLowerCase().includes(searchItem.toLowerCase())) {

					matching = matching.concat(this.page.parents(dashboard.id).map(x => '#dashboard-' + x));

					const re = new RegExp(searchItem, 'ig');

					this.page.nav.querySelector('#dashboard-' + dashboard.id).innerHTML = dashboard.name.replace(re, '<mark>$&</mark>');
				}
			}

			let toShowItems = [];

			try {

				toShowItems = this.page.nav.querySelectorAll([...new Set(matching)].join(', '));
			}
			catch (e) {
			}

			for (const item of toShowItems) {

				const submenu = item.parentNode.querySelector('.submenu');

				if (submenu) {

					submenu.classList.remove('hidden');
				}

				item.querySelector('.angle') ? item.querySelector('.angle').classList.add('down') : {};
			}
		}, {passive: true});
	}
}

class Nav {

	constructor(dashboard, page) {

		this.dashboard = dashboard;
		this.page = page;
	}

	get menuItem() {

		const
			container = this.container = document.createElement('div'),
			allVisualizations = this.childrenVisualizations(this.dashboard);

		let icon;

		if (this.dashboard.icon && this.dashboard.icon.startsWith('http')) {

			icon = `<img src="${this.dashboard.icon}" height="20" width="20">`;
		}

		else if (this.dashboard.icon && this.dashboard.icon.startsWith('fa')) {

			icon = `<i class="${this.dashboard.icon}"></i>`
		}

		else {

			icon = '';
		}

		container.classList.add('item');

		if (!allVisualizations.length && (!this.dashboard.format || !parseInt(this.dashboard.format.category_id))) {

			container.classList.add('hidden');
		}

		container.innerHTML = `
			<div class="label" id=${'dashboard-' + this.dashboard.id}>
				${icon}
				<span class="name">${this.dashboard.name}</span>
				${this.dashboard.children.size ? '<span class="angle"><i class="fa fa-angle-right"></i></span>' : ''}
			</div>
			${this.dashboard.children.size ? '<div class="submenu hidden"></div>' : ''}
		`;

		const submenu = container.querySelector('.submenu');

		for (const child of this.dashboard.children.values()) {

			submenu.appendChild(this.page.navbar.list.get(child.id).menuItem);
		}

		if (this.dashboard.format && this.dashboard.format.hidden) {

			container.classList.add('hidden');
		}

		container.querySelector('.label').on('click', () => {

			this.page.render({
				dashboardId: this.dashboard.visualizations.length || (this.dashboard.format && this.dashboard.format.category_id) ? this.dashboard.id : 0,
				renderNav: false,
				updateNav: false
			});

			if (this.dashboard.page.container.querySelector('nav.collapsed')) {

				this.dashboard.page.render({dashboardId: this.dashboard.id});
			}

			if (this.dashboard.children.size) {

				container.querySelector('.angle').classList.toggle('down');
				submenu.classList.toggle('hidden');
			}

		});

		if (this.dashboard.children.size) {

			container.querySelector('.angle').on('click', (e) => {

				e.stopPropagation();
				container.querySelector('.angle').classList.toggle('down');

				container.parentElement.querySelector('.submenu').classList.toggle('hidden');
			})
		}

		return container;

	}

	childrenVisualizations(dashboard) {
		let visibleVisuliaztions = [];


		function getChildrenVisualizations(dashboard) {

			visibleVisuliaztions = visibleVisuliaztions.concat([...dashboard.visibleVisuliaztions]);

			for (const child of dashboard.children.values()) {

				getChildrenVisualizations(child);
			}
		}

		getChildrenVisualizations(dashboard);

		return visibleVisuliaztions;
	}
}

class DashboardGlobalFilters extends DataSourceFilters {

	constructor(dashboard) {

		const globalFilters = new Map;

		for (const visualization of dashboard.visibleVisuliaztions) {

			for (const filter of visualization.filters.values()) {

				if (!Array.from(MetaData.globalFilters.values()).some(a => a.placeholder.includes(filter.placeholder)))
					continue;

				const globalFilter = Array.from(MetaData.globalFilters.values()).filter(a => a.placeholder.includes(filter.placeholder));

				for (const value of globalFilter) {
					globalFilters.set(value.placeholder, {
						name: value.name,
						placeholder: value.placeholder[0],
						placeholders: value.placeholder,
						default_value: value.default_value,
						dataset: value.dataset,
						multiple: value.multiple,
						offset: value.offset,
						order: value.order,
						type: value.type,
					});
				}
			}
		}

		super(Array.from(globalFilters.values()));

		this.dashboard = dashboard;
		this.page = this.dashboard.page;
		this.globalFilterContainer = this.page.container.querySelector('#reports .global-filters');

		this.globalFilterContainer.classList.add(this.page.account.settings.get('global_filters_position') || 'right');

		document.removeEventListener('scroll', DashboardGlobalFilters.scrollListener);
		document.addEventListener('scroll', DashboardGlobalFilters.scrollListener = e => {
			this.globalFilterContainer.classList.toggle('scrolled', this.globalFilterContainer.getBoundingClientRect().top == 50);
		}, {passive: true});
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
		container.classList.toggle('hidden', !this.size);

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
			<div class="NA no-results hidden">No filters found!</div>
		`;

		this.container.querySelector('.close').remove();

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

		for (const report of this.dashboard.visibleVisuliaztions) {

			let found = false;

			for (const filter of report.filters.values()) {

				let [matchingFilter] = Array.from(this.values()).filter(gfl => gfl.placeholders.includes(filter.placeholder))

				if (!matchingFilter)
					continue;

				filter.value = matchingFilter.value;

				found = true;
			}

			if (options.dontLoad)
				return;

			if (found && Array.from(this.page.loadedVisualizations).some(v => v.query == report))
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