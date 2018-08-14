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
			this.profiles.set(data.id, new SettingsManagerProfile(data, this));
		}
	}

	render() {

		const formContainer = this.form;
		const tbody = formContainer.querySelector('table tbody');
		tbody.textContent = null;

		for(const data of this.profiles.values())
			tbody.appendChild(data.row);

		if(!this.profiles.size)
			tbody.innerHTML = `<tr><td colspan="2" class="NA">No profile found</td></tr>`;

		tbody.querySelector('tr').click();
	}

	get form() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('settings-manager');

		container.innerHTML = `
			<aside>
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
					<form class="form">
						<label>
							<input type="text" name="name" placeholder="New Profile Name" required>
						</label>

						<label>
							<button type="submit"><i class="fa fa-plus"></i> Add</button>
						</label>
					</form>
				</footer>
			</aside>
		`;

		container.querySelector('form').on('submit', e => this.add(e));

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
				profile: this.form.querySelector('form').name.value,
				owner: this.owner,
				value: JSON.stringify([]),
			};

		const response = await API.call('settings/insert', parameter, options);

		await this.load();

		this.profiles.get(response.insertId).edit();
	}
}

class SettingsManagerProfile {

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

		if(this.parent.form.querySelector('.settings-manager > aside tr.selected'))
			this.parent.form.querySelector('.settings-manager > aside tr.selected').classList.remove('selected');

		this.tr.classList.add('selected');

		if(this.parent.form.querySelector('.profile'))
			this.parent.form.querySelector('.profile').remove();

		this.parent.form.appendChild(this.section);
	}

	get section() {

		if(this.sectionElement)
			return this.sectionElement;

		const section = this.sectionElement = document.createElement('section');

		section.classList.add('profile');

		section.innerHTML = `
			<header>
				<h3>${this.profile}</h3>
				<input type="search" placeholder="Search...">
				<button type="submit" form="settings-form"><i class="far fa-save"></i> Save</button>
			</header>

			<form id="settings-form" class="form">
				<label>
					<span>Profile Name</span>
					<input type="text" required name="name" placeholder="Name" value="${this.profile}">
				</label>
			</form>
		`;

		section.querySelector('header input[type=search]').on('keyup', () => this.search());

		this.settings = [];

		for(const format of this.parent.format) {

			let setting = SettingsManager.types.get(format.type.toLowerCase());

			if(!setting)
				continue;

			setting = new setting(format);

			for(const value of this.value || []) {
				if(format.key == value.key)
					setting.value = value.value;
			}

			this.settings.push(setting);
		}

		const form = this.section.querySelector('form');

		for(const setting of this.settings)
			form.appendChild(setting.container);

		section.querySelector('form').on('submit', (e) => this.update(e));

		return section;
	}

	async update(e) {

		e.preventDefault();

		const value = [];

		this.settings.map(x => value.push({
			key: x.key,
			value: x.value
		}));

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

	search() {

		const query = this.section.querySelector('header input[type=search]').value;

		for(const setting of this.settings) {

			let found = false;

			if(!query)
				found = true;

			for(const key of ['key', 'name', 'description', 'type']) {
				if(setting[key] && setting[key].toLowerCase().includes(query.toLowerCase())) {
					found = true;
					break;
				}
			}

			setting.container.classList.toggle('hidden', !found);
		}
	}
}

class SettingsManagerType {

	constructor(format) {

		for(const key in format)
			this[key] = format[key];
	}
}

SettingsManager.types = new Map;

SettingsManager.types.set('string', class extends SettingsManagerType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
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

SettingsManager.types.set('toggle', class extends SettingsManagerType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
			<select>
				<option value="0">Disabled</option>
				<option value="1">Enabled</option>
			</select>
		`;

		return container;
	}

	get value() {

		return parseInt(this.container.querySelector('select').value);
	}

	set value(param) {

		this.container.querySelector('select').value = param;
	}
});

SettingsManager.types.set('number', class extends SettingsManagerType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
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

SettingsManager.types.set('code', class extends SettingsManagerType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');
		container.classList.add('code-editor');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
			<div class="edit">
				<div class="content"></div>
				<div class="click-to-edit">Click to edit</div>
			</div>
		`;

		container.querySelector('.click-to-edit').on('click', () => this.renderEditor());

		return container;
	}

	renderEditor() {

		this.div.querySelector('.edit').classList.add('hidden');
		this.div.querySelector('.click-to-edit').classList.add('hidden');

		this.editor = new CodeEditor({mode: this.mode});

		this.div.appendChild(this.editor.container);

		this.editor.value = this.data;
	}

	get value() {

		if(this.editor)
			return this.editor.value;

		return this.data;
	}

	set value(data = '') {

		this.data = data;

		if(this.editor)
			this.editor.value = this.data;
		else
			this.container.querySelector('.edit .content').textContent = this.data.split(';')[0];
	}
});

SettingsManager.types.set('json', class extends SettingsManagerType {

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.classList.add('code-editor');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
			<div class="edit">
				<div class="content"></div>
				<div class="click-to-edit">Click to edit</div>
			</div>
		`;

		container.querySelector('.click-to-edit').on('click', () => this.renderEditor());

		return container;
	}

	renderEditor() {

		this.div.querySelector('.edit').classList.add('hidden');
		this.div.querySelector('.click-to-edit').classList.add('hidden');

		this.editor = new CodeEditor({mode: 'json'});

		this.div.appendChild(this.editor.container);

		this.editor.value = JSON.stringify(this.data, 0, 4);
	}

	get value() {

		if(this.editor)
			return JSON.parse(this.editor.value);

		return this.data;
	}

	set value(data = {}) {

		this.data = data;

		const value = JSON.stringify(this.data, 0, 4);

		if(this.editor)
			this.editor.value = value;
		else
			this.container.querySelector('.edit .content').textContent = value.split('')[0];
	}
});

SettingsManager.types.set('multiselect', class extends SettingsManagerType {

	constructor(format) {

		super(format);

		this.multiselect = new MultiSelect({datalist: this.datalist, multiple: this.multiple});
	}

	get container() {

		if(this.div)
			return this.div;

		const container = this.div = document.createElement('label');

		container.innerHTML = `
			<span>${this.name}</span>
			${this.description ? '<small class="NA">' + this.description + '</small>' : ''}
		`;

		container.appendChild(this.multiselect.container);

		return container;
	}

	get value() {

		return this.multiple ? this.multiselect.value : this.multiselect.value[0];
	}

	set value(params) {

		if(!Array.isArray(params))
			params = [params];

		this.multiselect.value = params;
	}
});