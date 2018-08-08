class Users extends Page {

	constructor() {

		super();

		(async () => {

			await Users.setup(this);
			await UserManage.setup();

			Privileges.setup();
			Roles.setup();

			await Users.load();

			Users.loadState();
		})();

		window.on('popstate', e => Users.loadState(e.state));
	}

	static async setup(page) {

		Users.contaier = page.container.querySelector('section#list table tbody');
		Users.thead = page.container.querySelector('section#list table thead');

		Users.userSearch = page.container.querySelector('section#list .user-search');

		Users.userSearch.querySelector('select[name=search_with]').on('change', () => {

			const paramValue = Users.userSearch.querySelector('select[name=search_with]').value;

			Users.userSearch.querySelector('.params .role').classList.toggle('hidden', paramValue == 'privilege' || paramValue == 'category');
			Users.userSearch.querySelector('.params .privilege').classList.toggle('hidden', paramValue == 'role' || paramValue == 'category');

		});

		for(const thead of Users.thead.querySelectorAll('.thead-bar th')) {

			if(thead.classList.contains('action'))
				continue;

			const th = document.createElement('th');
			th.classList.add('search');

			th.innerHTML = `
				<input type="text" placeholder="Search ${thead.textContent}" data-key="${thead.dataset.key}">
			`;

			th.on('keyup', () => Users.search());

			Users.thead.querySelector('.search-bar').appendChild(th);
		}

		Users.loadSearchParams();
	}

	static async load() {

		const users = await API.call('users/list');

		Users.list = users.map(user => new UserManage(user));

		Users.render(Users.list);
	}

	static search() {

		const searchQuery = Users.thead.querySelectorAll('.search-bar input');

		const list = Users.list.filter(user => {

			for(const input of searchQuery) {

				const query = input.value.toLowerCase();

				if(!query)
					continue;

				const value = user[input.dataset.key].toString().toLowerCase();

				if(!value.includes(query))
					return false;
			}
			return true;
		});

		Users.render(list);
	}

	static render(list) {

		Users.contaier.textContent = null;

		const searchQueries = Users.thead.querySelectorAll('.search-bar th');

		for(const user of list)
			Users.contaier.appendChild(user.row);

		if(!list.length)
			Users.contaier.innerHTML = '<td colspan="5" class="NA">No rows found :(</td>'
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

	static loadSearchParams() {

		const
			container = Users.userSearch.querySelector('.params'),
			categoryDatalist =  [],
			privilegeDatalist = [],
			roleDatalist = [];

		for(const category of MetaData.categories.values()) {
			categoryDatalist.push({
				name: category.name,
				value:category.category_id
			});
		}

		for(const privilege of MetaData.privileges.values()) {
			privilegeDatalist.push({
				name: privilege.name,
				value: privilege.privilege_id
			})
		}

		for(const role of MetaData.roles.values()) {
			roleDatalist.push({
				name: role.name,
				value: role.role_id
			})
		}

		Users.category = new MultiSelect({datalist: categoryDatalist, expand: true});
		Users.privilege = new MultiSelect({datalist: privilegeDatalist, expand: true});
		Users.role = new MultiSelect({datalist: roleDatalist, expand: true});

		container.querySelector('.category').appendChild(Users.category.container);
		container.querySelector('.privilege').appendChild(Users.privilege.container);
		container.querySelector('.role').appendChild(Users.role.container);

		container.querySelector('button[name=apply]').on('click', () => Users.globalSearch());
	}

	static async globalSearch() {

		const parameters = new URLSearchParams();

		parameters.set('search_with', Users.userSearch.querySelector('select[name=search_with]').value);

		for(const value of Users.category.value)
			parameters.append('category_id', value);

		if(parameters.get('search_with') == 'privilege') {

			for(const value of Users.privilege.value)
				parameters.append('privilege_id', value);
		}

		if(parameters.get('search_with') == 'role') {

			for(const value of Users.role.value)
				parameters.append('role_id', value);
		}

		const
			data = await API.call('search/user_search', parameters.toString()),
			filteredUsers = Users.list.filter(x => data.some( y => y == x.user_id));

		console.log(data, '.............', filteredUsers);

		Users.render(filteredUsers);
	}
}

Page.class = Users;

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

	static async add() {

		UserManage.form.removeEventListener('submit', UserManage.submitListener);
		UserManage.form.reset();

		UserManage.heading.textContent = 'Add User';
		UserManage.form.on('submit', UserManage.submitListener = e => UserManage.insert(e));

		Privileges.privileges_container.innerHTML = `<div class="NA">You can add privileges to this user once you add the user :(</div>`;
		Roles.roles_container.innerHTML = `<div class="NA">You can add roles to this user once you add the user :(</div>`;

		Privileges.add_filter.classList.add('hidden');
		Roles.add_roles.classList.add('hidden');

		await Sections.show('form');

		UserManage.form.first_name.focus();
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

		UserManage.heading.textContent = `Editing ${this.first_name} ${this.last_name || ''}`;
		UserManage.form.on('submit', UserManage.submitListener = e => this.update(e));

		for(const key in this) {
			if(UserManage.form.elements[key])
				UserManage.form.elements[key].value = this[key];
		}

		UserManage.form.password.value = null;

		Privileges.add_filter.classList.remove('hidden');
		Roles.add_roles.classList.remove('hidden')

		if(Privileges.submitListener)
			Privileges.add_filter.removeEventListener('submit', Privileges.submitListener);

		Privileges.add_filter.on('submit', Privileges.submitListener = async (e) => {
			e.preventDefault();
			await this.privileges.add();
		});

		if(Roles.submitListener)
			Roles.add_roles.removeEventListener('submit', Roles.submitListener);

		Roles.add_roles.on('submit', Roles.submitListener = async (e) => {
			e.preventDefault();
			await this.roles.add();
		});

		this.privileges.render();
		this.roles.render();

		await Sections.show('form');

		UserManage.form.first_name.focus();
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

		if(!UserManage.form.password.value)
			delete parameters.password;

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
		await Sections.show('list');
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${this.email}</td>
			<td class="action green" title="Edit">Edit</i></td>
			<td class="action red" title="Delete">Delete</td>
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

		Privileges.add_filter = Privileges.container.querySelector('#add-filter');

		for(const data of MetaData.categories.values()) {
			Privileges.add_filter.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		for(const data of MetaData.privileges.values()) {
			Privileges.add_filter.privilege_id.insertAdjacentHTML('beforeend',`
				<option value="${data.privilege_id}">${data.name}</option>
			`);
		}
	}

	constructor(privileges, user) {

		this.list = [];

		for(const key of privileges)
			this.list.push(new Privilege(key, user, this));

		this.user = user;
	}

	async add(e) {

		const options= {
			method: 'POST',
			form: new FormData(Privileges.add_filter)
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
			Privileges.privileges_container.innerHTML = `<div class="NA">No privilege assigned :(</div>`;

		for(const privilege of this.list) {
			container.appendChild(privilege.row);
		}
	}
}

class Privilege {

	constructor(privilege, user, parent) {

		for(const key in privilege)
			this[key] = privilege[key];

		this.user = user;
		this.parent = parent;
	}

	get row() {

		this.container = document.createElement('form');

		this.container.classList.add('filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `

			<label>
				<select name="category_id"></select>
			</label>

			<label>
				<select name="privilege_id"></select>
			</label>

			<label class="edit">
				<button title="Edit"><i class="fa fa-save"></i></button>
			</label>

			<label class="delete">
				<button title="Delete"><i class="fa fa-trash-alt" aria-hidden="true"></i></button>
			</label>
		`;

		Array.from(MetaData.categories.values()).map(c => this.container.category_id.insertAdjacentHTML('beforeend', `
			<option value="${c.category_id}" ${c.category_id == this.category_id ? 'selected' : ''} >${c.name}</option>`));

		Array.from(MetaData.privileges.values()).map(c => this.container.privilege_id.insertAdjacentHTML('beforeend', `
			<option value="${c.privilege_id}" ${c.privilege_id == this.privilege_id ? 'selected' : ''} >${c.name}</option>`));

		this.container.on('submit', async (e) => {
			e.preventDefault();
			this.edit(this.id);

		});
		this.container.querySelector('.delete').on('click', async (e) => {
			e.preventDefault();
			this.delete(this.id);

		});

		return this.container;
	}

	async edit(id) {

		const options = {
			method: 'POST',
			form: new FormData(this.container),
		}

		const parameters = {
			user_id: this.user.user_id,
			id: id,
		}

		await API.call('user/privileges/update', parameters, options);

		await Users.load();

		this.parent.render();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}

	async delete(id) {

		if(!window.confirm('Are you sure?!'))
			return;

		const options = {
			method: 'POST',
		};

		const parameters = {
			id: id
		};

		await API.call('user/privileges/delete', parameters, options);

		await Users.load();

		this.parent.render();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}
}

class Roles {

	static setup() {

		Roles.container = document.querySelector('.roles.form-container');

		Roles.roles_container = Roles.container.querySelector('#roles-list');

		Roles.add_roles = Roles.container.querySelector('#add-roles');

		for(const data of MetaData.categories.values()) {
			Roles.add_roles.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		for(const data of MetaData.roles.values()) {
			Roles.add_roles.role_id.insertAdjacentHTML('beforeend',`
				<option value="${data.role_id}">${data.name}</option>
			`);
		}
	}

	constructor(roles, user) {

		this.list = [];

		for(const key of roles)
			this.list.push(new Role(key, user, this));

		this.user = user;
	}

	async add() {

		const options= {
			method: 'POST',
			form: new FormData(Roles.add_roles)
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
			Roles.roles_container.innerHTML = `<div class="NA">No roles assigned :(</div>`;

		for(const privilege of this.list) {
			container.appendChild(privilege.row);
		}
	}
}

class Role {

	constructor(roles, user, parent) {

		for(const key in roles)
			this[key] = roles[key];

		this.user = user;
		this.parent = parent;
	}

	get row() {

		this.container = document.createElement('form');

		this.container.classList.add('filter');
		this.container.id = 'filters-form-'+this.id;

		this.container.innerHTML = `

			<label>
				<select name="category_id"></select>
			</label>

			<label>
				<select name="role_id"></select>
			</label>

			<label class="edit">
				<button title="Edit"><i class="fa fa-save"></i></button>
			</label>

			<label class="delete">
				<button title="Delete"><i class="fa fa-trash-alt" aria-hidden="true"></i></button>
			</label>
		`;

		Array.from(MetaData.categories.values()).map(c => this.container.category_id.insertAdjacentHTML('beforeend', `
			<option value="${c.category_id}" ${c.category_id == this.category_id ? 'selected' : ''} >${c.name}</option>`));

		Array.from(MetaData.roles.values()).map(c => this.container.role_id.insertAdjacentHTML('beforeend', `
			<option value="${c.role_id}" ${c.role_id == this.role_id ? 'selected' : ''} >${c.name}</option>`));

		this.container.querySelector('.edit').on('click', async (e) => {
			e.preventDefault();
			this.edit(this.id);
		});

		this.container.querySelector('.delete').on('click', async (e) => {
			e.preventDefault();
			this.delete(this.id);}
		);

		return this.container;
	}

	async edit(id) {

		const options = {
			method: 'POST',
			form: new FormData(this.container),
		}

		const parameters = {
			id: id,
		}

		await API.call('accounts/roles/update', parameters, options);

		await Users.load();

		this.parent.render();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();

	}

	async delete(id) {

		if(!window.confirm('Are you sure?!'))
			return;

		const options = {
			method: 'POST',
		};

		const parameters = {
			id: id
		};

		await API.call('accounts/roles/delete', parameters, options);

		await Users.load();

		this.parent.render();

		Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();
	}
}