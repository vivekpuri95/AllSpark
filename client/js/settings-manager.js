class SettingsManager {

	constructor(account,settings_format) {
		this.account = account;
		this.settings_format = settings_format;
	}

	async load() {

		const
			option = {
				method: "GET",
			},
			parameter = {
				account_id: this.account.account_id,
			};

		const response = await API.call('settings/list', parameter, option);
		this.responseList = new Map;

		for(const data of response) {
			this.responseList.set(data.id, new SettingManage(data, this));
		};
	}

	get container() {

		const container = this.profile_container = document.createElement('div');
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

		for(const data of this.responseList.values())
			container.querySelector('table tbody').appendChild(data.row);

		if(!container.querySelector('table tbody').childElementCount)
			container.querySelector('table tbody').innerHTML = `<tr><td class="NA">No profile found :(</td></tr>`;

		container.querySelector('table tbody tr').click();

		container.querySelector('.add-form').on('click', SettingsManager.add_listener = e => this.add(e));

		return container;
	}

	async add(e) {

		e.preventDefault();

		this.newEntry = [];

		this.profile_container.querySelector('.profile-container .profile-header h3').textContent = 'Add New Profile';

		this.profile_container.querySelector('.profile-container form#settings-form').name.value = null;
		this.profile_container.querySelector('.profile-container #settings-form #settings-type-container').textContent = null;

		for(const setting of this.settings_format) {

			let setting_type = SettingsManager.types.get(setting.type);

			if(!setting_type)
				continue;

			setting_type = new setting_type(setting);
			this.profile_container .querySelector('.profile-container #settings-form #settings-type-container').appendChild(setting_type.container)
			this.newEntry.push(setting_type);
		}

		if(SettingManage.submit_listener)
			this.profile_container.querySelector('.profile-container form').removeEventListener('submit', SettingManage.submit_listener);

		const value = [];
		this.profile_container.querySelector('.profile-container form').on('submit', SettingManage.submit_listener = async (e) => {

			for(const entry of this.newEntry) {
				value.push({"key": entry.setting_format.key, "value": entry.value})
			}

			const
				options = {
					method: 'POST',
				},
				parameter = {
					account_id: this.account.account_id,
					profile: this.profile_container.querySelector('#settings-form').name.value,
					owner: 'account',
					value: JSON.stringify(value),
				};

			await API.call('settings/insert', parameter, options);
			await this.account.edit();
		})
	}
}

class SettingManage {

	constructor(setting, profile) {

		this.setting = setting;
		this.profile = profile;
	}

	get row() {

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

		Array.from(this.profile.profile_container.querySelectorAll('.settings-container table tbody tr')).map( tr => tr.classList.remove('selected'));

		this.tr.classList.add('selected');

		this.profile.profile_container.querySelector('.profile-container .profile-header h3').textContent = 'Edit ' + this.setting.profile + '\'s profile.';

		this.profile.profile_container.querySelector('.profile-container form#settings-form').name.value = this.setting.profile;

		const container = [];
		this.xyz = [];

		for(const value of this.setting.value) {
			for(const format of this.profile.settings_format) {

				if(format.key != value.key)
					continue;

				let format_type = SettingsManager.types.get(format.type);

				if(!format_type)
					continue;

				format_type = new format_type(format);

				format_type.value = value.value;

				this.xyz.push(format_type);

				container.push(format_type.container);
			}
		}
		const main_container = this.profile.profile_container.querySelector('.profile-container #settings-form #settings-type-container');

		main_container.textContent = null;
		for(const value of container) {
			main_container.appendChild(value);
		}

		if(SettingManage.submit_listener)
			this.profile.profile_container.querySelector('.profile-container form').removeEventListener('submit', SettingManage.submit_listener);

		this.profile.profile_container.querySelector('.profile-container form').on('submit', SettingManage.submit_listener =  e => this.update(e));
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
				profile: this.setting.profile,
				id: this.setting.id,
				value: JSON.stringify(value),
			};

		await API.call('settings/update', parameters, options);
		await this.profile.account.edit();
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
		await this.profile.account.edit();
	}
}

class SettingManager{

	constructor(setting_format) {
		this.setting_format = setting_format;
	}
}

SettingsManager.types = new Map;

SettingsManager.types.set('string', class extends SettingManager {

	constructor(setting_format) {

		super(setting_format);
	}

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