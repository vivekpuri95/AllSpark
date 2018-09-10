Page.class = class Connections extends Page {

	constructor() {

		super();

		window.on('popstate', e => this.loadState(e.state));

		DataConnection.setup(this);

		this.listContainer = this.container.querySelector('section#list');


		if(user.privileges.has('connection.insert')) {

			this.container.querySelector('#add-data-connection').classList.remove('grey');
			this.container.querySelector('#add-data-connection').on('click', () => {
        DataConnection.add(this));
        history.pushState({what: 'add'}, '', '/connections-manager/add');
      }
		}
		this.container.querySelector('#add-oauth-connection').on('submit', e => OAuthConnection.insert(e));

		OAuthConnection.validate();

		(async () => {

			await this.load();

			this.loadState();
		})();
	}

	async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return DataConnection.add(this);

		if(this.dataConnections.has(parseInt(what)))
			return this.dataConnections.get(parseInt(what)).edit();

		await Sections.show('list');
	}

	async back() {

		if(history.state)
			return history.back();

		await Sections.show('list');

		history.pushState(null, '', `/connections-manager`);
	}

	async load() {

		const responses = await this.fetch();

		this.process(responses);

		this.render();
	}

	async fetch() {

		return Promise.all([
			API.call('credentials/list'),
			API.call('oauth/providers/list'),
			API.call('oauth/connections/list'),
		]);
	}

	process(response) {

		this.dataConnections = new Map;
		this.oAuthProviders = new Map;
		this.oAuthConnections = new Map;

		for(const connection of response[0] || [])
			this.dataConnections.set(connection.id, new DataConnection(connection, this));

		for(const provider of response[1] || [])
			this.oAuthProviders.set(provider.provider_id, provider);

		for(const connection of response[2] || [])
			this.oAuthConnections.set(connection.id, new OAuthConnection(connection, this));
	}

	render() {

		const
			dataConnectionsContainer = this.listContainer.querySelector('.data-connections tbody'),
			oAuthConnectionsContainer = this.listContainer.querySelector('.oauth-connections tbody');

		dataConnectionsContainer.textContent = null;

		for(const item of this.dataConnections.values())
			dataConnectionsContainer.appendChild(item.row);

		if(!dataConnectionsContainer.textContent)
			dataConnectionsContainer.innerHTML	 = '<tr class="NA"><td colspan="5">No data connections found!</td></tr>';

		oAuthConnectionsContainer.textContent = null;

		for(const item of this.oAuthConnections.values())
			oAuthConnectionsContainer.appendChild(item.row);

		if(!oAuthConnectionsContainer.textContent)
			oAuthConnectionsContainer.innerHTML	 = '<tr class="NA"><td colspan="5">No OAuth connections found!</td></tr>';

		const providerList = this.listContainer.querySelector('#add-oauth-connection').provider;

		for(const provider of this.oAuthProviders.values())
			providerList.insertAdjacentHTML('beforeend', `<option value="${provider.provider_id}">${provider.name}</option>`);
	}
}

class DataConnection {

	static setup(page) {

		DataConnection.page = page;
		DataConnection.container = page.container.querySelector('section#form');

		DataConnection.form = DataConnection.container.querySelector('form');

		DataConnection.container.querySelector('.toolbar #back').on('click', () => page.back());
		page.container.querySelector('#connection-picker-back').on('click', () => page.back());
	}

