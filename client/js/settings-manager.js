class SettingsManager {

	constructor(owner, owner_id, settingsFormat) {
		this.owner = owner;
		this.owner_id = owner_id;
		this.settingsFormat = settingsFormat;
		this.responseList = new Map;
	}

	async load() {

		await this.fetch();
		this.process();
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

		for(const data of this.response) {
			this.responseList.set(data.id, new SettingManage(data, this));
		};
	}

	render() {

		const formContainer = this.form;

		formContainer.querySelector('table tbody').textContent = null;

		for(const data of this.responseList.values())
			formContainer.querySelector('table tbody').appendChild(data.row);

		if(!formContainer.querySelectorAll('table tbody tr').length)
			formContainer.querySelector('table tbody').innerHTML = `<tr><td colspan="2" class="NA">No profile found :(</td></tr>`;

		formContainer.querySelector('table tbody tr').click();
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
							<th class="action">Discard</th>
						</tr>
					</thead>

					<tbody></tbody>

				</table>

				<div class="toolbar">
					<button class="add-form"><i class="fa fa-plus"></i>Add New Profile</button>
				</div>
			</section>

			<section class="profile-container">
				<header class="profile-header">
					<h3>Edit</h3>
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

		this.containerElement.querySelector('.profile-container .profile-header h3').textContent = 'Add New Profile';

		this.containerElement.querySelector('.profile-container form#settings-form').name.value = null;
		this.containerElement.querySelector('.profile-container #settings-form #settings-type-container').textContent = null;

		if(SettingManage.submit_listener)
			this.containerElement.querySelector('.profile-container form').removeEventListener('submit', SettingManage.submit_listener);

		this.containerElement.querySelector('.profile-container form').on('submit', SettingManage.submit_listener = async (e) => {

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

		this.profile.containerElement.querySelector('.profile-container .profile-header h3').textContent = 'Edit ' + this.setting.profile + '\'s profile.';

		this.form = this.profile.containerElement.querySelector('.profile-container form');

		this.form.name.value = this.setting.profile;

		this.xyz = [];

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

			this.xyz.push(formatType);

			main_container.appendChild(formatType.container);
		}

		if(SettingManage.submit_listener)
			this.form.removeEventListener('submit', SettingManage.submit_listener);

		this.form.on('submit', SettingManage.submit_listener =  e => this.update(e));
	}

	async update(e) {

		e.preventDefault();

		const value = [];

		for(const entry of this.xyz) {
			value.push({"key": entry.setting_format.key, "value": entry.value})
		}

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

		const
			options = {
				method: "POST"
			},
			parameters = {
				id: this.setting.id,
			};

		await API.call('settings/delete', parameters, options);
		await this.profile.load();
		this.profile.responseList.get(this.setting.id).edit();
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
				<input type="text" value="">
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

		const datalist = [
			{
				"name": "True",
				"value": "true",
			},
			{
				"name": "False",
				"value": "false",
			}
		];

		this.multiselect = new MultiSelect({datalist: datalist, multiple: false});
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