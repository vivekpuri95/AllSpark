window.on('DOMContentLoaded', async () => {

	await Dashboards.setup();

	DashboardReports.setup(document.getElementById('reports-list'));
	DashboardReport.setup();

	Dashboards.load();

	DashboardsDashboard.setup();
});

class Dashboards extends Page {

	static async setup() {

		await Page.setup();

		Dashboards.container = document.querySelector('main > #list');

		Dashboards.container.querySelector('#add-dashboard').on('click', () => DashboardsDashboard.add());
	}

	static async load() {

		Dashboards.response = await API.call('dashboards/list');

		await  DataSource.load();

		Dashboards.process();
		Dashboards.render();
	}

	static process() {

		Dashboards.list = new Map;

		for(const dashboard of Dashboards.response || [])
			Dashboards.list.set(dashboard.id, new DashboardsDashboard(dashboard));
	}

	static render() {

		const container = Dashboards.container.querySelector('table tbody');

		container.textContent = null;

		for(const dashboard of Dashboards.list.values())
			container.appendChild(dashboard.row);

		if(!Dashboards.list.size)
			container.innerHTML = `<tr class="NA"><td colspan="2">No dashboards found! :(</td></tr>`;
	}
}

class DashboardsDashboard {

	static setup() {

		DashboardsDashboard.container = document.querySelector('#form');
		DashboardsDashboard.form = DashboardsDashboard.container.querySelector('form');

		DashboardsDashboard.container.querySelector('#back').on('click', () => {
			Sections.show('list');
		});
	}

	static add() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Add New Dashboard';
		DashboardReports.container.innerHTML = '<div class="NA">You can add visualizations to this report once you add the query.</div>';

		DashboardReport.insert.form.reset();
		DashboardReport.insert.form.classList.add('hidden');

		DashboardsDashboard.form.reset();

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = e => DashboardsDashboard.insert(e));

		Sections.show('form');
	}

	static async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		const response = await API.call('dashboards/insert', {}, options);

		await Dashboards.load();

		Dashboards.list.get(response.insertId).edit();
	}

	constructor(data) {

		for(const key in data)
			this[key] = data[key];

		this.reports = new DashboardReports(this);
	}

	async edit() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Edit ' + this.name;

		for(const element of DashboardsDashboard.form.elements) {
			if(this[element.name])
				element.value = this[element.name];
		}

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = async e => this.update(e));

		if(DashboardReport.insert.form.listener)
			DashboardReport.insert.form.removeEventListener('submit', DashboardReport.insert.form.listener);

		DashboardReport.insert.form.on('submit', DashboardReport.insert.form.listener = e => DashboardReport.insert(e, this));

		DashboardReport.insert.form.reset();
		DashboardReport.insert.form.classList.remove('hidden');

		this.reports.render();

		Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		const parameter = {
			id: this.id,
		}
		await API.call('dashboards/update', parameter, options);

		await Dashboards.load();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		await API.call('dashboards/delete', {id: this.id}, {method: 'POST'});

		await Dashboards.load();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.parent || ''}</td>
			<td>${this.icon}</td>
			<td class="action green">Edit</td>
			<td class="action red">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', async() => this.delete());

		return this.container;
	}
}

class DashboardReports {

	static setup(container) {
		DashboardReports.container = container;
	}

	constructor(dashboard) {

		this.dashboard = dashboard;
		this.list = new Set;

		for(const report of this.dashboard.reports || [])
			this.list.add(new DashboardReport(report, this));
	}

	render() {

		DashboardReports.container.textContent = null;

		for(const report of this.list)
			DashboardReports.container.appendChild(report.row);

		if(!this.list.size)
			DashboardReports.container.innerHTML = '<div class="NA">No reports found!</div>';
	}
}

class DashboardReport {

	static setup() {
		DashboardReport.insert.form = document.getElementById('add-report');
	}

	static async insert(e, reports) {

		e.preventDefault();

		const
			parameters = {
				dashboard: reports.id,
			},
			options = {
				method: 'POST',
				form: new FormData(document.getElementById('add-report')),
			};

		await API.call('reports/dashboards/insert', parameters, options);

		await Dashboards.load(true);

		Dashboards.list.get(reports.id).edit();
	}

	constructor(report, reports) {

		this.reports = reports;

		for(const key in report)
			this[key] = report[key];

		// Generate the form
		this.row;
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('form');
		this.container.classList.add('report');
		this.container.id = 'reports-form-'+this.id;

		this.container.innerHTML = `

			<label>
				<input type="number" name="query_id" placeholder="Report ID" value="${this.query_id}" required>
			</label>

			<label>
				<input type="number" name="position" placeholder="Position" value="${this.position}">
			</label>

			<label>
				<input type="number" name="span" placeholder="Span" min="1" max="4" value="${this.span || 4}" required>
			</label>

			<label class="save">
				<input type="submit" value="Save">
			</label>

			<label class="delete">
				<input type="button" value="Delete">
			</label>
		`;

		this.container.on('submit', e => this.update(e));
		this.container.querySelector('.delete').on('click', () => this.delete());

		if(!parseInt(this.is_enabled))
			this.container.classList.add('disabled');

		return this.container;
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				id: this.id
			},
			options = {
				method: 'POST',
				form: new FormData(this.container),
			};

		await API.call('reports/dashboards/update', parameters, options);

		await Dashboards.load(true);

		Dashboards.list.get(this.reports.dashboard.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('reports/dashboards/delete', parameters, options);

		await Dashboards.load(true);

		Dashboards.list.get(this.reports.dashboard.id).edit();
	}
}