	static async add(page) {

		DataConnection.form.removeEventListener('submit', DataConnection.submitListener);
		DataConnection.form.reset();

		this.page.container.querySelector('#share-connections').innerHTML = `<div class="NA">You can share the connection once you create one.</div>`;

		DataConnection.container.querySelector('.toolbar #test-connection').classList.add('hidden');
		DataConnection.container.querySelector('.test-result').classList.add('hidden');
		DataConnection.container.querySelector('h1').textContent = 'Add New Connection';
		DataConnection.form.on('submit', DataConnection.submitListener = e => DataConnection.insert(e, page));

		DataConnection.form.connection_name.focus();

		const addConnectionForm = page.container.querySelector('#add-connection-form');

		addConnectionForm.textContent = null;

		for(const connection of MetaData.datasources.values()) {

			let feature;

			for(const _feature of MetaData.features.values()) {

				if(_feature.slug == connection.slug && _feature.type == 'source')
					feature = _feature;
			}

			// if(!feature)
			// 	continue;

			const label = document.createElement('label');

			label.dataset.slug = connection.slug;

			label.innerHTML = `
				<figure>
					<img alt="${connection.name}">
					<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>
					<span class="NA hidden">Preview not available!</span>
					<figcaption>${connection.name}</figcaption>
				</figure>
			`;

			const
				img = label.querySelector('img'),
				loader = label.querySelector('.loader'),
				NA = label.querySelector('.NA');

			img.on('load', () => {
				img.classList.add('show');
				loader.classList.add('hidden');
			});

			img.on('error', () => {
				NA.classList.remove('hidden');
				loader.classList.add('hidden');
			});

			img.src = connection.image;

			label.on('click', async () => {

				if(addConnectionForm.querySelector('figure.selected'))
					addConnectionForm.querySelector('figure.selected').classList.remove('selected');

				label.querySelector('figure').classList.add('selected');

				DataConnection.types.get(connection.slug).render();

				await Sections.show('form');
			});

			addConnectionForm.appendChild(label);
		}

		if(!MetaData.datasources.size)
			addConnectionForm.innerHTML = `<div class="NA">No connections found</div>`;

		await Sections.show('add-connection');
	}

