Page.class = class DashboardManager extends Page {

	constructor() {

		super();

		this.list = new Map;

		this.listContainer = this.container.querySelector('section#list');

		if(user.privileges.has('dashboard.insert')) {
			this.listContainer.querySelector('#add-dashboard').classList.remove('grey');

			this.listContainer.querySelector('#add-dashboard').on('click', () => {
				DashboardsDashboard.add(this);
				history.pushState({id: 'add'}, '', `/dashboards-manager/add`);
			});
		}

		DashboardsDashboard.setup(this);

		this.parentDashboardMultiselect = new MultiSelect({multiple: false});

		DashboardsDashboard.container.querySelector('.parent-dashboard').appendChild(this.parentDashboardMultiselect.container);

		(async () => {

			await this.load();

			this.loadState();
		})();

		window.on('popstate', e => this.loadState(e.state));
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

		this.process();
		this.render();
	}

	process() {

		this.list.clear();

		for(const dashboard of this.response || []) {

			if(!dashboard.parent)
				this.list.set(dashboard.id, new DashboardsDashboard(dashboard, this.response, this));
		}
	}

	render() {

		const container = this.container.querySelector('.dashboards');

		container.textContent = null;

		for(const dashboard of this.list.values())
			container.appendChild(dashboard.getDashboardContainer());

		if(!this.list.size)
			container.innerHTML = `<div class="NA">No dashboards found!</div>`;

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

			history.pushState({id: 'add'}, '', '/dashboards-manager/add');

			if(await Storage.get('newUser'))
				UserOnboard.setup(true);

			new SnackBar({
				message: 'Dashboard Added',
				subtitle: `${DashboardsDashboard.form.name.value} #${response.insertId}`,
				icon: 'fas fa-plus',
			});

			await Sections.show('list');

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	constructor(data, dashboards, page) {

		for(const key in data)
			this[key] = data[key];

		this.page = page;

		this.children = new Map;

		for(const dashboard of dashboards) {

			if(dashboard.parent == this.id)
				this.children.set(dashboard.id, new DashboardsDashboard(dashboard, dashboards, page))
		}
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

			if(await Storage.get('newUser'))
				UserOnboard.setup(true);

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

	getDashboardContainer() {

		if(this.container)
			return this.container;

		this.container = document.createElement('div');
		this.container.classList.add('parent');

		this.container.innerHTML = `
			<div class="first">
				<div class="name">
					<span class="arrow">
					</span>
					<a href="/dashboard/${this.id}">${this.name}</a>
					<span>#${this.id}</span>
				</div>
				<div>${this.order ? ('Order: ' + this.order) : ''}</div>
				<div title="${!this.editable ? 'Not enough privileges' : 'Edit'}" class="action ${!this.editable ? 'grey' : 'green'}"><i class="far fa-edit"></i></div>
				<div title="${!this.deletable ? 'Not enough privileges' : 'Delete'}" class="action ${!this.deletable ? 'grey' : 'red'}"><i class="far fa-trash-alt"></i></div>
			</div>
		`;

		if(this.container.querySelector('.green')) {
			this.container.querySelector('.green').on('click', e => {

				e.stopPropagation();

				this.edit();
				history.pushState({what: this.id}, '', `/dashboards-manager/${this.id}`);
			});
		}

		if(this.container.querySelector('.red')) {
			this.container.querySelector('.red').on('click', e => {

				e.stopPropagation();

				this.delete()
			});
		}

		if(this.children.size) {

			this.container.insertAdjacentHTML('beforeend', `
				<div class="sub-dashboards"></div>
			`);

			const arrow = this.container.querySelector('.name .arrow');

			arrow.removeEventListener('click', arrow.clickListener);
			arrow.innerHTML = `
				<i class="fas fa-angle-right right-arrow hidden"></i>
				<i class="fas fa-angle-down down-arrow"></i>
`			;

			this.container.querySelector('.first').on('click', arrow.clickListener = e => {

				this.container.querySelector('div.sub-dashboards').classList.toggle('hidden');

				const subDashboardsHidden = this.container.querySelector('div.sub-dashboards').classList.contains('hidden');

				arrow.querySelector('.right-arrow').classList.toggle('hidden', !subDashboardsHidden);
				arrow.querySelector('.down-arrow').classList.toggle('hidden', subDashboardsHidden);

			});

			for(const child of this.children.values()) {

				this.container.querySelector('div.sub-dashboards').appendChild(child.getDashboardContainer());
				child.getDashboardContainer().classList.add('child');
			}
		}

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