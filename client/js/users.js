window.on('DOMContentLoaded', async () => {

	await Users.setup();
	await UserManage.setup();

	Privileges.setup();
	Roles.setup();

	await Users.load();

	Users.loadState();
});

window.on('popstate', e => Users.loadState(e.state));

class Users extends Page {

	static async setup(contaier) {

		await Page.setup();

		Users.contaier = document.querySelector('section#list table tbody');
	}

	static async load() {

		const users = await API.call('users/list');

		Users.list = users.map(user => new UserManage(user));

		Users.render();
	}

	static render() {

		Users.contaier.textContent = null;

		for(const user of Users.list)
			Users.contaier.appendChild(user.row);
	}

	static loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return UserManage.add();

		const user = Users.list.filter(user => user.user_id == what);

		if(user.length)
			return user[0].edit();

		Sections.show('list');
	}
}

class UserManage {

	static async setup() {

		UserManage.contaier = document.querySelector('section#form');
		UserManage.form = UserManage.contaier.querySelector('form');
		UserManage.heading = UserManage.contaier.querySelector('h1');

		document.querySelector('section#list #add-user').on('click', () => {
			UserManage.add();
			history.pushState({what: 'add'}, '', `/users/add`);
		});

		UserManage.contaier.querySelector('#cancel-form').on('click', UserManage.back);
	}

	static back() {

		if(history.state)
			return history.back();

		Sections.show('list');
		history.pushState(null, '', `/users`);
	}

	static add() {

		UserManage.form.removeEventListener('submit', UserManage.submitListener);
		UserManage.form.reset();

		UserManage.heading.textContent = 'Add User';
		UserManage.form.on('submit', UserManage.submitListener = e => UserManage.insert(e));

		Privileges.privileges_container.innerHTML = `<div class="NA" style="margin:0 10px;">You can add privileges to this user once you add the user</div>`;
		Roles.roles_container.innerHTML = `<div class="NA" style="margin:0 10px;">You can add roles to this user once you add the user</div>`;

		Privileges.container.querySelector('#add-filter').classList.add('hidden');
		Roles.container.querySelector('#add-roles').classList.add('hidden');

		Sections.show('form');
	}

	static async insert(e) {

		e.preventDefault();

		const
			parameters = {},
			options = {
				method: 'POST',
			};

		for(const element of UserManage.form.elements) {
			if(element.name)
				parameters[element.name] = element.value;
		}

		try {
			await API.call('users/insert', parameters, options);
		}

		catch(e) {
			return alert(e.response);
		}

		await Users.load();
		UserManage.back();
	}

	constructor(user) {

		for(const key in user)
			this[key] = user[key];

		this.id = this.user_id;
		this.name = [this.first_name, this.middle_name, this.last_name].filter(a => a).join(' ');

		this.privileges = new Privileges(this.privileges, user);

		this.roles = new Roles(this.roles, user);
	}

	async edit() {

		UserManage.form.removeEventListener('submit', UserManage.submitListener);
		UserManage.form.reset();

		UserManage.heading.textContent = `Edit ${this.first_name} ${this.last_name || ''}`;
		UserManage.form.on('submit', UserManage.submitListener = e => this.update(e));

		for(const key in this) {
			if(UserManage.form.elements[key])
				UserManage.form.elements[key].value = this[key];
		}

		UserManage.form.password.value = null;

		// for(const option of UserManage.form.elements.privileges.children)
		// 	option.selected = this.privileges.includes(option.value);

		Privileges.container.querySelector('#add-filter').classList.remove('hidden');
		Roles.container.querySelector('#add-roles').classList.remove('hidden');

		if(Privileges.submitListener)
			Privileges.container.querySelector('form#add-filter').removeEventListener('submit', Privileges.submitListener);

		Privileges.container.querySelector('form#add-filter').on('submit', Privileges.submitListener = async (e) => {
			e.preventDefault();
			await this.privileges.add();
		});

		if(Roles.submitListener)
			Roles.container.querySelector('form#add-roles').removeEventListener('submit', Roles.submitListener);

		Roles.container.querySelector('form#add-roles').on('submit', Roles.submitListener = async (e) => {
			e.preventDefault();
			await this.roles.add();
		});

		this.privileges.render();
		this.roles.render();

		Sections.show('form');
	}

	async update(e) {

		e.preventDefault();

		const
			parameters = {
				user_id: this.id,
			},
			options = {
				method: 'POST',
			};

		for(const element of UserManage.form.elements) {
			if(element.name)
				parameters[element.name] = element.value;
		}

		parameters.privileges = Array.from(UserManage.form.elements.privileges.querySelectorAll(':checked')).map(s => s.value).join();

		await API.call('users/update', parameters, options);

		await Users.load();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				user_id: this.id,
				status: 0,
			},
			options = {
				method: 'POST',
			};

