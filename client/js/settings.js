class Settings extends Page {

	constructor() {
		super();

		const nav = this.container.querySelector('nav');

		for (const [key, settings] of Settings.list) {

			if(key == 'accounts' && !this.user.privileges.has('superadmin'))
				continue;

			const setting = new settings(this.container);

			const a = document.createElement('a');

			a.textContent = setting.name;

			a.on('click', () => {

				localStorage.settingsCurrentTab = setting.name;

				for (const a of nav.querySelectorAll('a.selected'))
					a.classList.remove('selected');

				for (const a of this.container.querySelectorAll('.setting-page'))
					a.classList.add('hidden');

				a.classList.add('selected');
				setting.setup();
				setting.load();
				setting.container.classList.remove('hidden');
			});

			nav.appendChild(a);
		}

		let byDefault;

		if(localStorage.settingsCurrentTab) {

			for(const a of this.container.querySelectorAll('nav a')) {
				if(a.textContent == localStorage.settingsCurrentTab)
					byDefault = a;
			}
		}
		else {
			byDefault = this.container.querySelector('nav a');
		}

		byDefault.classList.add('selected');

		for (const [key, settings] of Settings.list) {

			const setting = new settings(this.container);

			if (byDefault.textContent == setting.name) {
				setting.setup();
				setting.load();
				setting.container.classList.remove('hidden');
			}
		}
	}
}

Page.class = Settings;

class SettingPage {

	constructor(page) {
		this.page = page;
	}
}

Settings.list = new Map;

