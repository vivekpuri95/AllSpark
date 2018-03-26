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
		this.selectedSources = new Set;

		for(const category of MetaData.categories.values())
			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.id}">${category.name}</option>`);

		this.listContainer.form.category.on('change', () => this.renderList());
		this.listContainer.form.search.on('keyup', () => this.renderList());

		this.load();

		window.on('popstate', e => this.load(e.state));
	}

	async load(state) {

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
			this.list.get(id).render();

		else if(id && window.location.pathname.includes('report'))
			this.report(id);

		else
			await ections.show('list');
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

		this.selectedSources.clear();
		this.selectedSources.add(report);

		container.textContent = null;

		report.container.removeAttribute('style');

		container.appendChild(report.container);

		report.visualizations.selected.load();

		await Sections.show('reports');
	}
}

class Dashboard {

	static setup(page) {

		Dashboard.container = page.container.querySelector('section#reports .list');

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

			for(const source of page.selectedSources) {

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
	}

	render() {

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

		this.page.selectedSources.clear();

		if(this.format && this.format.reports && this.format.reports.length) {

			for(const [position, _report] of this.format.reports.entries()) {

				if(!DataSource.list.has(_report.query_id))
					continue;

				const source = JSON.parse(JSON.stringify(DataSource.list.get(_report.query_id)));

				source.visualizations = source.visualizations.concat(_report.visualizations);
				source.postProcessor = _report.postProcessor;

				const report = new DataSource(source);

				report.container.setAttribute('style', `
					order: ${position || 0};
					grid-column: auto / span ${_report.span || 4}
				`);

				Dashboard.container.appendChild(report.container);

				report.visualizations.selected.load();

				this.page.selectedSources.add(report);
			}
		} else {
			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';
		}

		Sections.show('reports');
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
				this.render();
			}
		});

		for(const child of this.children)
			submenu.appendChild(child.menuItem);

		return container;
	}
}