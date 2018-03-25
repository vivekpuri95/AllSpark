window.on('DOMContentLoaded', async () => {

	await Dashboards.setup();
	DashboardsDashboard.setup();

	await Dashboards.load();


	Dashboards.loadState();
});

window.on('popstate', e => Dashboards.loadState(e.state));

class Dashboards extends Page {

	static async setup() {

		await Page.setup();

		Dashboards.list = new Map;

		Dashboards.container = document.querySelector('main > #list');

		Dashboards.container.querySelector('#add-dashboard').on('click', () => {
			DashboardsDashboard.add();
			history.pushState({id: 'add'}, '', `/dashboards/add`);
		});
	}

	static async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return DashboardsDashboard.add();

		if(Dashboards.list.has(parseInt(what)))
			return Dashboards.list.get(parseInt(what)).edit();

		Sections.show('list');
	}

	static back() {

		if(history.state)
			return history.back();

		Sections.show('list');
		history.pushState(null, '', `/dashboards`);
	}

	static async load() {

		Dashboards.response = await API.call('dashboards/list');

		await  DataSource.load();

		Dashboards.process();
		Dashboards.render();
	}

	static process() {

		Dashboards.list.clear();

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

		DashboardsDashboard.container.querySelector('#back').on('click', Dashboards.back);

		DashboardsDashboard.editor = new Editor(DashboardsDashboard.container.querySelector('#dashboard-format'));

		DashboardsDashboard.editor.editor.getSession().setMode('ace/mode/json');
	}

	static add() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Add New Dashboard';

		DashboardsDashboard.form.reset();

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = e => DashboardsDashboard.insert(e));

		DashboardsDashboard.editor.value = '';

		Sections.show('form');
	}

	static async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		const parameters = {
			format: DashboardsDashboard.editor.value,
		};

		const response = await API.call('dashboards/insert', parameters, options);

		await Dashboards.load();

		Dashboards.list.get(response.insertId).edit();

		history.pushState({what: response.insertId}, '', `/dashboards/${response.insertId}`);
	}

	constructor(data) {

		for(const key in data)
			this[key] = data[key];
	}

	async edit() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Edit ' + this.name;

		for(const element of DashboardsDashboard.form.elements) {
			if(this[element.name])
				element.value = this[element.name];
		}

		DashboardsDashboard.editor.value = JSON.stringify(this.format || {}, 0, 4) || '';

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = async e => this.update(e));

		Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		try {
			JSON.parse(DashboardsDashboard.editor.value);
		} catch(e) {
			alert(e.message);
			return;
		}

		const parameters = {
			id: this.id,
			format: DashboardsDashboard.editor.value,
		};

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		await API.call('dashboards/update', parameters, options);

		await Dashboards.load();

		Dashboards.list.get(this.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('dashboards/delete', parameters, options);

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
			<td>${this.icon || ''}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState({what: this.id}, '', `/dashboards/${this.id}`);
		});

		this.container.querySelector('.red').on('click', async() => this.delete());

		return this.container;
	}
}