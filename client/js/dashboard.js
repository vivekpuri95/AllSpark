window.on('DOMContentLoaded', async () => {

	await Dashboards.setup();

	const page = new Dashboards();

	await page.load();

	window.on('popstate', e => page.load(e.state));
});

class Dashboards extends Page {

	static async setup() {

		Dashboard.container = document.querySelector('section#reports .list');

		await Page.setup();
	}

	constructor() {

		super();

		this.container = document.querySelector('main');
		this.table = this.container.querySelector('table');
		this.reports = this.container.querySelector('#reports');

		this.reports.querySelector('.toolbar #back').on('click', () => {
			Sections.show('list');
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});

		this.list = new Map;
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

		const
			thead = this.table.querySelector('thead'),
			tbody = this.table.querySelector('tbody');

		tbody.textContent = null;

		thead.innerHTML = `
			<tr>
				<th>ID</th>
				<th>Title</th>
				<th>Description</th>
				<th>Tags</th>
			</tr>
		`;

		for(const report of DataSource.list) {

			if(!report.is_enabled)
				continue;

			const tr = document.createElement('tr');

			tr.innerHTML = `
				<td>${report.query_id}</td>
				<td><a href="#/app/reports-new/${report.query_id}" target="_blank">${report.name}</a></td>
				<td>${report.description || ''}</td>
				<td>${report.tags || ''}</td>
			`;

			tr.on('click', async () => {
				this.report(report.query_id);
				history.pushState({filter: report.query_id}, '', `/report/${report.query_id}`);
			});

			tbody.appendChild(tr);
		}
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

	constructor(dashboard) {

		for(const key in dashboard)
			this[key] = dashboard[key];

		this.sources = new Set(DataSource.list.filter(s => s.dashboards && s.dashboards.filter(d => d.dashboard == this.id).length));

		this.children = new Set;
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