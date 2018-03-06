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

			if(history.state)
				return history.back();

			Sections.show('list');
			history.pushState(null, '', window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/')));
		});
	}

	async load(state) {

		await DataSource.load();

		const id = state ? state.filter : parseInt(window.location.pathname.split('/').pop());

		this.render();

		if(id && window.location.pathname.includes('dashboard')) {
			Sections.show('reports');
			DataSource.dashboards.get(id).render();
		}

		else if(id && window.location.pathname.includes('report'))
			this.report(id);

		else
			Sections.show('list');
	}

	render() {

		const nav = document.querySelector('main > nav');

		if(nav.querySelector('.NA'))
			nav.removeChild(nav.querySelector('.NA'));

		for(const dashboard of DataSource.dashboards.values()) {
			if(!dashboard.parent)
				nav.appendChild(dashboard.menuItem);
		}

		return;

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

		container.appendChild(report.container);

		report.visualizations.selected.load();

		Sections.show('reports');
	}
}