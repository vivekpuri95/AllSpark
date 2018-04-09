Page.class = class Settings extends Page {

	constructor() {
		super();
		const loader = window.location.pathname.split('/');
		let which_class = loader[loader.indexOf('settings')+1];

		Array.from(this.container.querySelectorAll('nav a')).map(a => {if(a.href == window.location.href){a.classList.add('selected')}})	

		if(!which_class) {
			window.location.href = this.container.querySelector('nav a').href;
		}

		new window[which_class](this);
	}
}

class SettingPage {

	constructor(page) {
		this.setup(page.container);
		this.load();
	}
}

window.datasets = class Datasets extends SettingPage {

	setup(container) {

		Datasets.container = container.querySelector('.datasets-ui');
		Datasets.container.classList.remove('hidden');
		Setting_Dataset.form_container = Datasets.container.querySelector('section#form');
		Setting_Dataset.form = Setting_Dataset.form_container.querySelector('form');

		for(const data of MetaData.categories.values()) {
			Setting_Dataset.form.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		Datasets.container.querySelector('section#list #add-datset').on('click', () => Setting_Dataset.add());

		Datasets.container.querySelector('section#form #cancel-form').on('click', () => {
			Sections.show('list');
		});
	}

	async load() {

		const response = await API.call('datasets/list');

		Datasets.list = new Map;

		for(const data of response)
			Datasets.list.set(data.id, new Setting_Dataset(data, this));

		Datasets.render();
	}

	static render() {

		const container = Datasets.container.querySelector('#list table tbody')
		container.textContent = null;
		for(const dataset of Datasets.list.values()){
			container.appendChild(dataset.row);
		}

		Sections.show('list');
	}
}

class Setting_Dataset {

	constructor(datset, datsets) {
		for(const key in datset)
			this[key] = datset[key];

		this.datasets = datasets;
	}

	static async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(Setting_Dataset.form),
		}

		const response = await API.call('datasets/insert', {}, options);

		await this.datasets.load();

		await Datasets.list.get(response.insertIdi).edit();
	}

	static add() {

		Setting_Dataset.form_container.querySelector('h1').textContent = 'Add new Setting_Dataset';
		Setting_Dataset.form.reset();

		Setting_Dataset.form.removeEventListener('submit', Setting_Dataset.submitListener);

		Setting_Dataset.form.on('submit', Setting_Dataset.submitListener = e => Setting_Dataset.insert(e));

		Sections.show('form');

		Setting_Dataset.form.focus();
	}

	get row() {

		if(this.container)
			return this.contaier;

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

		Setting_Dataset.form_container.querySelector('h1').textContent = 'Edit ' + this.name;
		Setting_Dataset.form.name.value = this.name;

		Array.from(Setting_Dataset.form.category_id.querySelectorAll('option')).map(o => {if(o.value == this.category_id) o.selected = true});

		Setting_Dataset.form.query_id.value = this.query_id;

		Setting_Dataset.form.removeEventListener('submit', Setting_Dataset.submitListener);
		Setting_Dataset.form.on('submit', Setting_Dataset.submitListener = e => this.update(e));

		Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			id: this.id,
		}

		const options = {
			method: 'POST',
			form: new FormData(Setting_Dataset.form),
		}

		await API.call('datasets/update', parameter, options);

		await this.datasets.load();

		await Sections.show('form');
	}

	async delete() {

		if(!Confirm('Are you sure?'))
			return;

		const options = {
			method: 'POST',
		}
		const parameter = {
			id: this.id,
		}

		await API.call('datasets/delete', parameter, options);
	}
}