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

				<form class="add-form form">
					<label>
						<span>Name</span>
						<input type="text" required name="name">
					</label>

					<label>
						<span>Add</span>
						<button type="submit"><i class="fa fa-plus"></i></button>
					</label>
				</form>
			</section>

			<section class="profile-container">
				<header class="profile-header">
					<h3>Edit</h3>
					<button type="submit" form="settings-form">Save</button>
				</header>
				<form id="settings-form">
				</form>
			</section>
		`;

		for(const data of this.responseList.values())
			container.querySelector('table tbody').appendChild(data.row);

		container.querySelector('table tbody tr').click();

		container.querySelector('.add-form').on('submit', SettingsManager.add_listener = e => this.add(e));

		return container;
	}

	async add(e) {

		e.preventDefault();

		const
			options = {
				method: 'POST',
			},
			parameter = {
				account_id: this.account.account_id,
				profile: this.profile_container.querySelector('.add-form').name.value,
				owner: 'account',
				value: [],
			};

		await API.call('settings/insert', parameter, options);
		await this.account.edit();
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

		return tr;
	}

	edit() {

		Array.from(this.profile.profile_container.querySelectorAll('.settings-container table tbody tr')).map( tr => tr.classList.remove('selected'));

		this.tr.classList.add('selected');

		this.profile.profile_container.querySelector('.profile-container .profile-header h3').textContent = 'Edit ' + this.setting.profile + '\'s profile.';

		const container = [];
		this.xyz = [];

		for(const value of this.setting.value) {
			for(const format of this.profile.settings_format) {

				if(format.key != value.key)
					continue;

				let format_type = SettingsManager.list.get(format.type);

				if(!format_type)
					continue;

				format_type = new format_type(format);

				format_type.value = value.value;

				this.xyz.push(format_type);

				container.push(format_type.container);
			}
		}
		const main_container = this.profile.profile_container.querySelector('.profile-container #settings-form');

		main_container.textContent = null;
		for(const value of container) {
			main_container.appendChild(value);
		}

		this.profile.profile_container.querySelector('.profile-container form').on('submit', e => this.update(e));
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
}

class SettingManager{

	constructor(setting_format) {
		this.setting_format = setting_format;
	}
}

SettingsManager.list = new Map;

SettingsManager.list.set('string', class a extends SettingManager {

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

SettingsManager.list.set('multiSelect', class ab extends SettingManager {

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
})

















































