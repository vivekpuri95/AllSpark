class Users extends Page {

	constructor() {

		super();

		(async () => {

			await Users.setup(this);
			await UserManage.setup();

			Privileges.setup();

			const newUserCheck = await Storage.get('newUser');

			if(newUserCheck.setup && !newUserCheck.forceClosed) {

				for(const file of ['reports.js', 'user-onboard.js']) {

					const script = document.createElement("script");
					script.src = `/js/${file}`;

					document.head.appendChild(script);
				}
			}

			await Users.load();
			Users.loadState();
		})();

		window.on('popstate', e => Users.loadState(e.state));
	}

	static async setup(page) {

		Users.container = page.container.querySelector('section#list table tbody');
		Users.userSearchForm = page.container.querySelector('section#list .user-search');

		Users.userSearchForm.search_by.on('change', () => {

			Users.userSearchForm.querySelector('.role').classList.toggle('hidden', ['privilege', 'category'].includes(Users.userSearchForm.search_by.value));
			Users.userSearchForm.querySelector('.privilege').classList.toggle('hidden', ['role', 'category'].includes(Users.userSearchForm.search_by.value));
		});

		const
			categoryDatalist =  [],
			privilegeDatalist = [],
			roleDatalist = [];

		for(const category of MetaData.categories.values()) {
			categoryDatalist.push({
				name: category.name,
				value:category.category_id,
				subtitle: category.is_admin ? 'Admin' : ' ',
			});
		}

		for(const privilege of MetaData.privileges.values()) {
			privilegeDatalist.push({
				name: privilege.name,
				value: privilege.privilege_id,
				subtitle: privilege.is_admin ? 'Admin' : ' ',
			})
		}

		for(const role of MetaData.roles.values()) {
			roleDatalist.push({
				name: role.name,
				value: role.role_id,
				subtitle: role.is_admin ? 'Admin' : ' ',
			})
		}

		Users.category = new MultiSelect({datalist: categoryDatalist});
		Users.privilege = new MultiSelect({datalist: privilegeDatalist});
		Users.role = new MultiSelect({datalist: roleDatalist});

		Users.userSearchForm.querySelector('.category').appendChild(Users.category.container);
		Users.userSearchForm.querySelector('.privilege').appendChild(Users.privilege.container);
		Users.userSearchForm.querySelector('.role').appendChild(Users.role.container);

		Users.userSearchForm.on('submit', e => Users.load(e));
	}

	static async load(e) {

		if(e)
			e.preventDefault();

		const parameters = new URLSearchParams();

		parameters.set('search', "users");

		for(const element of Users.userSearchForm.querySelectorAll('input, select'))
			parameters.set(element.name, element.value);

		for(const value of Users.category.value)
			parameters.append('category_id', value);

		if(parameters.get('search_by') == 'privilege') {

			for(const value of Users.privilege.value)
				parameters.append('privilege_id', value);
		}

		if(parameters.get('search_by') == 'role') {

			for(const value of Users.role.value)
				parameters.append('role_id', value);
		}

		const
			data = await API.call('search/query', parameters.toString());

		Users.list = data.map(user => new UserManage(user));

		Users.render(Users.list);
	}

	static render(list) {

		Users.container.textContent = null;

		for(const user of list)
			Users.container.appendChild(user.row);

		if(!list.length)
			Users.container.innerHTML = '<td colspan="5" class="NA">No rows found</td>'
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

Page.class = Users;

class UserManage {

	static async setup() {

		UserManage.container = document.querySelector('section#form');
		UserManage.form = UserManage.container.querySelector('form');
		UserManage.heading = UserManage.container.querySelector('h1');

		document.querySelector('section#list #add-user').on('click', () => {
			UserManage.add();
			history.pushState({what: 'add'}, '', `/users-manager/add`);
		});

		UserManage.container.querySelector('#cancel-form').on('click', UserManage.back);
	}

	static back() {

		if(history.state)
			return history.back();

		Sections.show('list');
		history.pushState(null, '', `/users-manager`);
	}

	static async add() {

		UserManage.form.removeEventListener('submit', UserManage.submitListener);
		UserManage.form.reset();

		UserManage.heading.textContent = 'Add User';
		UserManage.form.on('submit', UserManage.submitListener = e => UserManage.insert(e));

		Privileges.privileges_container.innerHTML = `<div class="NA">You can add privileges to this user once you add the user</div>`;
		UserManage.container.querySelector('.roles.form-container').innerHTML = `<div class="NA">You can add roles to this user once you add the user</div>`;

		Privileges.add_filter.classList.add('hidden');
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

			const response = await API.call('users/insert', parameters, options);

			await Users.load();

			const [user] = Users.list.filter(user => user.user_id == response.insertId);

			user.edit();

			new SnackBar({
				message: 'New User Added',
				subtitle: `${user.name} #${user.user_id}`,
				icon: 'fas fa-user-plus',
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

	constructor(user) {

		for(const key in user)
			this[key] = user[key];

		this.id = this.user_id;
		this.name = [this.first_name, this.middle_name, this.last_name].filter(a => a).join(' ');

		this.privileges = new Privileges(this.privileges, user);
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

		if(Privileges.submitListener)
			Privileges.add_filter.removeEventListener('submit', Privileges.submitListener);

		Privileges.add_filter.on('submit', Privileges.submitListener = async (e) => {
			e.preventDefault();
			await this.privileges.insert();
		});

		this.objectRoles = new ObjectRoles('user', this.id, ['role']);

		await this.objectRoles.load();

		UserManage.container.querySelector('.roles.form-container').textContent = null;

		UserManage.container.querySelector('.roles.form-container').appendChild(this.objectRoles.container);

		this.privileges.render();
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

		try {

			await API.call('users/update', parameters, options);

			await Users.load();

			new SnackBar({
				message: 'User Profile Saved',
				subtitle: `${this.name} #${this.user_id}`,
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
				user_id: this.id,
				status: 0,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('users/delete', parameters, options);

			await Users.load();
			await Sections.show('list');

			new SnackBar({
				message: 'User Deleted',
				subtitle: `${this.name} #${this.user_id}`,
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

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td><a href="/user/profile/${this.id}" target="_blank">${this.name}</a></td>
			<td>${this.email}</td>
			<td title="${Format.dateTime(this.last_login)}">${Format.ago(this.last_login)}</td>
			<td class="action green" title="Edit">Edit</i></td>
			<td class="action red" title="Delete">Delete</td>
		`;

		this.container.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState({what: this.id}, '', `/users-manager/${this.id}`);
		});

		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}
}

class Privileges {

	static setup() {

		Privileges.container = document.querySelector('.privileges.form-container');

		if(!user.privileges.has('admin') && !user.privileges.has('superadmin'))
			Privileges.container.classList.add('hidden');

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

	async insert(e) {

		const options= {
			method: 'POST',
			form: new FormData(Privileges.add_filter)
		}

		try {

			await API.call('user/privileges/insert', {user_id: this.user.user_id}, options);

			this.render();

			await Users.load();

			Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();

			new SnackBar({
				message: `Privilege Assigned to ${this.user.name}`,
				subtitle: `
					Category: <strong>${MetaData.categories.get(parseInt(Privileges.add_filter.category_id.value)).name}</strong>;
					Privilege: <strong>${MetaData.privileges.get(parseInt(Privileges.add_filter.privilege_id.value)).name}</strong>
				`,
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

	render() {

		const container = Privileges.privileges_container;

		container.textContent = null;

		if(!this.list.length)
			Privileges.privileges_container.innerHTML = `<div class="NA">No privilege assigned</div>`;

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

		this.container.innerHTML = `

			<label>
				<select name="category_id"></select>
			</label>

			<label>
				<select name="privilege_id"></select>
			</label>

			<label class="edit">
				<button title="Edit"><i class="far fa-save"></i></button>
			</label>

			<label class="delete">
				<button title="Delete"><i class="far fa-trash-alt" aria-hidden="true"></i></button>
			</label>
		`;

		Array.from(MetaData.categories.values()).map(c => this.container.category_id.insertAdjacentHTML('beforeend', `
			<option value="${c.category_id}" ${c.category_id == this.category_id ? 'selected' : ''} >${c.name}</option>`));

		Array.from(MetaData.privileges.values()).map(c => this.container.privilege_id.insertAdjacentHTML('beforeend', `
			<option value="${c.privilege_id}" ${c.privilege_id == this.privilege_id ? 'selected' : ''} >${c.name}</option>`));

		this.container.on('submit', async (e) => {
			e.preventDefault();
			this.update(this.id);

		});
		this.container.querySelector('.delete').on('click', async (e) => {
			e.preventDefault();
			this.delete(this.id);

		});

		return this.container;
	}

	async update(id) {

		const
			parameters = {
				user_id: this.user.user_id,
				id: id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.container),
			};

		try {

			await API.call('user/privileges/update', parameters, options);

			await Users.load();

			this.parent.render();

			Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();

			new SnackBar({
				message: `${this.user.name}'s Privilge Saved`,
				subtitle: `
					Category: <strong>${MetaData.categories.get(parseInt(this.container.category_id.value)).name}</strong>;
					Privilege: <strong>${MetaData.privileges.get(parseInt(this.container.privilege_id.value)).name}</strong>
				`,
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

	async delete(id) {

		if(!window.confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id,
			},
			options = {
				method: 'POST',
			};

		try {

			await API.call('user/privileges/delete', parameters, options);

			await Users.load();

			this.parent.render();

			Users.list.filter(u => u.user_id == this.user.user_id)[0].edit();

			new SnackBar({
				message: `${this.user.name}'s Privilge Deleted`,
				subtitle: `
					Category: <strong>${MetaData.categories.get(parseInt(this.container.category_id.value)).name}</strong>;
					Privilege: <strong>${MetaData.privileges.get(parseInt(this.container.privilege_id.value)).name}</strong>
				`,
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
}