Settings.list.set('datasets', class Datasets extends SettingPage {

	get name() {
		return 'Datasets';
	}

	setup() {

		this.container = this.page.querySelector('.datasets-page');
		this.form = this.container.querySelector('section#datasets-form form');

		for (const data of MetaData.categories.values()) {
			this.form.category_id.insertAdjacentHTML('beforeend', `
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		this.container.querySelector('section#datasets-list #add-datset').on('click', () => SettingsDataset.add(this));

		this.container.querySelector('#datasets-form #cancel-form').on('click', () => {
			Sections.show('datasets-list');
		});
	}

	async load() {

		const response = await API.call('datasets/list');

		this.list = new Map;

		for (const data of response)
			this.list.set(data.id, new SettingsDataset(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#datasets-list table tbody')
		container.textContent = null;

		if (!this.list.size)
			container.innerHTML = '<tr class="NA"><td colspan="10">No rows found :(</td></tr>'

		for (const dataset of this.list.values()) {
			container.appendChild(dataset.row);
		}

		await Sections.show('datasets-list');
	}
});

Settings.list.set('privileges', class Privileges extends SettingPage {

	get name() {
		return 'Privileges';
	}

	setup() {

		this.container = this.page.querySelector('.privilege-page');
		this.form = this.container.querySelector('section#privileges-form form');

		this.container.querySelector('section#privileges-list #add-privilege').on('click', () => SettingsPrivilege.add(this));

		this.container.querySelector('#privileges-form #cancel-form').on('click', () => {
			Sections.show('privileges-list');
		});
	}

	async load() {

		const response = await API.call('privileges/list');

		this.list = new Map;

		for (const data of response)
			this.list.set(data.privilege_id, new SettingsPrivilege(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#privileges-list table tbody')
		container.textContent = null;

		if (!this.list.size)
			container.innerHTML = '<div class="NA">No rows found :(</div>'

		for (const dataset of this.list.values()) {
			container.appendChild(dataset.row);
		}

		await Sections.show('privileges-list');
	}
});

Settings.list.set('roles', class Roles extends SettingPage {

	get name() {

		return 'Roles';
	}

	setup() {

		this.container = this.page.querySelector('.roles-page');
		this.form = this.page.querySelector('#role-form');

		this.container.querySelector('#add-role').on('click', () => SettingsRole.add(this));
		this.container.querySelector('#roles-form #back').on('click', () => Sections.show('roles-list'));
	}

	async load() {

		const roles_list = await API.call('roles/list');

		this.list = new Map();

		for(const role of roles_list)
			this.list.set(role.role_id, new SettingsRole(role, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#roles-list table tbody');
		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<div class="NA">No rows found :(</div>'

		for(const role of this.list.values())
			container.appendChild(role.row);

		await Sections.show('roles-list');
	}
});

Settings.list.set('accounts', class Accounts extends SettingPage {

	get name() {

		return 'Accounts';
	}

	setup() {

		this.container = this.page.querySelector('.accounts-page');
		this.form = this.container.querySelector('#accounts-form');

		this.container.querySelector('section#accounts-list #add-account').on('click', () => SettingsAccount.add(this));

		this.container.querySelector('#accounts-form #cancel-form').on('click', () => {
			Sections.show('accounts-list');
		});

		SettingsAccount.editor = new Editor(this.form.querySelector("#settings-format"));
		SettingsAccount.editor.editor.getSession().setMode('ace/mode/json');
	}

	async load() {

		const list = await API.call("accounts/list");
		this.list = new Map;

		for(const account of list) {

			this.list.set(account.account_id, new SettingsAccount(account, this));
		}

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#accounts-list table tbody');
		container.innerHTML = "";

		if(!this.list.size) {

			container.innerHTML = '<div class="NA">No Account found :(</div>';
		}

		for(const account of this.list.values()) {

			container.appendChild(account.row);
		}

		await Sections.show('accounts-list');
	}
});

Settings.list.set('categories', class Categories extends SettingPage {

	get name() {

		return 'Categories';
	}

	setup() {

		this.container = this.page.querySelector('.category-page');
		this.form = this.page.querySelector('#category-edit');

		this.container.querySelector('#add-category').on('click', () => SettingsCategory.add(this));
		this.form.querySelector('#back').on('click', () => Sections.show('category-list'));
	}

	async load() {

		const categoryList = await API.call('category/list');
		this.list = new Map();

		for(const category of categoryList) {

			this.list.set(category.category_id, new SettingsCategory(category, this));
		}

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#category-list table tbody');
		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<div class="NA">No rows found :(</div>'

		for(const category of this.list.values())
			container.appendChild(category.row);

		await Sections.show('category-list');
	}
});

class SettingsDataset {

	constructor(dataset, datasets) {

		for (const key in dataset)
			this[key] = dataset[key];

		this.datasets = datasets;
	}

	static add(datasets) {

		datasets.container.querySelector('#datasets-form h1').textContent = 'Add new Dataset';
		datasets.form.reset();

		datasets.form.removeEventListener('submit', SettingsDataset.submitListener);

		datasets.form.on('submit', SettingsDataset.submitListener = e => SettingsDataset.insert(e, datasets));

		Sections.show('datasets-form');

		datasets.form.focus();
	}

	static async insert(e, datasets) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(datasets.form),
		}

		const response = await API.call('datasets/insert', {}, options);

		await datasets.load();

		await datasets.list.get(response.insertId).edit();
	}

	get row() {

		if (this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.category_id && MetaData.categories.has(this.category_id) ? MetaData.categories.get(this.category_id).name : ''}</td>
			<td><a href="/report/${this.query_id}" target="_blank">${this.query_id}</td>
			<td>${this.order || ''}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}

	async edit() {

		this.datasets.container.querySelector('#datasets-form h1').textContent = 'Edit ' + this.name;
		this.datasets.form.reset();

		this.datasets.form.name.value = this.name;
		this.datasets.form.category_id.value = this.category_id;
		this.datasets.form.query_id.value = this.query_id;
		this.datasets.form.order.value = this.order;

		this.datasets.form.removeEventListener('submit', SettingsDataset.submitListener);
		this.datasets.form.on('submit', SettingsDataset.submitListener = e => this.update(e));

		await Sections.show('datasets-form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			id: this.id,
		}

		const options = {
			method: 'POST',
			form: new FormData(this.datasets.form),
		}

		await API.call('datasets/update', parameter, options);

		await this.datasets.load();

		this.datasets.list.get(this.id).edit();
		await Sections.show('datasets-form');
		this.datasets.list.get(this.id).edit();
	}

	async delete() {

		if (!confirm('Are you sure?'))
			return;

		const options = {
			method: 'POST',
		}
		const parameter = {
			id: this.id,
		}

		await API.call('datasets/delete', parameter, options);
		await this.datasets.load();
	}
}

class SettingsPrivilege {

	constructor(privilege, privileges) {

		for (const key in privilege)
			this[key] = privilege[key];

		this.privileges = privileges;
	}

	static async add(privileges) {

		privileges.container.querySelector('#privileges-form h1').textContent = 'Add new Privileges';
		privileges.form.reset();

		if (SettingsPrivilege.submitListener)
			privileges.form.removeEventListener('submit', SettingsPrivilege.submitListener);

		privileges.form.on('submit', SettingsPrivilege.submitListener = e => SettingsPrivilege.insert(e, privileges));

		await Sections.show('privileges-form');
	}

	static async insert(e, privileges) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(privileges.form),
		}

		const response = await API.call('privileges/insert', {}, options);

		await privileges.load();

		await privileges.list.get(response.insertId).edit();
	}

	get row() {

		if (this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.privilege_id}</td>
			<td>${this.name}</td>
			<td>${this.is_admin ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}

	async edit() {

		this.privileges.container.querySelector('#privileges-form h1').textContent = 'Edit ' + this.name;
		this.privileges.form.reset();

		this.privileges.form.name.value = this.name;
		this.privileges.form.is_admin.value = this.is_admin;

		this.privileges.form.removeEventListener('submit', SettingsPrivilege.submitListener);
		this.privileges.form.on('submit', SettingsPrivilege.submitListener = e => this.update(e));

		await Sections.show('privileges-form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			privilege_id: this.privilege_id,
		}

		const options = {
			method: 'POST',
			form: new FormData(this.privileges.form),
		}

		await API.call('privileges/update', parameter, options);

		await this.privileges.load();

		this.privileges.list.get(this.privilege_id).edit();

		await Sections.show('privileges-form');
	}

	async delete() {

		if (!confirm('Are you sure?'))
			return;

		const options = {
			method: 'POST',
		}
		const parameter = {
			privilege_id: this.privilege_id,
		}

		await API.call('privileges/delete', parameter, options);
		await this.privileges.load();
	}
}

class SettingsRole {

	constructor(role, roles) {

		for(const key in role)
			this[key] = role[key];

		this.roles = roles;
	}

	static add(roles) {

		roles.container.querySelector('#roles-form h1').textContent = 'Add new Role';
		roles.form.reset();

		roles.form.removeEventListener('submit', SettingsRole.submitListener);
		roles.form.on('submit', SettingsRole.submitListener = e => SettingsRole.insert(e, roles));
		Sections.show('roles-form');
		roles.form.name.focus();
	}

	static async insert(e, roles) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(roles.form),
		}

		await API.call('roles/insert', {}, options);
		await roles.load();
	}

	async edit() {

		this.roles.form.removeEventListener('submit', SettingsRole.submitListener);
		this.roles.form.reset();

		this.roles.form.on('submit', SettingsRole.submitListener = e => this.update(e));
		this.roles.container.querySelector('#roles-form h1').textContent = `Editing ${this.name}`;
		this.roles.form.name.value = this.name;
		this.roles.form.is_admin.value = this.is_admin;

		await Sections.show('roles-form');
		this.roles.form.name.focus();
	}

	async update(e){

		e.preventDefault();

		const
			parameter = {
				role_id: this.role_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.roles.form),
			};

		await API.call('roles/update', parameter, options);

		await this.roles.load();
		this.roles.list.get(this.role_id).edit();

		await Sections.show('roles-form');
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			options = {
				method: 'POST',
			},
			parameter = {
				role_id: this.role_id
			}

		await API.call('roles/delete', parameter, options);
		await this.roles.load();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.role_id}</td>
			<td>${this.name}</td>
			<td>${this.is_admin ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());
		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}
}

class SettingsAccount {

	constructor(account, page) {

		Object.assign(this, account);
		this.page = page;
		this.form = this.page.form.querySelector('#account-form');
	}

	static async add(page) {

		SettingsAccount.page = page;

		SettingsAccount.form = page.form.querySelector('#account-form');

		SettingsAccount.form.reset();
		SettingsAccount.editor.value = '';

		SettingsAccount.form.logo.src = '';
		SettingsAccount.form.querySelector('#logo').classList.add('hidden');

		SettingsAccount.form.icon.src = '';
		SettingsAccount.form.querySelector('#icon').classList.add('hidden');

		page.form.querySelector('#cancel-form').on('click', () => {
			SettingsAccount.form.removeEventListener('submit', SettingsAccount.submitEventListener);
			Sections.show('accounts-list')
		});

		await Sections.show('accounts-form');

		page.form.querySelector('h1').textContent = 'Adding new Account';
		page.form.removeEventListener('submit', SettingsAccount.submitEventListener);

		page.form.on('submit', SettingsAccount.submitEventListener =  async e => {
			await SettingsAccount.insert(e);
			await page.load();
			await Sections.show('accounts-form');
		});
	}

	static async insert(e) {

		if(e && e.preventDefault)
			e.preventDefault();

		const
			options = {
				method: 'POST',
				form: new FormData(SettingsAccount.form),
			};

		return await API.call('accounts/insert', {}, options);
	}

	async edit() {

		this.page.container.querySelector('#accounts-form h1').textContent = `Editing ${this.name}`;

		this.form.querySelector('#icon').src = this.icon;
		this.form.querySelector('#logo').src = this.logo;

		for(const input of this.form.elements) {
			if(input.name in this)
				input.value = this[input.name];
		}

		SettingsAccount.editor.value = JSON.stringify(this.settings, 0, 4) || '';

		const features = new AccountsFeatures(this);

		if(this.form.parentElement.querySelector('.feature-form'))
			this.form.parentElement.querySelector('.feature-form').remove();

		const settings_json = [
			{
				key: 'top_nav_position',
				type: 'multiselect',
				name: 'Top Navigation Bar Position',
				description: 'The main navigation bar of the site',
				datalist: [
					{name: 'Top', value: 'top'},
					{name: 'Left', value: 'left'},
				],
				multiple: false,
			},
			{
				key: 'global_filters_position',
				type: 'multiselect',
				name: 'Global Filters Position',
				description: 'Global Filters available on dashboards',
				datalist: [
					{name: 'Top', value: 'top'},
					{name: 'Right', value: 'right'},
				],
				multiple: false,
			},
			{
				key: 'pre_report_api',
				type: 'string',
				name: 'Pre Report API',
				description: 'An API that is hit before any report is executed',
			},
			{
				key: 'load_saved_connection',
				type: 'number',
				name: 'Store Report Result Connection ID',
				description: 'The Connection where the report\'s result will be saved in',
			},
			{
				key: 'load_saved_database',
				type: 'string',
				name: 'Store Report Result Database',
				description: 'The database where the report\'s result will be saved in',
			},
			{
				key: 'enable_account_signup',
				type: 'toggle',
				name: 'Allow User Signup',
			},
			{
				key: 'disable_footer',
				type: 'toggle',
				name: 'Disable Footer',
			},
			{
				key: 'disable_powered_by',
				type: 'toggle',
				name: 'Disable "Powered By"',
			},
			{
				key: 'custom_js',
				type: 'code',
				mode: 'javascript',
				name: 'Custom JavaScript',
				description: 'Custom JavaScript for this account'
			},
			{
				key: 'custom_css',
				type: 'code',
				mode: 'css',
				name: 'Custom CSS',
				description: 'Custom CSS for this account'
			},
			{
				key: 'external_parameters',
				type: 'json',
				name: 'External Parameters',
				description: 'External Parameter for this account'
			},
		];

		const settingsContainer = new SettingsManager('account', this.account_id, settings_json);

		await settingsContainer.load();

		if(this.form.parentElement.querySelector('.settings-manager'))
			this.form.parentElement.querySelector('.settings-manager').remove();

		this.form.parentElement.appendChild(settingsContainer.form);

		this.form.parentElement.appendChild(features.container);

		await Sections.show('accounts-form');

		this.form.removeEventListener('submit', SettingsAccount.submitEventListener);

		this.form.on('submit', SettingsAccount.submitEventListener = async e => {
			await this.update(e);
			await this.page.load();
			await Sections.show('accounts-form');
		});
	}

	async update(e) {

		if (e && e.preventDefault)
			e.preventDefault();

		const
			parameter = {
				account_id: this.account_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		return await API.call('accounts/update', parameter, options);
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			options = {
				method: 'POST',
			},
			parameter = {
				account_id: this.account_id
			};

		await API.call('accounts/delete', parameter, options);
		await this.page.load();
	}

	get row() {

		const tr = document.createElement('tr');

		const whiteListElements = ['account_id', 'name', 'icon', 'url', 'logo', 'auth_api'];

		for (const element in this) {

			if (!whiteListElements.includes(element))
				continue;

			const td = document.createElement('td');

			td.innerHTML = this[element];
			tr.appendChild(td);

			if (['icon', 'logo'].includes(element)) {
				td.innerHTML = `<img src=${this[element]} height="30">`
			}
		}

		tr.innerHTML += `
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		tr.querySelector('.green').on('click', () => this.edit());
		tr.querySelector('.red').on('click', () => this.delete());

		return tr;
	}
}

class AccountsFeatures {

	constructor(account) {

		this.account = account;

		this.totalFeatures = new Map;

		for(const [key, feature] of MetaData.features) {
			feature.status = this.account.features.includes(key.toString());
			this.totalFeatures.set(key, new AccountsFeature(feature, this.account));
		}
	}

	get container() {

		const container = document.createElement('div');

		container.classList.add('feature-form');
		container.innerHTML = `

			<h3>Features</h3>

			<div class="toolbar form">

				<label class="feature-type">
					<span>Types</span>
				</label>

				<label>
					<span>Search</span>
					<input id="feature-search" type="text" placeholder="Search..">
				</label>
			</div>
			<table>
				<thead>
					<tr>
						<th class="action">ID</th>
						<th>Types</th>
						<th>Name</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`;

		let list = new Set;

		for(const value of MetaData.features.values())
			list.add(value.type);

		list = Array.from(list).map(x => {return {name: x, value: x}});

		this.featureType = new MultiSelect({datalist: Array.from(list), multiple: true});

		container.querySelector('.feature-type').appendChild(this.featureType.container);

		const tbody = container.querySelector('tbody');

		tbody.textContent = null;

		for(const feature of this.totalFeatures.values())
			tbody.appendChild(feature.row);

		container.querySelector('#feature-search').on('keyup', (e) => {

			e.preventDefault();

			const key = e.currentTarget.value.toLowerCase();

			tbody.textContent = null;

			for(const feature of this.totalFeatures.values()) {

				if(feature.name.includes(key) && this.featureType.value.indexOf(feature.type) >= 0)
					tbody.appendChild(feature.row);
			}

			if(!tbody.childElementCount)
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found :(</td></tr>`;
		});

		container.querySelector('.feature-type').on('change', (e) => {

			const selected = this.featureType.value;

			tbody.textContent = null;

			if(!selected.length) {
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found :(</td></tr>`;
				return;
			};

			for(const feature of this.totalFeatures.values()) {

				if(selected.indexOf(feature.type) >= 0)
					tbody.appendChild(feature.row);
			};

			if(!tbody.childElementCount)
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found :(</td></tr>`;
		});

		return container;
	}
}

class AccountsFeature {

	constructor(feature, account) {

		for(const key in feature)
			this[key] = feature[key];

		this.account = account;
	}

	get row() {

		const tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.feature_id}</td>
			<td>${this.type}</td>
			<td>${this.name}</td>
			<td>
				<select id="status">
					<option value="1">ON</option>
					<option value="0">OFF</option>
				</select>
			</td>
		`;

		const status = tr.querySelector('select#status');
		status.value =  this.status ? 1 : 0;

		status.on('change', async (e) => this.update(e, status.value));

		return tr;
	}

	async update(e, status) {

		e.preventDefault();

		const
			options = {
				method: 'POST',
			},
			parameter = {
				account_id: this.account.account_id,
				feature_id: this.feature_id,
				status: status,
			};

		await API.call('accounts/features/toggle', parameter, options);
		await this.account.page.load();
		await Sections.show('accounts-form');
	}
}

class SettingsCategory {

	constructor(category, page) {

		Object.assign(this, category);

		this.page = page;
		this.form = this.page.form.querySelector('#category-form');
	}

	static add(page) {

		page.form.querySelector('h1').textContent = 'Add new Category';

		const categoryForm = page.form.querySelector('#category-form');

		SettingsCategory.form = categoryForm;
		categoryForm.reset();

		categoryForm.removeEventListener('submit', SettingsCategory.submitListener);
		categoryForm.on('submit', SettingsCategory.submitListener = e => SettingsCategory.insert(e, page));
		Sections.show('category-edit');
		categoryForm.name.focus();
	}

	static async insert(e, page) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(SettingsCategory.form),
		}

		await API.call('category/insert', {}, options);
		await page.load();
	}

	async edit() {

		this.form.removeEventListener('submit', SettingsCategory.submitListener);

		this.form.on('submit', SettingsCategory.submitListener = e => this.update(e));
		this.page.form.querySelector('h1').textContent = `Editing ${this.name}`;

		const formElements = ["name", "slug", "parent", "is_admin"];

		for(const element of formElements) {
			this.form[element].value = this[element];
		}

		await Sections.show('category-edit');
		this.form.name.focus();
	}

	async update(e) {

		if (e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				category_id: this.category_id
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		await API.call('category/update', parameters, options);
		await this.page.load();
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			options = {
				method: 'POST',
			},
			parameter = {
				category_id: this.category_id
			}

		await API.call('category/delete', parameter, options);
		await this.page.load();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.category_id}</td>
			<td>${this.name}</td>
			<td>${this.slug}</td>
			<td>${this.parent}</td>
			<td>${this.is_admin ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());
		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}
}