	static async insert(e, page) {

		e.preventDefault();

		const
			parameters = {
				type: page.container.querySelector('#add-connection-form .selected').parentElement.dataset.slug,
			},
			options = {
				method: 'POST',
				form: new FormData(DataConnection.form),
			};

		try {

			const response = await API.call('credentials/insert', parameters, options);

			await DataConnection.page.load();

			const connection = page.dataConnections.get(response.insertId);

			connection.edit();

			if(await Storage.get('newUser'))
				await UserOnboard.setup(true);

			new SnackBar({
				message: `${connection.feature.name} Connection Added`,
				subtitle: `${connection.connection_name} #${connection.id}`,
				icon: 'fas fa-plus',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	constructor(item, page) {

		for(const key in item)
			this[key] = item[key];

		this.page = page;

		for(const feature of MetaData.features.values()) {

			if(feature.slug == this.type && feature.type == 'source')
				this.feature = feature;
		}
	}

	async edit() {

		DataConnection.form.removeEventListener('submit', DataConnection.submitListener);
		DataConnection.form.reset();

		DataConnection.container.querySelector('h1').textContent = 'Editing ' + this.connection_name;

		DataConnection.form.on('submit', DataConnection.submitListener = e => {
			e.preventDefault();
			this.update();
		});

		this.objectRoles = new ObjectRoles('connection', this.id, ['user', 'role']);

		await this.objectRoles.load();

		this.page.container.querySelector('#share-connections').innerHTML = null;

		this.page.container.querySelector('#share-connections').appendChild(this.objectRoles.container);

		DataConnection.container.querySelector('.test-result').classList.add('hidden');

		const test = DataConnection.container.querySelector('.toolbar #test-connection');

		test.classList.remove('hidden');

		test.removeEventListener('click', DataConnection.test_listener);

		test.on('click', DataConnection.test_listener = async () => this.test());

		for(const key in this) {
			if(DataConnection.form.elements[key])
				DataConnection.form.elements[key].value = this[key];
		}

		DataConnection.types.get(this.type).render(this);

		await Sections.show('form');

		DataConnection.form.connection_name.focus();
	}

	async test() {

		const
			options = {
				method: 'POST',
			},
			parameter = {
				id: this.id,
			},
			container = DataConnection.container.querySelector('.test-result');

		let response;
		try {
			response = await API.call('credentials/testConnections', parameter, options);
		}
		catch (e) {

			new SnackBar({
				message: 'Connection Failed',
				subtitle: e.message || JSON.stringify(e),
				type: 'error',
			});

			throw e;
		}

		if(response.status) {

			new SnackBar({
				message: 'Connection Successful',
			});
		}
		else {
			new SnackBar({
				message: 'Connection Failed',
				subtitle: JSON.stringify(response.message || response),
				type: 'error',
			});
		}
	}

	async update() {

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
				form: new FormData(DataConnection.form),
			};

		try {

			await API.call('credentials/update', parameters, options);

			await this.page.load();
			await Sections.show('list');

			new SnackBar({
				message: `${this.feature.name} Connection Saved`,
				subtitle: `${this.name} #${this.id} (${this.feature.name})`,
				icon: 'far fa-save',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id: this.id,
				type: this.type,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('credentials/delete', parameters, options);

			await this.page.load();

			if(await Storage.get('newUser'))
				await UserOnboard.setup(true);

			new SnackBar({
				message: `${this.feature.name} Connection Removed`,
				subtitle: `${this.connection_name} #${this.id}`,
				icon: 'far fa-trash-alt',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	get row() {

		if(this.containerElement)
			return this.containerElement;

		const container = document.createElement('tr');

		container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.connection_name}</td>
			<td>${this.feature ? this.feature.name : ''}</td>
			<td title="${!this.editable ? 'Not enough privileges' : 'Edit'}" class="action ${!this.editable ? 'grey' : 'green'}"><i class="far fa-edit"></i></td>
			<td title="${!this.deletable ? 'Not enough privileges' : 'Delete'}" class="action ${!this.deletable ? 'grey' : 'red'}"><i class="far fa-trash-alt"></i></td>
		`;

		if(container.querySelector('.green'))
			container.querySelector('.green').on('click', () => {
        history.pushState({what: this.id}, '', `/connections-manager/${this.id}`);
        this.edit();
      });

		if(container.querySelector('.red'))
			container.querySelector('.red').on('click', () => this.delete());
    
		return container;
	}
}

DataConnection.types = new Map;

DataConnection.types.set('mysql', class {

	static render(connections = {}) {

		DataConnection.form.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span class="password">Password <a class="show-password">Show</a></span>
				<input type="password" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Host</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Port</span>
				<input type="text" name="port" value="${connections.port || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${connections.db || ''}">
			</label>
		`;

		DataConnection.form.password.on('click', () => {
			DataConnection.form.password.type = DataConnection.form.password.type == 'text' ? 'password': 'text';
		});
	}

	static get details() {

		return JSON.stringify({
			user: DataConnection.form.user.value,
			password: DataConnection.form.password.value,
			host: DataConnection.form.host.value,
			port: DataConnection.form.port.value,
			db: DataConnection.form.db.value,
		});
	}
});

DataConnection.types.set('mssql', class {

	static render(connections = {}) {

		DataConnection.form.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span class="password">Password <a class="show-password">Show</a></span>
				<input type="password" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Host</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Port</span>
				<input type="text" name="port" value="${connections.port || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${connections.db || ''}">
			</label>
		`;

		DataConnection.form.password.on('click', () => {
			DataConnection.form.password.type = DataConnection.form.password.type == 'text' ? 'password' : 'text';
		});
	}

	static get details() {

		return JSON.stringify({
			user: DataConnection.form.user.value,
			password: DataConnection.form.password.value,
			host: DataConnection.form.host.value,
			port: DataConnection.form.port.value,
			db: DataConnection.form.db.value,
		});
	}
});

DataConnection.types.set('pgsql', class {

	static render(connections = {}) {

		DataConnection.form.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span class="password">Password <a class="show-password">Show</a></span>
				<input type="text" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Host</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Port</span>
				<input type="text" name="port" value="${connections.port || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${connections.db || ''}">
			</label>
		`;

		DataConnection.form.password.on('click', () => {
			DataConnection.form.password.type = DataConnection.form.password.type == 'text' ? 'password': 'text';
		});
	}

	static get details() {

		return JSON.stringify({
			user: DataConnection.form.user.value,
			password: DataConnection.form.password.value,
			host: DataConnection.form.host.value,
			port: DataConnection.form.port.value,
			db: DataConnection.form.db.value,
		});
	}
});

DataConnection.types.set('oracle', class {

	static render(connections = {}) {

		DataConnection.form.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span class="password">Password <a class="show-password">Show</a></span>
				<input type="password" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Host</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Port</span>
				<input type="text" name="port" value="${connections.port || ''}">
			</label>
		`;

		DataConnection.form.password.on('click', () => {
			DataConnection.form.password.type = DataConnection.form.password.type == 'text' ? 'password': 'text';
		});
	}

	static get details() {

		return JSON.stringify({
			user: DataConnection.form.user.value,
			password: DataConnection.form.password.value,
			host: DataConnection.form.host.value,
			port: DataConnection.form.port.value,
		});
	}
});

DataConnection.types.set('api', class {

	static render(connections = {}) {
		DataConnection.form.querySelector('#details').innerHTML = null;
	}

	static get details() {
		return JSON.stringify({});
	}
});

DataConnection.types.set('bigquery', class {

	static render(connections = {}) {
		DataConnection.form.querySelector('#details').innerHTML = null;
	}

	static get details() {
		return JSON.stringify({});
	}
});

DataConnection.types.set('file', class {

	static render(connections = {}) {
		DataConnection.form.querySelector('#details').innerHTML = null;
	}

	static get details() {
		return JSON.stringify({});
	}
});

DataConnection.types.set('mongo', class {

	static render(connections = {}) {

		DataConnection.form.querySelector('#details').innerHTML = `

			<label>
				<span>Username</span>
				<input type="text" name="user" value="${connections.user || ''}">
			</label>

			<label>
				<span class="password">Password <a class="show-password">Show</a></span>
				<input type="password" name="password" value="${connections.password || ''}">
			</label>

			<label>
				<span>Host</span>
				<input type="text" name="host" value="${connections.host || ''}">
			</label>

			<label>
				<span>Port</span>
				<input type="text" name="port" value="${connections.port || ''}">
			</label>

			<label>
				<span>Database</span>
				<input type="text" name="db" value="${connections.db || ''}">
			</label>
		`;

		DataConnection.form.password.on('click', () => {
			DataConnection.form.password.type = DataConnection.form.password.type == 'text' ? 'password': 'text';
		});
	}

	static get details() {

		return JSON.stringify({
			user: DataConnection.form.user.value,
			password: DataConnection.form.password.value,
			host: DataConnection.form.host.value,
			port: DataConnection.form.port.value,
			db: DataConnection.form.db.value,
		});
	}
});

class OAuthConnection {

	static async validate() {

		const search = new URLSearchParams(window.location.search);

		if(!search.has('state'))
			return;

		const
			parameters = {
				state: search.get('state'),
				code: search.get('code'),
			},
			options = {method: 'POST'};

		if(search.get('error') == 'access_denied')
			return;

		try {
			await API.call('oauth/connections/redirect_uri', parameters, options);
		}
		catch(e) {

			alert(e.message);
			return;
		}

		window.location = '/connections-manager';
	}

	static async insert(e) {

		e.preventDefault();

		const
			parameters = {
				provider_id: DataConnection.page.container.querySelector('#add-oauth-connection').provider.value,
			},
			options = {
				method: 'POST',
			};

		await API.call('oauth/connections/insert', parameters, options);

		DataConnection.page.load();
	}

	constructor(connection, page) {

		Object.assign(this, connection);
		this.page = page;
	}

	get row() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('tr');

		container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.page.oAuthProviders.get(this.provider_id).name}</td>
			<td>${this.page.oAuthProviders.get(this.provider_id).type}</td>
			<td class="action green authenticate">
				${(this.access_token || this.refresh_token) ? '<i class="fas fa-flask"></i>' : '<i class="fas fa-link"></i>'}
			</td>
			<td class="action red delete"><i class="far fa-trash-alt"></i></td>
		`;

		container.querySelector('.authenticate').on('click', () => {

			if(this.access_token || this.refresh_token)
				this.test();

			else this.authenticate();
		});

		container.querySelector('.delete').on('click', () => this.delete());

		return container;
	}

	async test() {

		const
			parameters = { id: this.id },
			container = this.page.listContainer.querySelector('.test-result');

		let response;

		try {
			response = await API.call('oauth/connections/test', parameters);
		}
		catch (e) {

			container.classList.remove('hidden');
			container.classList.add('warning');
			container.classList.remove('notice');
			container.textContent = e.message || e;
			return;
		}

		container.classList.remove('hidden');

		if(response) {
			container.classList.add('notice');
			container.classList.remove('warning');
			container.textContent = 'Connection Successful';
		}
		else {
			container.classList.add('warning');
			container.classList.remove('notice');
			container.textContent = 'Connection Failed';
		}
	}

	async authenticate() {

		const provider = this.page.oAuthProviders.get(this.provider_id);

		if(provider.name == 'Google Analytics') {

			const parameters = new URLSearchParams();

			parameters.set('client_id', provider.client_id);
			parameters.set('redirect_uri', `https://${account.url}/connections-manager`);
			parameters.set('scope', 'https://www.googleapis.com/auth/analytics.readonly');
			parameters.set('access_type', 'offline');
			parameters.set('response_type', 'code');
			parameters.set('state', this.id);
			parameters.set('login_hint', user.email);

			window.open(`https://accounts.google.com/o/oauth2/v2/auth?` + parameters);
		}

		else if(provider.name == 'Google AdWords') {

			const parameters = new URLSearchParams();

			parameters.set('client_id', provider.client_id);
			parameters.set('redirect_uri', `https://${account.url}/connections-manager`);
			parameters.set('scope', 'https://www.googleapis.com/auth/adwords');
			parameters.set('access_type', 'offline');
			parameters.set('response_type', 'code');
			parameters.set('state', this.id);
			parameters.set('login_hint', user.email);

			window.open(`https://accounts.google.com/o/oauth2/v2/auth?` + parameters);
		}

		else if(provider.name == 'Google BigQuery') {

			const parameters = new URLSearchParams();

			parameters.set('client_id', provider.client_id);
			parameters.set('redirect_uri', `https://${account.url}/connections-manager`);
			parameters.set('scope', 'https://www.googleapis.com/auth/bigquery');
			parameters.set('access_type', 'offline');
			parameters.set('response_type', 'code');
			parameters.set('state', this.id);
			parameters.set('login_hint', user.email);

			window.open(`https://accounts.google.com/o/oauth2/v2/auth?` + parameters);
		}

		else if(provider.name == 'Facebook Marketing') {

			const parameters = new URLSearchParams();

			parameters.set('client_id', provider.client_id);
			parameters.set('redirect_uri', `https://${account.url}/connections-manager`);
			parameters.set('scope', 'ads_read');
			parameters.set('response_type', 'code');
			parameters.set('state', this.id);

			window.open(`https://www.facebook.com/v3.0/dialog/oauth?` + parameters);
		}
	}

	async delete() {

		if(!confirm('Are you sure?! This will not delete the stored data.'))
			return;

		const
			parameters = { id: this.id },
			options = { method: 'POST' };

		await API.call('oauth/connections/delete', parameters, options);

		this.page.load();
	}
}