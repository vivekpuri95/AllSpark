class SettingsManager {

	constructor(owner, owner_id, format) {
		this.owner = owner;
		this.owner_id = owner_id;
		this.format = format;
		this.profiles = new Map;
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

		this.profiles.clear();

		for(const data of this.response) {
			this.profiles.set(data.id, new ProfileManage(data, this));
		}
	}

	render() {

		const formContainer = this.form;
		const tbody = formContainer.querySelector('table tbody');
		tbody.textContent = null;

		for(const data of this.profiles.values())
			tbody.appendChild(data.row);

		if(!this.profiles.size)
			tbody.innerHTML = `<tr><td colspan="2" class="NA">No profile found :(</td></tr>`;

		tbody.querySelector('tr').click();
	}

	get form() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('settings-container');

		container.innerHTML = `
			<section class="side-bar">
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
							<span></span>
							<input type="text" name="name" placeholder="New Profile Name" required>
						</label>

						<label>
							<span></span>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</form>
				</footer>
			</section>
		`;

		container.querySelector('.add-form').on('submit', e => this.add(e));

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
				profile: this.form.querySelector('.add-form').name.value,
				owner: this.owner,
				value: JSON.stringify([]),
			};

		const response = await API.call('settings/insert', parameter, options);

		await this.load();

		this.profiles.get(response.insertId).edit();
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

		if(this.parent.form.querySelector('.settings-container table tbody tr.selected'))
			this.parent.form.querySelector('.settings-container table tbody tr.selected').classList.remove('selected');

		this.tr.classList.add('selected');

		if(this.parent.form.querySelector('.profile-container'))
			this.parent.form.querySelector('.profile-container').remove();

		this.parent.form.appendChild(this.section);
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

		this.typeFormat = [];

		for(const format of this.parent.format) {

			let formatType = SettingsManager.types.get(format.type.toLowerCase());

			if(!formatType)
				continue;

			formatType = new formatType(format);

			for(const value of this.value || []) {
				if(format.key == value.key)
					formatType.value = value.value;
			}

			this.typeFormat.push(formatType);
		}

		const form = this.section.querySelector('form');

		for(const element of this.typeFormat)
			form.appendChild(element.container);

		section.querySelector('form').on('submit', (e) => this.update(e));

		return section;
	}

	async update(e) {

		e.preventDefault();

		const value = [];

		this.typeFormat.map(x => value.push({"key": x.key, "value": x.value}));

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
		this.parent.profiles.get(this.id).edit();
	}

	async delete(e) {

		e.stopPropagation();

		if(!confirm('Are you sure?'))
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

class FormatType {

	constructor(setting_format) {

		for(const key in setting_format)
			this[key] = setting_format[key];
	}
}

SettingsManager.types = new Map;

SettingsManager.types.set('string', class extends FormatType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			<input type="text" placeholder="String">
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

SettingsManager.types.set('toggle', class extends FormatType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			<select>
				<option value="0">Disabled</option>
				<option value="1">Enabled</option>
			</select>
		`;

		return container;
	}

	get value() {

		return this.container.querySelector('select').value;
	}

	set value(param) {

		this.container.querySelector('select').value = param;
	}
});

SettingsManager.types.set('number', class extends FormatType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
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

SettingsManager.types.set('code', class extends FormatType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');
		container.classList.add('code-type-editor');

		container.innerHTML = `
			<span>${this.name}</span>
			<div class="edit">
				<div class="content"></div>
			</div>
			<div class="click-to-edit">Click to edit</div>
		`;

		container.querySelector('.click-to-edit').on('click', () => this.renderEditor());

		return container;
	}

	renderEditor() {

		this.div.querySelector('.edit').classList.add('hidden');
		this.div.querySelector('.click-to-edit').classList.add('hidden');

		this.editor = new Editor(document.createElement('div'));

		if(this.mode)
			this.editor.editor.getSession().setMode(`ace/mode/${this.mode}`);

		this.div.appendChild(this.editor.container);

		this.editor.value = this.data;
	}

	get value() {

		if(this.editor)
			return this.editor.value;

		return this.data;
	}

	set value(params) {

		this.data = params;

		if(this.editor)
			this.editor.value = this.data;
		else
			this.container.querySelector('.edit .content').textContent = this.data.split(';')[0];
	}
});

SettingsManager.types.set('json', class extends FormatType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');
		container.classList.add('code-type-editor');

		container.innerHTML = `
			<span>${this.name}</span>
			<div class="edit">
				<div class="content"></div>
			</div>
			<div class="click-to-edit">Click to edit</div>
		`;

		container.querySelector('.click-to-edit').on('click', () => this.renderEditor());

		return container;
	}

	renderEditor() {

		this.div.querySelector('.edit').classList.add('hidden');
		this.div.querySelector('.click-to-edit').classList.add('hidden');

		this.editor = new Editor(document.createElement('div'));

		this.editor.editor.getSession().setMode(`ace/mode/json`);

		this.div.appendChild(this.editor.container);

		this.editor.value = JSON.stringify(this.data, 0, 4);
	}

	get value() {

		if(this.editor)
			return JSON.parse(this.editor.value);

		return JSON.parse(this.data);
	}

	set value(params) {

		this.data = params;

		if(this.editor)
			this.editor.value = JSON.stringify(this.data, 0, 4);
		else
			this.container.querySelector('.edit .content').textContent = JSON.stringify(this.data).split('')[0];
	}
});

SettingsManager.types.set('multiselect', class extends FormatType {

	constructor(setting_format) {

		super(setting_format);

		this.multiselect = new MultiSelect({datalist: this.datalist, multiple: this.multiple});
	}

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
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