		await API.call('users/update', parameters, options);

		await Users.load();
		Sections.show('list');
	}

	get row() {

		if(this.container)
			return this.contaier;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.email}</td>
			<td class="action green">Edit</td>
			<td class="action red">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState({what: this.id}, '', `/users/${this.id}`);
		});

		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}
}

class Privileges {

	static setup() {
		Privileges.container = document.querySelector('.privileges.form-container');
		Privileges.privileges_container = Privileges.container.querySelector('#filters-list');
		for(const data of MetaData.categories.values()) {
			Privileges.container.querySelector('form#add-filter').category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		for(const data of MetaData.privileges.values()) {
			Privileges.container.querySelector('form#add-filter').privilege_id.insertAdjacentHTML('beforeend',`
				<option value="${data.privilege_id}">${data.name}</option>
			`);
		}
	}

	constructor(privileges, user) {

		this.list = [];

		for(const key of privileges)
			this.list.push(new Privilege(key, user));

		this.user = user;
	}

	async add(e) {

		const options= {
			method: 'POST',
			form: new FormData(Privileges.container.querySelector('form#add-filter'))
		}

		await API.call('user/privileges/insert', {user_id: this.user.user_id}, options);

		this.render();

		await Users.load();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}

	render() {

		const container = Privileges.privileges_container;

		container.textContent = null;

		if(!this.list.length)
			Privileges.privileges_container.innerHTML = `<div class="NA" style="margin:0 10px;">No privilege assigned :(.</div>`;

		for(const privilege of this.list) {
			container.appendChild(privilege.row);
		}
	}
}

class Privilege {

	constructor(privilege, parent) {

		for(const key in privilege)
			this[key] = privilege[key];

		this.user = parent;
	}

	get row() {

		this.container = document.createElement('form');

		this.container.classList.add('filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `

			<label>
				<input type="text" value="${MetaData.categories.get(this.category_id).name}" readonly>
			</label>

			<label>
				<input type="text" value="${MetaData.privileges.get(this.privilege_id).name}" readonly>
			</label>

			<label class="delete">
				<input type="button" value="Delete">
			</label>
		`;

		this.container.querySelector('.delete').on('click', async (e) => this.delete(this.id));

		return this.container;
	}

	async delete(id) {

		const options = {
			method: 'POST',
		};

		const parameters = {
			id: id
		}

		await API.call('user/privileges/delete', parameters, options);

		await Users.load();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}
}

class Roles {

	static setup() {
		Roles.container = document.querySelector('.roles.form-container');
		Roles.roles_container = Roles.container.querySelector('#roles-list');
		for(const data of MetaData.categories.values()) {
			Roles.container.querySelector('form#add-roles').category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		for(const data of MetaData.roles.values()) {
			Roles.container.querySelector('form#add-roles').role_id.insertAdjacentHTML('beforeend',`
				<option value="${data.role_id}">${data.name}</option>
			`);
		}
	}

	constructor(roles, user) {

		this.list = [];

		for(const key of roles)
			this.list.push(new Role(key, user));

		this.user = user;
	}

	async add() {

		const options= {
			method: 'POST',
			form: new FormData(Roles.container.querySelector('form#add-roles'))
		}

		await API.call('accounts/roles/insert', {user_id: this.user.user_id}, options);

		this.render();

		await Users.load();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}

	render() {

		const container = Roles.roles_container;

		container.textContent = null;

		if(!this.list.length)
			Roles.roles_container.innerHTML = `<div class="NA" style="margin:0 10px;">No roles assigned :(.</div>`;

		for(const privilege of this.list) {
			container.appendChild(privilege.row);
		}
	}
}

class Role {

	constructor(privilege, parent) {

		for(const key in privilege)
			this[key] = privilege[key];

		this.user = parent;
	}

	get row() {

		this.container = document.createElement('form');

		this.container.classList.add('filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `

			<label>
				<input type="text" value="${MetaData.categories.get(this.category_id).name}" readonly>
			</label>

			<label>
				<input type="text" value="${MetaData.roles.get(this.role_id).name}" readonly>
			</label>

			<label class="delete">
				<input type="button" value="Delete">
			</label>
		`;

		this.container.querySelector('.delete').on('click', async (e) => this.delete(this.id));

		return this.container;
	}

	async delete(id) {

		const options = {
			method: 'POST',
		};

		const parameters = {
			id: id
		}

		await API.call('accounts/roles/delete', parameters, options);

		await Users.load();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}
}