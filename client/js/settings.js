class Settings extends Page {

	constructor() {
		super();

		const nav = this.container.querySelector('nav');

		for(const [key, settings] of Settings.list) {

			const setting = new settings(this.container);

			const a = document.createElement('a');
		
			a.textContent = setting.name;
			
			a.on('click', () => {
				
				for(const a of nav.querySelectorAll('a.selected'))
					a.classList.remove('selected');

				for(const a of this.container.querySelectorAll('.setting-page'))
					a.classList.add('hidden');

				a.classList.add('selected');
				setting.setup();
				setting.load();
				setting.container.classList.remove('hidden');
			});

			nav.appendChild(a);
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

		this.container = this.page.querySelector('.datasets-ui');
		SettingsDataset.form_container = this.container.querySelector('section#form');
		SettingsDataset.form = SettingsDataset.form_container.querySelector('form');

		for(const data of MetaData.categories.values()) {
			SettingsDataset.form.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		this.container.querySelector('section#list #add-datset').on('click', () => SettingsDataset.add(this));

		SettingsDataset.form_container.querySelector('#cancel-form').on('click', () => {
			Sections.show('list');
		});
	}

	async load() {

		const response = await API.call('datasets/list');

		this.list = new Map;

		for(const data of response)
			this.list.set(data.id, new SettingsDataset(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#list table tbody')
		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<div class="NA">No rows found :(</div>'

		for(const dataset of this.list.values()){
			container.appendChild(dataset.row);
		}

		await Sections.show('list');
	}


});

class SettingsDataset {

	constructor(dataset, datasets) {

		for(const key in dataset)
			this[key] = dataset[key];

		this.datasets = datasets;
	}

	static add(datasets) {

		SettingsDataset.form_container.querySelector('h1').textContent = 'Add new Dataset';
		SettingsDataset.form.reset();

		SettingsDataset.form.removeEventListener('submit', SettingsDataset.submitListener);

		SettingsDataset.form.on('submit', SettingsDataset.submitListener = e => SettingsDataset.insert(e, datasets));

		Sections.show('form');

		SettingsDataset.form.focus();
	}

	static async insert(e, datasets) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(SettingsDataset.form),
		}

		const response = await API.call('datasets/insert', {}, options);

		await datasets.load();

		await datasets.list.get(response.insertId).edit();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${MetaData.categories.get(this.category_id).name}</td>
			<td>${this.query_id}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', (e) => this.delete(e));

		return this.container;
	}

	async edit() {

		SettingsDataset.form_container.querySelector('h1').textContent = 'Edit ' + this.name;
		SettingsDataset.form.reset();

		SettingsDataset.form.name.value = this.name;
		SettingsDataset.form.category_id.value = this.category_id;
		SettingsDataset.form.query_id.value = this.query_id;

		SettingsDataset.form.removeEventListener('submit', SettingsDataset.submitListener);
		SettingsDataset.form.on('submit', SettingsDataset.submitListener = e => this.update(e));

		await Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			id: this.id,
		}

		const options = {
			method: 'POST',
			form: new FormData(SettingsDataset.form),
		}

		await API.call('datasets/update', parameter, options);

		await this.datasets.load();

		await Sections.show('form');
	}

	async delete() {

		if(!confirm('Are you sure?'))
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