Page.class = class DashboardManager extends Page {

	constructor() {

		super();

		this.list = new Map;

		this.listContainer = this.container.querySelector('section#list');

		this.listContainer.querySelector('#add-dashboard').on('click', () => {
			DashboardsDashboard.add(this);
			history.pushState({id: 'add'}, '', `/dashboards-manager/add`);
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

		this.parentDashboardMultiselect = new MultiSelect({multiple: false});

		DashboardsDashboard.container.querySelector('.parent-dashboard').appendChild(this.parentDashboardMultiselect.container);

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

		history.pushState(null, '', `/dashboards-manager/`);
	}

	async load() {

		this.response = await API.call('dashboards/list');

		await DataSource.load();

		if(await Storage.get('newUser'))
			UserOnboard.setup();

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
			container.innerHTML = `<tr class="NA"><td colspan="2">No dashboards found!</td></tr>`;

		const datalist = [];

		for(const dashboard of this.list.values()) {

			datalist.push({
				value: dashboard.id,
				name: dashboard.name,
				subtitle: dashboard.parents.reverse().map(d => `${d.name} #${d.id}`).join(' &rsaquo; '),
			});
		}

		this.parentDashboardMultiselect.datalist = datalist;
		this.parentDashboardMultiselect.render();
	}
}

class DashboardsDashboard {

	static setup(page) {

		DashboardsDashboard.page = page;

		DashboardsDashboard.container = page.container.querySelector('section#form');
		DashboardsDashboard.form = DashboardsDashboard.container.querySelector('form');

		DashboardsDashboard.container.querySelector('#back').on('click', page.back);

		DashboardsDashboard.editor = new CodeEditor({mode: 'json'});
		DashboardsDashboard.form.querySelector('label#format').appendChild(DashboardsDashboard.editor.container);
	}

	static async add() {

		const response = await API.call('dashboards/list');

		const datalist = response.map(a => {return {name: a.name, value: a.id}});

		DashboardsDashboard.multiselect = new MultiSelect({datalist, multiple: false});

		if(DashboardsDashboard.container.querySelector('.parent-dashboard .multi-select'))
			DashboardsDashboard.container.querySelector('.parent-dashboard .multi-select').remove();

		DashboardsDashboard.container.querySelector('.parent-dashboard').appendChild(DashboardsDashboard.multiselect.container);

		DashboardsDashboard.container.querySelector('h1').textContent = 'Add New Dashboard';

		DashboardsDashboard.form.reset();

		DashboardsDashboard.container.querySelector('#share-dashboards').innerHTML = `<div class="NA">You can share the dashboard once you create one.<div>`;

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
			parent: DashboardsDashboard.multiselect.value[0] || '',
		};

		const response = await API.call('dashboards/insert', parameters, options);

		try {

			await DashboardsDashboard.page.load();

			DashboardsDashboard.page.list.get(response.insertId).edit();

			history.pushState({what: response.insertId}, '', `/dashboards-manager/${response.insertId}`);

			new SnackBar({
				message: 'Dashboard Added',
				subtitle: `${DashboardsDashboard.form.name.value} #${response.insertId}`,
				icon: 'fas fa-plus',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	constructor(data, page) {

		for(const key in data)
			this[key] = data[key];

		this.page = page;
	}

	async edit() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Edit ' + this.name;

		this.objectRoles = new ObjectRoles('dashboard', this.id);

		await this.objectRoles.load();

		DashboardsDashboard.container.querySelector('#share-dashboards').innerHTML = null;
		DashboardsDashboard.container.querySelector('#share-dashboards').appendChild(this.objectRoles.container);

		DashboardsDashboard.form.reset();

		for(const element of DashboardsDashboard.form.elements) {
			if(this[element.name])
				element.value = this[element.name];
		}

		this.page.parentDashboardMultiselect.clear();
		this.page.parentDashboardMultiselect.value = this.parent;

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
			parent: this.page.parentDashboardMultiselect.value[0] || '',
		};

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		try {

			await API.call('dashboards/update', parameters, options);

			await this.page.load();

			this.page.list.get(this.id).edit();

			new SnackBar({
				message: 'Dashboard Saved',
				subtitle: `${this.name} #${this.id}`,
				icon: 'far fa-save',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
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

		try {

			await API.call('dashboards/delete', parameters, options);

			await this.page.load();

			new SnackBar({
				message: 'Dashboard Deleted',
				subtitle: `${this.name} #${this.id}`,
				icon: 'far fa-trash-alt',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td><a href="/dashboard/${this.id}">${this.name}</a></td>
			<td>
				${this.parents.length ? this.parents.reverse().map(d => `
					<a href="/dashboard/${d.id}" target="_blank">${d.name}</a>
					<span class="NA">#${d.id}</span>
				`).join(' &rsaquo; ') : ''}
			</td>
			<td>${this.icon || ''}</td>
			<td>${this.order || ''}</td>
			<td class="action green">Edit</td>
			<td class="action red">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState({what: this.id}, '', `/dashboards-manager/${this.id}`);
		});

		this.container.querySelector('.red').on('click', async() => this.delete());

		return this.container;
	}

	get parents() {

		if(this.parentsList)
			return this.parentsList;

		this.parentsList = [];

		const seen = [];

		let parent = this.parent;

		while(parent) {

			if(!this.page.list.has(parent) || seen.includes(parent))
				break;

			const parentDashboard = this.page.list.get(parent);

			this.parentsList.push(parentDashboard);
			seen.push(parentDashboard.id);

			parent = parentDashboard.parent;
		}

		return this.parentsList;
	}
}