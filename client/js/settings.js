Page.class = class Settings extends Page {

	constructor() {
		super();
		Datasets.setup(this.container);
		Datasets.load()
	}
}

class Datasets {

	static setup(container) {

		Datasets.container = container;
		Dataset.form_container = Datasets.container.querySelector('section#form');
		Dataset.form = Dataset.form_container.querySelector('form');

		for(const data of MetaData.categories.values()) {
			Dataset.form.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		Datasets.container.querySelector('section#list #add-datset').on('click', () => Dataset.add());

		Datasets.container.querySelector('section#form #cancel-form').on('click', () => {
			Sections.show('list');
		});
	}

	static async load() {

		const response = await API.call('datasets/list');

		Datasets.list = new Map;

		for(const data of response)
			Datasets.list.set(data.id, new Dataset(data));

		Datasets.render();
	}

	static render() {

		const container = Datasets.container.querySelector('#list table tbody')

		for(const dataset of Datasets.list.values()){
			container.appendChild(dataset.row);
		}

		Sections.show('list');
	}
}

class Dataset {

	constructor(datset) {
		for(const key in datset)
			this[key] = datset[key];
	}

	static async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(Dataset.form),
		}

		await API.call('datasets/insert', {}, options);
	}

	static add() {

		Dataset.form_container.querySelector('h1').textContent = 'Add new Dataset';
		Dataset.form.reset();

		Dataset.form.removeEventListener('submit', Dataset.submitListener);

		Dataset.form.on('submit', Dataset.submitListener = e => Dataset.insert(e));

		Sections.show('form');
	}

	get row() {

		if(this.container)
			return this.contaier;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${MetaData.categories.get(this.category_id+1).name}</td>
			<td>${this.query_id}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', (e) => this.delete(e));

		return this.container;
	}

	async edit() {

		Dataset.form_container.querySelector('h1').textContent = 'Edit ' + this.name;
		Dataset.form.name.value = this.name;

		Array.from(Dataset.form.category_id.querySelectorAll('option')).map(o => {if(o.value == this.category_id+1) o.selected = true});

		Dataset.form.query_id.value = this.query_id;

		Dataset.form.removeEventListener('submit', Dataset.submitListener);
		Dataset.form.on('submit', Dataset.submitListener = e => this.update(e));

		Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			id: this.id,
		}

		const options = {
			method: 'POST',
			form: new FormData(Dataset.form),
		}

		await API.call('datasets/update', parameter, options);
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