Page.class = class Dashboards extends Page {

	constructor() {

		super();

		this.list = new Map;

		this.listContainer = this.container.querySelector('section#list');

		this.listContainer.querySelector('#add-dashboard').on('click', () => {
			DashboardsDashboard.add();
			history.pushState({id: 'add'}, '', `/dashboards/add`);
		});

		this.listContainer.querySelector('#import-dashboard').on('click', () => {

			const importButton = document.createElement('input');
			importButton.setAttribute('type', 'file');
			importButton.click();

			importButton.on('change', (selection) => {
				if (!selection.target || !selection.target.files[0])
					return;
				const selectedFile = selection.target.files[0];

				const reader = new FileReader();
				reader.onload = this.sendImported;
				reader.readAsText(selectedFile);
			});
		});

		DashboardsDashboard.setup(this);

		(async () => {

			await this.load();

			this.loadState();
		})();

		window.on('popstate', e => this.loadState(e.state));
	}

	async sendImported(loaded) {

		try {
			JSON.parse(loaded.target.result);
		}
		catch (e) {
			alert('Invalid Json Format');
			return;
		}

		const parameters = {
			json: loaded.target.result
		};
		const options = {
			method: 'POST'
		};

		await API.call('import/dashboard', parameters, options);

		await DashboardsDashboard.page.load();
	}

	async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return DashboardsDashboard.add();

		if(this.list.has(parseInt(what)))
			return this.list.get(parseInt(what)).edit();

		await Sections.show('list');
	}

	async back() {

		if(history.state)
			return history.back();

		await Sections.show('list');

		history.pushState(null, '', `/dashboards`);
	}

	async load() {

		this.response = await API.call('dashboards/list');

		await DataSource.load();

		this.process();
		this.render();
	}

	process() {

		this.list.clear();

		for(const dashboard of this.response || [])
			this.list.set(dashboard.id, new DashboardsDashboard(dashboard, this));
	}

	render() {

		const container = this.container.querySelector('table tbody');

		container.textContent = null;

		for(const dashboard of this.list.values())
			container.appendChild(dashboard.row);

		if(!this.list.size)
			container.innerHTML = `<tr class="NA"><td colspan="2">No dashboards found! :(</td></tr>`;
	}
}

class DashboardsDashboard {

	static setup(page) {

		DashboardsDashboard.page = page;

		DashboardsDashboard.container = page.container.querySelector('section#form');
		DashboardsDashboard.form = DashboardsDashboard.container.querySelector('form');

		DashboardsDashboard.container.querySelector('#back').on('click', page.back);

		DashboardsDashboard.editor = new Editor(DashboardsDashboard.container.querySelector('#dashboard-format'));

		DashboardsDashboard.editor.editor.getSession().setMode('ace/mode/json');
	}

	static async add() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Add New Dashboard';

		DashboardsDashboard.form.reset();

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = e => DashboardsDashboard.insert(e));

		DashboardsDashboard.editor.value = '';

		await Sections.show('form');

		DashboardsDashboard.form.name.focus();
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

		await DashboardsDashboard.page.load();

		DashboardsDashboard.page.list.get(response.insertId).edit();

		history.pushState({what: response.insertId}, '', `/dashboards/${response.insertId}`);
	}

	constructor(data, page) {

		for(const key in data)
			this[key] = data[key];

		this.page = page;
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

		await Sections.show('form');

		DashboardsDashboard.form.name.focus();
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

		await this.page.load();

		this.page.list.get(this.id).edit();
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

		await this.page.load();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td><a href="/dashboard/${this.id}" target="_blank">${this.name}</a></td>
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