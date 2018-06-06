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
			this.responseList.set(data.id, new ProfileManage(data, this));
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

				<footer>
					<form class="add-form form">
						<label>
							<span>Name</span>
							<input type="text" name="name" placeholder="Add New Profile" required>
						</label>

						<label>
							<span>Add</span>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</form>
				</footer>
			</section>
		`;

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
				account_id: this.owner_id,
				profile: this.containerElement.querySelector('.add-form').name.value,
				owner: this.owner,
				value: JSON.stringify([]),
			};

		const response = await API.call('settings/insert', parameter, options);

		await this.load();

		this.responseList.get(response.insertId).edit();
	}
}
class ProfileManage {

	constructor(setting, parent) {

		for(const key in setting)
			this[key] = setting[key];

		this.parent = parent;
	}

	get row() {

		if(this.tr)
			return this.tr;

		const tr = this.tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.profile}</td>
			<td class="action red"><i class="far fa-trash-alt"></i></td>
		`;

		tr.on('click', () => this.edit());
		tr.querySelector('.action').on('click', (e) => this.delete(e));

		return tr;
	}

	edit() {

		for(const tr of this.parent.containerElement.querySelectorAll('.settings-container table tbody tr'))
			tr.classList.remove('selected');

		this.tr.classList.add('selected');

		this.format = [];

		for(const format of this.parent.settingsFormat) {

			let formatType = SettingsManager.types.get(format.type);

			if(!formatType)
				continue;

			formatType = new formatType(format);

			for(const value of this.value) {
				if(format.key == value.key)
					formatType.value = value.value;
			}

			this.format.push(formatType);

			this.section.querySelector('form').appendChild(formatType.container);

		}

		if(this.parent.containerElement.querySelector('.profile-container'))
			this.parent.containerElement.querySelector('.profile-container').remove();

		this.parent.containerElement.appendChild(this.section);
	}

	get section() {

		if(this.sectionElement)
			return this.sectionElement;

		const section = this.sectionElement = document.createElement('section');
		section.classList.add('profile-container');

		section.innerHTML = `
			<header class="profile-header">
				<h3>${this.profile}</h3>
				<button type="submit" form="settings-form">Save</button>
			</header>

			<form id="settings-form" class="form">
				<label>
					<span> Profile Name</span>
					<input type="text" required name="name" placeholder="Name" value="${this.profile}">
				</label>
			</form>
		`;

		section.querySelector('form').on('submit', (e) => this.update(e));

		return section;
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
				profile: this.section.querySelector('form').name.value,
				id: this.id,
				value: JSON.stringify(value),
			};

		await API.call('settings/update', parameters, options);
		await this.parent.load();
		this.parent.responseList.get(this.id).edit();
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
				id: this.id,
			};

		await API.call('settings/delete', parameters, options);
		await this.parent.load();
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

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.setting_format.name}</span>
			<input type="text" value="" placeholder="String">
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

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.setting_format.name}</span>
			<input type="number" value="" placeholder="Number">
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

SettingsManager.types.set('code', class extends SettingManager {

	constructor(setting_format) {

		super(setting_format);

		this.editContainer = new Editor(document.createElement('div'));
	}

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');
		container.classList.add('code-type-editor');

		container.innerHTML = `
			<span>${this.setting_format.name}</span>
		`;

		container.appendChild(this.editContainer.container);

		return container;
	}

	get value() {

		return this.editContainer.value;
	}

	set value(params) {

		this.editContainer.value = params;
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

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.setting_format.name}</span>
		`;

		container.appendChild(this.multiselect.container);

		return container;
	}

	get value() {

		return this.multiselect.value;
	}

	set value(params) {

		this.multiselect.value = params;
	}
});