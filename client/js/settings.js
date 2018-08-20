class Settings extends Page {

	constructor() {

		(async() => {

			super();

			const nav = this.container.querySelector('nav');

			for (const [key, settings] of Settings.list) {

				if(key == 'accounts' && !this.user.privileges.has('superadmin'))
					continue;

				const setting = new settings(this.container);

				const a = document.createElement('a');

				a.textContent = setting.name;

				a.on('click', async () => {

					await Storage.set('settingsCurrentTab', setting.name);

					for (const a of nav.querySelectorAll('a.selected'))
						a.classList.remove('selected');

					for (const a of this.container.querySelectorAll('.setting-page'))
						a.classList.add('hidden');

					a.classList.add('selected');

					await setting.setup();

					setting.load();
					setting.container.classList.remove('hidden');
				});

				nav.appendChild(a);
			}

			await this.loadDefault();
		})();
	}

	async loadDefault() {

		let byDefault;

		if(await Storage.has('settingsCurrentTab')) {

			const tab = await Storage.get('settingsCurrentTab');

			for(const a of this.container.querySelectorAll('nav a')) {
				if(a.textContent == tab)
					byDefault = a;
			}
		}
		else
			byDefault = this.container.querySelector('nav a');

		byDefault.classList.add('selected');

		for (const [key, settings] of Settings.list) {

			const setting = new settings(this.container);

			if (byDefault.textContent == setting.name) {

				await setting.setup();

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

Settings.list.set('accounts', class Accounts extends SettingPage {

	get name() {
		return 'Accounts';
	}

	setup() {

		this.container = this.page.querySelector('.accounts-page');
		this.form = this.container.querySelector('#accounts-form');

		this.container.querySelector('#accounts-list #add-account').on('click', () => SettingsAccount.add(this));
		this.container.querySelector('#accounts-form #cancel-form').on('click', () => Sections.show('accounts-list'));
	}

	async load() {

		const list = await API.call('accounts/list');

		this.list = new Map;

		for(const account of list)
			this.list.set(account.account_id, new SettingsAccount(account, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#accounts-list table tbody');

		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<tr><td class="NA" colspan="5">No Accounts Found</td></tr>';

		for(const account of this.list.values())
			container.appendChild(account.row);

		await Sections.show('accounts-list');
	}
});

Settings.list.set('globalFilters', class GlobalFilters extends SettingPage {

	get name() {
		return 'Global Filters';
	}

	async setup() {

		this.container = this.page.querySelector('.global-filters-page');
		this.form = this.container.querySelector('section#global-filters-form form');

		this.container.querySelector('#global-filters-list #add-global-filter').on('click', () => GlobalFilter.add(this));
		this.container.querySelector('#global-filters-form #cancel-form').on('click', () => Sections.show('global-filters-list'));

		await DataSource.load();

		const datalist = [];

		for(const report of DataSource.list.values()) {

			datalist.push({
				name: `${report.name} <span class="NA">#${report.query_id}</span>`,
				value: report.query_id,
			});
		}

		this.datasetsMultiselect =  new MultiSelect({datalist, dropDownPosition: 'top', multiple: false});

		if(this.form.querySelector('.datasets .multi-select'))
			this.form.querySelector('.datasets .multi-select').remove();

		this.form.querySelector('.datasets').appendChild(this.datasetsMultiselect.container);

		const select = this.form.querySelector('select[name="type"]');

		for(const type of MetaData.filterTypes.values())
			select.insertAdjacentHTML('beforeend', `<option value="${type.name.toLowerCase()}">${type.name}</option>`);
	}

	async load() {

		const response = await API.call('global-filters/list');

		this.list = new Map;

		for (const data of response)
			this.list.set(data.id, new GlobalFilter(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#global-filters-list table tbody');

		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<tr><td colspan="5" class="NA">No Global Filters Found</td></tr>'

		for(const globalFilter of this.list.values())
			container.appendChild(globalFilter.row);

		await Sections.show('global-filters-list');
	}
});

Settings.list.set('privileges', class Privileges extends SettingPage {

	get name() {
		return 'Privileges';
	}

	setup() {

		this.container = this.page.querySelector('.privilege-page');
		this.form = this.container.querySelector('section#privileges-form form');

		this.container.querySelector('#privileges-list #add-privilege').on('click', () => SettingsPrivilege.add(this));
		this.container.querySelector('#privileges-form #cancel-form').on('click', () => Sections.show('privileges-list'));
	}

	async load() {

		const response = await API.call('privileges/list');

		this.list = new Map;

		for(const data of response)
			this.list.set(data.privilege_id, new SettingsPrivilege(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#privileges-list table tbody');

		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<tr><td class="NA" colspan="5">No Privileges Found</td></tr>';

		for(const dataset of this.list.values())
			container.appendChild(dataset.row);

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

		this.container.querySelector('#roles-list #add-role').on('click', () => SettingsRole.add(this));
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
			container.innerHTML = '<tr><td class="NA" colspan="5">No Roles Found</td></tr>';

		for(const role of this.list.values())
			container.appendChild(role.row);

		await Sections.show('roles-list');
	}
});

Settings.list.set('categories', class Categories extends SettingPage {

	get name() {
		return 'Categories';
	}

	setup() {

		this.container = this.page.querySelector('.category-page');
		this.form = this.page.querySelector('#category-edit');

		this.container.querySelector('#category-list #add-category').on('click', () => SettingsCategory.add(this));
		this.container.querySelector('#category-edit #back').on('click', () => Sections.show('category-list'));
	}

	async load() {

		const categoryList = await API.call('category/list');

		this.list = new Map();

		for(const category of categoryList)
			this.list.set(category.category_id, new SettingsCategory(category, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#category-list table tbody');

		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<tr><td class="NA" colspan="5">No Categories Found</td></tr>';

		for(const category of this.list.values())
			container.appendChild(category.row);

		await Sections.show('category-list');
	}
});

class SettingsAccount {

	constructor(account, page) {

		Object.assign(this, account);

		this.page = page;

		this.form = this.page.form.querySelector('#account-form');

		page.container.querySelector('#cancel-form').on('click', () => Sections.show('accounts-list'));
	}

	static async add(page) {

		SettingsAccount.form = page.form.querySelector('#account-form');

		SettingsAccount.form.reset();

		SettingsAccount.form.logo.src = '';
		SettingsAccount.form.querySelector('#logo').classList.add('hidden');

		SettingsAccount.form.icon.src = '';
		SettingsAccount.form.querySelector('#icon').classList.add('hidden');

		if(SettingsAccount.form.parentElement.querySelector('.feature-form'))
			SettingsAccount.form.parentElement.querySelector('.feature-form').remove();

		if(SettingsAccount.form.parentElement.querySelector('.settings-manager'))
			SettingsAccount.form.parentElement.querySelector('.settings-manager').remove();

		await Sections.show('accounts-form');

		page.form.querySelector('h1').textContent = 'Add New Account';

		page.form.removeEventListener('submit', SettingsAccount.submitEventListener);
		page.form.on('submit', SettingsAccount.submitEventListener = e => SettingsAccount.insert(e, page));

		SettingsAccount.form.name.focus();
	}

	static async insert(e, page) {

		if(e && e.preventDefault)
			e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(SettingsAccount.form),
		};

		try {

			const response = await API.call('accounts/insert', {}, options);

			await page.load();

			page.list.get(response.account_id).edit();

			new SnackBar({
				message: 'Account Added',
				subtitle: `${SettingsAccount.form.name.value} #${response.account_id}`,
				icon: 'fa fa-plus',
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

	async edit() {

		this.page.container.querySelector('#accounts-form h1').textContent = `Editing ${this.name}`;

		this.form.querySelector('#icon').src = this.icon;
		this.form.querySelector('#logo').src = this.logo;

		for(const input of this.form.elements) {
			if(input.name in this)
				input.value = this[input.name];
		}

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
				key: 'enable_dashboard_share',
				type: 'toggle',
				name: 'Allow Users to share dashboard via email',
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

		this.form.removeEventListener('submit', SettingsAccount.submitEventListener);
		this.form.on('submit', SettingsAccount.submitEventListener = e => this.update(e));

		await Sections.show('accounts-form');
		this.form.name.focus();
	}

	async update(e) {

		if (e && e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				account_id: this.account_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		try {

			await API.call('accounts/update', parameters, options);

			await this.page.load();

			new SnackBar({
				message: 'Account Saved',
				subtitle: `${this.form.name.value} #${this.account_id}`,
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
			options = {
				method: 'POST',
			},
			parameter = {
				account_id: this.account_id
			};

		try {

			await API.call('accounts/delete', parameter, options);

			await this.page.load();

			new SnackBar({
				message: 'Account Deleted',
				subtitle: `${this.name} #${this.account_id}`,
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

		const tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.account_id}</td>
			<td>${this.name}</td>
			<td><a href="http://${this.url}" target="_blank">${this.url}</td>
			<td><img src="${this.icon}" height="30"></td>
			<td><img src="${this.logo}" height="30"></td>
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

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th class="action">ID</th>
							<th>Types</th>
							<th>Name</th>
							<th>Slug</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
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
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found</td></tr>`;
		});

		container.querySelector('.feature-type').on('change', (e) => {

			const selected = this.featureType.value;

			tbody.textContent = null;

			if(!selected.length) {
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found</td></tr>`;
				return;
			};

			for(const feature of this.totalFeatures.values()) {

				if(selected.indexOf(feature.type) >= 0)
					tbody.appendChild(feature.row);
			};

			if(!tbody.childElementCount)
				tbody.innerHTML = `<tr><td colspan=4 class="NA">No Feature found</td></tr>`;
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
			<td>${this.slug}</td>
			<td class="feature-toggle">
				<div>
					<label><input type="radio" name="status-${this.feature_id}" value="1"> Enabled</label>
					<label><input type="radio" name="status-${this.feature_id}" value="0"> Disabled</label>
				<div>
			</td>
		`;

		for(const input of tr.querySelectorAll('input')) {

			if(parseInt(input.value) == this.status)
				input.checked = true;

			input.on('change', e => this.update(e, parseInt(input.value)));
		}

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
				status,
			};

		try {

			await API.call('accounts/features/toggle', parameter, options);

			new SnackBar({
				message: `${this.name} Feature ${status ? 'Enabled' : 'Disabled'}`,
				subtitle: this.type,
				icon: status ? 'fas fa-check' : 'fas fa-ban',
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
}

class GlobalFilter {

	constructor(globalFilter, globalFilters) {

		for (const key in globalFilter)
			this[key] = globalFilter[key];

		this.globalFilters = globalFilters;
	}

	static add(globalFilters) {

		const datalist = [];

		globalFilters.datasetsMultiselect.clear();

		globalFilters.container.querySelector('#global-filters-form h1').textContent = 'Add new Global Filter';
		globalFilters.form.reset();

		globalFilters.form.removeEventListener('submit', GlobalFilter.submitListener);

		globalFilters.form.on('submit', GlobalFilter.submitListener = e => GlobalFilter.insert(e, globalFilters));

		Sections.show('global-filters-form');

		globalFilters.form.name.focus();
	}

	static async insert(e, globalFilters) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(globalFilters.form),
		};

		try {

			const response = await API.call('global-filters/insert', {dataset: globalFilters.datasetsMultiselect.value}, options);

			await globalFilters.load();

			new SnackBar({
				message: `${globalFilters.form.name.value} Global Filter Added`,
				subtitle: `Type: <strong>${MetaData.filterTypes.get(globalFilters.form.type.value).name}</strong> Placeholer: <strong>${globalFilters.form.placeholder.value}</strong></span>`,
				icon: 'fa fa-plus',
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

		if (this.container)
			return this.container;

		let dataset = '';

		if(DataSource.list.has(this.dataset))
			dataset = DataSource.list.get(this.dataset).name;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.placeholder}</td>
			<td>${this.default_value}</td>
			<td>${this.type}</td>
			<td>${this.multiple ? 'Yes' : 'No'}</td>
			<td>${isNaN(parseInt(this.offset)) ? '' : this.offset}</td>
			<td><a target="_blank" href="/report/${this.dataset}">${dataset}</a></td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());
		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}

	async edit() {

		const datalist = [];

		this.globalFilters.form.reset();

		for(const element of this.globalFilters.form.elements) {
			if(this[element.name])
				element.value = this[element.name];
		}

		this.globalFilters.form.offset.value = isNaN(parseInt(this.offset)) ? '' : this.offset;
		this.globalFilters.datasetsMultiselect.value = this.dataset;

		this.globalFilters.container.querySelector('#global-filters-form h1').textContent = 'Edit ' + this.name;

		this.globalFilters.form.removeEventListener('submit', GlobalFilter.submitListener);
		this.globalFilters.form.on('submit', GlobalFilter.submitListener = e => this.update(e));

		await Sections.show('global-filters-form');

		this.globalFilters.form.name.focus();
	}

	async update(e) {

		e.preventDefault();

		const
			parameter = {
				id: this.id,
				dataset: this.globalFilters.datasetsMultiselect.value,
			},
			options = {
				method: 'POST',
				form: new FormData(this.globalFilters.form),
			};

		try {

			await API.call('global-filters/update', parameter, options);

			await this.globalFilters.load();

			new SnackBar({
				message: `${this.globalFilters.form.name.value} Global Filter Saved`,
				subtitle: `Type: <strong>${MetaData.filterTypes.get(this.globalFilters.form.type.value).name}</strong> Placeholer: <strong>${this.globalFilters.form.placeholder.value}</strong></span>`,
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

		if (!confirm('Are you sure?'))
			return;

		const
			options = {
				method: 'POST',
			},
			parameter = {
				id: this.id,
			};

		try {

			await API.call('global-filters/delete', parameter, options);

			await this.globalFilters.load();

			new SnackBar({
				message: `${this.name} Global Filter Deleted`,
				subtitle: `Type: <strong>${MetaData.filterTypes.get(this.type).name}</strong> Placeholer: <strong>${this.placeholder}</strong>`,
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

		privileges.form.removeEventListener('submit', SettingsPrivilege.submitListener);
		privileges.form.on('submit', SettingsPrivilege.submitListener = e => SettingsPrivilege.insert(e, privileges));

		await Sections.show('privileges-form');
		privileges.form.name.focus();
	}

	static async insert(e, privileges) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(privileges.form),
		};

		try {

			const response = await API.call('privileges/insert', {}, options);

			await privileges.load();

			new SnackBar({
				message: 'Privilege Added',
				subtitle: `${privileges.form.name.value} #${response.insertId}`,
				icon: 'fa fa-plus',
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
		this.privileges.form.name.focus();
	}

	async update(e) {

		e.preventDefault();

		const
			parameter = {
				privilege_id: this.privilege_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.privileges.form),
			};

		try {

			await API.call('privileges/update', parameter, options);

			await this.privileges.load();

			new SnackBar({
				message: 'Privilege Saved',
				subtitle: `${this.privileges.form.name.value} #${this.privilege_id}`,
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

		if (!confirm('Are you sure?'))
			return;

		const
			parameter = {
				privilege_id: this.privilege_id,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('privileges/delete', parameter, options);

			await this.privileges.load();

			new SnackBar({
				message: 'Privilege Deleted',
				subtitle: `${this.name} #${this.privilege_id}`,
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
}

class SettingsRole {

	constructor(role, roles) {

		for(const key in role)
			this[key] = role[key];

		this.roles = roles;
	}

	static add(roles) {

		roles.container.querySelector('#roles-form h1').textContent = 'Add New Role';
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
		};

		try {

			const response = await API.call('roles/insert', {}, options);

			await roles.load();

			new SnackBar({
				message: 'Role Added',
				subtitle: `${roles.form.name.value} #${response.insertId}`,
				icon: 'fa fa-plus',
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

	async update(e) {

		e.preventDefault();

		const
			parameter = {
				role_id: this.role_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.roles.form),
			};

		try {

			await API.call('roles/update', parameter, options);

			await this.roles.load();

			new SnackBar({
				message: 'Role Saved',
				subtitle: `${this.roles.form.name.value} #${this.role_id}`,
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

		if(!confirm('Are you sure?'))
			return;

		const
			parameter = {
				role_id: this.role_id,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('roles/delete', parameter, options);

			await this.roles.load();

			new SnackBar({
				message: 'Role Deleted',
				subtitle: `${this.name} #${this.role_id}`,
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
		};

		try {

			const response = await API.call('category/insert', {}, options);

			await page.load();

			new SnackBar({
				message: 'Category Added',
				subtitle: `${SettingsCategory.form.name.value} #${response.insertId}`,
				icon: 'fa fa-plus',
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

	async edit() {

		this.form.removeEventListener('submit', SettingsCategory.submitListener);

		this.form.on('submit', SettingsCategory.submitListener = e => this.update(e));
		this.page.form.querySelector('h1').textContent = `Editing ${this.name}`;

		const formElements = ['name', 'slug', 'parent', 'is_admin'];

		for(const element of formElements)
			this.form[element].value = this[element];

		await Sections.show('category-edit');
		this.form.name.focus();
	}

	async update(e) {

		if (e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				category_id: this.category_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		try {

			await API.call('category/update', parameters, options);

			await this.page.load();

			new SnackBar({
				message: 'Category Saved',
				subtitle: `${this.form.name.value} #${this.category_id}`,
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

		if(!confirm('Are you sure?'))
			return;

		const
			parameter = {
				category_id: this.category_id,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('category/delete', parameter, options);

			await this.page.load();

			new SnackBar({
				message: 'Category Deleted',
				subtitle: `${this.name} #${this.category_id}`,
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
			<td>${this.category_id}</td>
			<td>${this.name}</td>
			<td>${this.slug}</td>
			<td>${parseInt(this.parent) || ''}</td>
			<td>${this.is_admin ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());
		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}
}