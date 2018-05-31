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
			this.responseList.set(data.id, new SettingManage(data));
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
				<h3>Edit</h3>
				<form id="settings-form">
				</form>
			</section>
		`;

		for(const data of this.responseList.values())
			container.querySelector('table tbody').appendChild(data.row);

		for(const setting of this.settings_format) {

			let setting_type = SettingsManager.list.get(setting.type);
			setting_type = new setting_type(setting);
		}

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

	constructor(setting) {
		this.setting = setting;
	}

	get row() {

		const tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.setting.profile}</td>
			<td class="action red"><i class="fa fa-trash-alt"></i></td>
		`;

		return tr;
	}
}

SettingsManager.list = new Map;

SettingsManager.list.set('string', class {

	constructor(setting_format) {

		this.setting_format = setting_format;
	}

	get container() {

	}

	get value() {

	}

	set value() {

	}
});

















































