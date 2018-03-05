window.on('DOMContentLoaded', async function() {

	Credentials.setup(document.querySelector('section#list'));

	await Credentials.load();

	Credential.setup(document.querySelector('section#form'));

	Sections.show('list');
});

class Credentials extends Page {

	static async setup(container) {

		await Page.setup();

		Credentials.container = container;

		Credentials.container.querySelector('#add-credentials').on('click', () => Credential.add());
	}

	static async load() {

		const responses = await Credentials.fetch();

		Credentials.process(responses);

		Credentials.render();
	}

	static async fetch() {

		return API.call('v2/credentials/list');
	}

	static process(response) {

		Credentials.list = new Map;

		for(const credential of response || [])
			Credentials.list.set(credential.id, new Credential(credential));
	}

	static render() {

		const container = Credentials.container.querySelector('table tbody');

		container.textContent = null;

		for(const item of Credentials.list.values())
			container.appendChild(item.row);

		if(!container.textContent)
			container.innerHTML	 = '<tr class="NA"><td colspan="5">No connections found! :(</td></tr>';
	}
}

class Credential {

	static setup(container) {

		Credential.container = container;
		Credential.form = Credential.container.querySelector('form');

		Credential.container.querySelector('.toolbar #back').on('click', () => Sections.show('list'));

		Credential.form.elements.type.on('change', function() {
			Credential.types.get(this.value).render();
		});

		for(const [type, _] of Credential.types) {
			Credential.form.elements.type.insertAdjacentHTML('beforeend', `
				<option value="${type}">${type}</option>
			`);
		}
	}

	static add() {

		Credential.form.removeEventListener('submit', Credential.submitListener);
		Credential.form.reset();

		Credential.container.querySelector('h1').textContent = 'Add New Data Source';
		Credential.form.on('submit', Credential.submitListener = e => Credential.insert(e));

		Credential.form.elements.type.disabled = false;
		Credential.types.get(Credential.form.elements.type.value).render();

		Sections.show('form');
	}

	static async insert(e) {

		if(e && e.preventDefault)
			e.preventDefault();

		const
			parameters = {
				type: Credential.form.elements.type.value,
			},
			options = {
				method: 'POST',
				form: new FormData(Credential.form),
			};

		await API.call('v2/credentials/insert', parameters, options);

		await Credentials.load();

		Sections.show('list');
	}

	constructor(item) {

		for(const key in item)
			this[key] = item[key];
	}

	edit() {

		Credential.form.removeEventListener('submit', Credential.submitListener);
		Credential.form.reset();

		Credential.container.querySelector('h1').textContent = this.name;
		Credential.form.on('submit', Credential.submitListener = e => this.update(e));

		Credential.form.elements.type.disabled = true;

		for(const key in this) {
			if(Credential.form.elements[key])
				Credential.form.elements[key].value = this[key];
		}

		Credential.types.get(Credential.form.elements.type.value).render(this);

		Sections.show('form');
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

		await API.call('v2/credentials/update', parameters, options);

		await Credentials.load();

		Credentials.list.get(this.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				status: 0,
				id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('v2/credentials/update', parameters, options);

		await Credentials.load();
	}

	get row() {

		if(this.containerElement)
			return this.containerElement;

		const container = document.createElement('tr');

		container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.connection_name}</td>
			<td>${this.type}</td>
			<td class="action green">Edit</td>
			<td class="action red">Delete</td>
		`;

		container.querySelector('.green').on('click', () => this.edit());
		container.querySelector('.red').on('click', () => this.delete());

		return container;
	}
}

Credential.types = new Map;

Credential.types.set('mysql', class {

	static render(credentials = {}) {

		Credential.container.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${credentials.user || ''}">
			</label>

			<label>
				<span>Password</span>
				<input type="text" name="password" value="${credentials.password || ''}">
			</label>

			<label>
				<span>Server</span>
				<input type="text" name="host" value="${credentials.host || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${credentials.db || ''}">
			</label>
		`;
	}

	static get details() {

		return JSON.stringify({
			user: Credential.form.elements.user.value,
			password: Credential.form.elements.password.value,
			host: Credential.form.elements.host.value,
			db: Credential.form.elements.db.value,
		});
	}
});