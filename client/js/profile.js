Page.class = class extends Page {

	constructor() {

		super();

		this.id = parseInt(location.pathname.split('/').pop());
		this.load();
	}

	async load() {

		await this.fetch();

		this.render();
	}

	async fetch() {

		const
			parameters = {
				user_id: this.id || user.id,
			},
			options = {
				method: 'POST',
			};

		[this.data] = await API.call('users/list', parameters, options);
	}

	render() {

		if(!this.data)
			return this.container.innerHTML = '<div class="NA">No User found :(</div>';

		this.container.querySelector('.edit').classList.toggle('hidden', user.id != this.id);

		this.container.querySelector('h1 span').textContent = [this.data.first_name, this.data.middle_name, this.data.last_name].filter(a => a).join(' ');

		this.container.querySelector('.profile-details').innerHTML = `
			<label>
				<span>User ID</span>
				<div>${this.data.user_id}</div>
			</label>
			<label>
				<span>Email</span>
				<div>${this.data.email}</div>
			</label>
			<label>
				<span>Phone</span>
				<div>${this.data.phone || ''}</div>
			</label>
		`;

		const privileges = this.container.querySelector('.privileges tbody');

		for(const privilege of this.data.privileges || []) {
			privileges.insertAdjacentHTML('beforeend', `
				<tr>
					<td>${MetaData.categories.has(privilege.category_id) ? MetaData.categories.get(privilege.category_id).name : ''}</td>
					<td>${MetaData.privileges.has(privilege.privilege_id) ? MetaData.privileges.get(privilege.privilege_id).name : ''}</td>
				</tr>
			`);
		}

		if(!this.data.privileges || !this.data.privileges.length)
			privileges.innerHTML = `<tr class="NA"><td colspan="2">No Privileges assigned! :(</td></tr>`;

		const roles = this.container.querySelector('.roles tbody');

		for(const role of this.data.roles || []) {
			roles.insertAdjacentHTML('beforeend', `
				<tr>
					<td>${MetaData.categories.has(role.category_id) ? MetaData.categories.get(role.category_id).name : ''}</td>
					<td>${MetaData.roles.has(role.role_id) ? MetaData.roles.get(role.role_id).name : ''}</td>
				</tr>
			`);
		}

		if(!this.data.roles || !this.data.roles.length)
			roles.innerHTML = `<tr class="NA"><td colspan="2">No Roles assigned! :(</td></tr>`;
	}
}