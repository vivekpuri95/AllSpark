class SettingsManager {

	constructor(owner, owner_id, settingsFormat) {
		this.owner = owner;
		this.owner_id = owner_id;
		this.settingsFormat = settingsFormat;
		this.responseList = new Map;
	}

	async load() {

		await this.fetch();
		await this.process();
		this.render();
	}

	async fetch() {

		const
			option = {
				method: "GET",
			},
			parameter = {
				account_id: this.owner_id,
			};

		this.response = await API.call('settings/list', parameter, option);
	}

	process() {

		this.responseList.clear();

		for(const data of this.response) {
			this.responseList.set(data.id, new SettingManage(data, this));
		};
	}

	render() {

		const formContainer = this.form;
		const tbody = formContainer.querySelector('table tbody');
		formContainer.querySelector('table tbody').textContent = null;

		for(const data of this.responseList.values())
			tbody.appendChild(data.row);

		if(!tbody.querySelectorAll('tr').length)
			tbody.innerHTML = `<tr><td colspan="2" class="NA">No profile found :(</td></tr>`;

		tbody.querySelector('tr').click();
	}

	get form() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('settings-container');

		container.innerHTML = `
			<section class="sideBar">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th class="action">Delete</th>
						</tr>
					</thead>

					<tbody></tbody>

				</table>

				<div class="toolbar">
					<button class="add-form"><i class="fa fa-plus"></i>Add New Profile</button>
				</div>
			</section>

			<section class="profile-container hidden">
				<header class="profile-header">
					<h3></h3>
					<button type="submit" form="settings-form">Save</button>
				</header>
				<form id="settings-form">
					<div class="form">
						<label>
							<span> Profile Name</span>
							<input type="text" required name="name" placeholder="Name">
						</label>
					</div>

					<div id="settings-type-container"></div>
				</form>
			</section>
		`;

		container.querySelector('.add-form').on('click', SettingsManager.add_listener = e => this.add(e));

		return container;
	}

	async add(e) {

		e.preventDefault();

		this.containerElement.querySelector('.profile-container').classList.remove('hidden');

		const form = this.containerElement.querySelector('.profile-container form#settings-form');

		this.containerElement.querySelector('.profile-container .profile-header h3').textContent = 'Add New Profile';

		form.name.value = null;
		form.querySelector('#settings-type-container').textContent = null;

		if(SettingManage.submit_listener)
			form.removeEventListener('submit', SettingManage.submit_listener);

		form.on('submit', SettingManage.submit_listener = async (e) => {

			e.preventDefault();

			const
				options = {
					method: 'POST',
				},
				parameter = {
					account_id: this.owner_id,
					profile: this.containerElement.querySelector('#settings-form').name.value,
					owner: this.owner,
					value: JSON.stringify([]),
				};

			const response = await API.call('settings/insert', parameter, options);

			await this.load();

			this.responseList.get(response.insertId).edit();
		});
	}
}
class SettingManage {

	constructor(setting, profile) {

		this.setting = setting;
		this.profile = profile;
	}

	get row() {

		if(this.tr)
			return this.tr;

		const tr = this.tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.setting.profile}</td>
			<td class="action red"><i class="fa fa-trash-alt"></i></td>
		`;

		tr.on('click', () => this.edit());
		tr.querySelector('.action').on('click', (e) => this.delete(e));

		return tr;
	}

	edit() {

		for(const tr of this.profile.containerElement.querySelectorAll('.settings-container table tbody tr'))
			tr.classList.remove('selected');

		this.tr.classList.add('selected');

		this.profile.containerElement.querySelector('.profile-container').classList.remove('hidden');

		this.profile.containerElement.querySelector('.profile-container .profile-header h3').textContent = 'Edit ' + this.setting.profile + '\'s profile.';

		this.form = this.profile.containerElement.querySelector('.profile-container form');

		this.form.name.value = this.setting.profile;

		this.format = [];

		const main_container = this.form.querySelector('#settings-type-container');

		main_container.textContent = null;

		for(const format of this.profile.settingsFormat) {

			let formatType = SettingsManager.types.get(format.type);

			if(!formatType)
				continue;

			formatType = new formatType(format);

			for(const value of this.setting.value) {
				if(format.key == value.key)
					formatType.value = value.value;
			}

			this.format.push(formatType);

			main_container.appendChild(formatType.container);
		}

		if(SettingManage.submit_listener)
			this.form.removeEventListener('submit', SettingManage.submit_listener);

		this.form.on('submit', SettingManage.submit_listener =  e => this.update(e));
	}

	async update(e) {

		e.preventDefault();

		const value = [];

		this.format.map(x => value.push({"key": x.setting_format.key, "value": x.value}));

		const
			options = {
				method: "POST"
			},
			parameters = {
				profile: this.form.name.value,
				id: this.setting.id,
				value: JSON.stringify(value),
			};

		await API.call('settings/update', parameters, options);
		await this.profile.load();
		this.profile.responseList.get(this.setting.id).edit();
	}

	async delete(e) {

		e.stopPropagation();
		e.stopPropagation();

		if(!confirm('Are you sure ?'))
			return;

		const
			options = {
				method: "POST"
			},
			parameters = {
				id: this.setting.id,
			};

		await API.call('settings/delete', parameters, options);
		await this.profile.load();
	}
}
class SettingManager{

	constructor(setting_format) {
		this.setting_format = setting_format;
	}
}

SettingsManager.types = new Map;

SettingsManager.types.set('string', class extends SettingManager {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('div');
		container.classList.add('form');

		container.innerHTML = `
			<label>
				<span>${this.setting_format.name}</span>
				<input type="text" value="" placeholder="String">
			</label>
		`;

		return container;
	}

	get value() {

		return this.container.querySelector('input').value;
	}

	set value(param) {

		this.container.querySelector('input').value = param;
	}
});

SettingsManager.types.set('number', class extends SettingManager {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('div');
		container.classList.add('form');

		container.innerHTML = `
			<label>
				<span>${this.setting_format.name}</span>
				<input type="number" value="" placeholder="Number">
			</label>
		`;

		return container;
	}

	get value() {

		return this.container.querySelector('input').value;
	}

	set value(param) {

		this.container.querySelector('input').value = param;
	}
});

SettingsManager.types.set('multiSelect', class extends SettingManager {

	constructor(setting_format) {

		super(setting_format);

		this.multiselect = new MultiSelect({datalist: this.setting_format.datalist, multiple: this.setting_format.multiple});
	}

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('div');
		container.classList.add('form');

		container.innerHTML = `
			<label>
				<span>${this.setting_format.name}</span>
			</label>
		`;

		container.querySelector('label').appendChild(this.multiselect.container);

		return container;
	}

	get value() {

		return this.multiselect.value;
	}

	set value(params) {

		this.multiselect.value = params;
	}
});