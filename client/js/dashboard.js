window.on('DOMContentLoaded', async () => {

	await Dashboards.setup();
	await Dashboard.setup();

	const page = new Dashboards();

	await page.load();

	window.on('popstate', e => page.load(e.state));
});

class Dashboards extends Page {

	static async setup() {

		await Page.setup();
	}

	constructor() {

		super();

		this.container = document.querySelector('main');
		this.listContainer = this.container.querySelector('section#list');
		this.reports = this.container.querySelector('section#reports');
		this.listContainer.form = this.listContainer.querySelector('.form.toolbar');

		this.reports.querySelector('.toolbar #back').on('click', () => {
			Sections.show('list');
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		this.list = new Map;

		for(const category of MetaData.categories.values())
			this.listContainer.form.category.insertAdjacentHTML('beforeend', `<option value="${category.id}">${category.name}</option>`);

		this.listContainer.form.category.on('change', () => this.renderList());
		this.listContainer.form.search.on('keyup', () => this.renderList());
	}

	async load(state) {

		const responses = await Promise.all([
			API.call('v2/dashboards/list'),
			DataSource.load(),
		]);

		for(const dashboard of responses[0] || [])
			this.list.set(dashboard.id, new Dashboard(dashboard));

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
			Sections.show('list');
	}

	render() {

		const nav = document.querySelector('main > nav');

		if(nav.querySelector('.NA'))
			nav.removeChild(nav.querySelector('.NA'));

		for(const dashboard of this.list.values()) {
			if(!dashboard.parent)
				nav.appendChild(dashboard.menuItem);
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

		for(const report of DataSource.list) {

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
			tbody.innerHTML = `<tr class="NA"><td colspan="5">No Reports Found! :(</td></tr>`;
	}

	report(id) {

		const
			report = DataSource.list.filter(s => s.query_id == id)[0],
			container = this.reports.querySelector('.list');

		container.textContent = null;

		report.container.removeAttribute('style');

		container.appendChild(report.container);

		report.visualizations.selected.load();

		Sections.show('reports');
	}
}

class Dashboard {

	static setup() {

		Dashboard.container = document.querySelector('section#reports .list');

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

			if(!Dashboard.selected)
				return;

			for(const source of Dashboard.selected.sources) {

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

	constructor(dashboard) {

		for(const key in dashboard)
			this[key] = dashboard[key];

		this.sources = new Set(DataSource.list.filter(s => s.dashboards && s.dashboards.filter(d => d.dashboard == this.id).length));

		this.children = new Set;
	}

	render() {

		if(!Dashboard.container)
			return;

		Dashboard.selected = this;

		for(const selected of document.querySelectorAll('main nav .label.selected'))
			selected.classList.remove('selected');

		this.menuItem.querySelector('.label').classList.add('selected');

		let parent = this.menuItem.parentElement.parentElement;

		while(parent.classList && parent.classList.contains('item')) {
			parent.querySelector('.label').classList.add('selected');
			parent = parent.parentElement.parentElement;
		}

		Dashboard.container.textContent = null;

		for(const source of this.sources) {

			const dashboard = source.dashboards.filter(d => d.dashboard == this.id)[0];

			source.container.setAttribute('style', `
				order: ${dashboard.position || 0};
				grid-column: auto / span ${dashboard.span || 4}
			`);

			Dashboard.container.appendChild(source.container);
			source.visualizations.selected.load();
		}

		if(!this.sources.size)
			Dashboard.container.innerHTML = '<div class="NA">No reports found! :(</div>';

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