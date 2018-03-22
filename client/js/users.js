window.on('DOMContentLoaded', async () => {

	await Users.setup();
	UserManage.setup();

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

	static setup() {

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

		this.privileges = this.privileges || [];
	}

	edit() {

		UserManage.form.removeEventListener('submit', UserManage.submitListener);
		UserManage.form.reset();

		UserManage.heading.textContent = `Edit ${this.first_name} ${this.last_name || ''}`;
		UserManage.form.on('submit', UserManage.submitListener = e => this.update(e));

		UserManage.form.reset();

		for(const key in this) {
			if(UserManage.form.elements[key])
				UserManage.form.elements[key].value = this[key];
		}

		UserManage.form.password.value = null;

		for(const option of UserManage.form.elements.privileges.children)
			option.selected = this.privileges.includes(option.value);

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