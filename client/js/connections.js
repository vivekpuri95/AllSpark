Page.class = class Credentials extends Page {

	constructor() {

		super();

		Credential.setup(this);

		this.listContainer = this.container.querySelector('section#list');

		this.container.querySelector('#add-connection').on('click', () => Credential.add());

		(async () => {

			await this.load();

			await Sections.show('list');
		})();
	}

	async load() {

		const responses = await this.fetch();

		this.process(responses);

		this.render();
	}

	async fetch() {

		return API.call('credentials/list');
	}

	process(response) {

		this.list = new Map;

		for(const credential of response || [])
			this.list.set(credential.id, new Credential(credential, this));
	}

	render() {

		const container = this.listContainer.querySelector('table tbody');

		container.textContent = null;

		for(const item of this.list.values())
			container.appendChild(item.row);

		if(!container.textContent)
			container.innerHTML	 = '<tr class="NA"><td colspan="5">No connections found! :(</td></tr>';
	}
}

class Credential {

	static setup(page) {

		Credential.page = page;
		Credential.container = page.container.querySelector('section#form');

		Credential.form = Credential.container.querySelector('form');

		Credential.container.querySelector('.toolbar #back').on('click', () => Sections.show('list'));

		Credential.form.type.on('change', function() {
			Credential.types.get(this.value).render();
		});

		for(const [type, _] of Credential.types) {
			Credential.form.type.insertAdjacentHTML('beforeend', `
				<option value="${type}">${type}</option>
			`);
		}
	}

	static async add() {

		Credential.form.removeEventListener('submit', Credential.submitListener);
		Credential.form.reset();

		Credential.container.querySelector('h1').textContent = 'Add New Data Source';
		Credential.form.on('submit', Credential.submitListener = e => Credential.insert(e));

		Credential.form.type.disabled = false;
		Credential.types.get(Credential.form.type.value).render();

		await Sections.show('form');

		Credential.form.connection_name.focus();
	}

	static async insert(e) {

		if(e && e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				type: Credential.form.type.value,
			},
			options = {
				method: 'POST',
				form: new FormData(Credential.form),
			};

		await API.call('credentials/insert', parameters, options);

		await Credential.page.load();

		await Sections.show('list');
	}

	constructor(item, page) {

		for(const key in item)
			this[key] = item[key];

		this.page = page;
	}

	async edit() {

		Credential.form.removeEventListener('submit', Credential.submitListener);
		Credential.form.reset();

		Credential.container.querySelector('h1').textContent = 'Editing ' + this.connection_name;
		Credential.form.on('submit', Credential.submitListener = e => this.update(e));

		Credential.form.type.disabled = true;

		for(const key in this) {
			if(Credential.form.elements[key])
				Credential.form.elements[key].value = this[key];
		}

		Credential.types.get(Credential.form.type.value).render(this);

		await Sections.show('form');

		Credential.form.connection_name.focus();
	}

	async update(e) {

		if(e && e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
				form: new FormData(Credential.form),
			};

		await API.call('credentials/update', parameters, options);

		await this.page.load();

		this.page.list.get(this.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('credentials/delete', parameters, options);

		await this.page.load();
	}

	get row() {

		if(this.containerElement)
			return this.containerElement;

		const container = document.createElement('tr');

		container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.connection_name}</td>
			<td>${this.type}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		container.querySelector('.green').on('click', () => this.edit());
		container.querySelector('.red').on('click', () => this.delete());

		return container;
	}
}

Credential.types = new Map;

Credential.types.set('mysql', class {

	static render(connections = {}) {

		Credential.container.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span>Password</span>
				<input type="text" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Server</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${connections.db || ''}">
			</label>
		`;
	}

	static get details() {

		return JSON.stringify({
			user: Credential.form.user.value,
			password: Credential.form.password.value,
			host: Credential.form.host.value,
			db: Credential.form.db.value,
		});
	}
});