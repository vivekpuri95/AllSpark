import * as AllSpark from '/js/main-modules.js';

export class Roles extends Map {

	constructor() {
		super()
	}

	get name() {
		return 'Roles';
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('settings-module');

		container.innerHTML = `

			<h1>${this.name}</h1>

			<table class="block">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Admin</th>
						<th>Edit</th>
						<th>Delete</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`;

		this.load();

		return container;
	}

	async load() {

		this.clear();

		// window.history.pushState({module: this.name, id: this.role_id}, '', '/settings-new/roles')

		for(const role of await AllSpark.API.call('roles/list'))
			this.set(role.role_id, new Role(role, this));

		this.render();
	}

	render() {

		const container = this.container.querySelector('table tbody');

		container.textContent = null;

		for(const role of this.values())
			container.appendChild(role.row);

		if(!container.children.length)
			container.innerHTML = '<tr><td class="NA" colspan="5">No Roles Found</td></tr>';
	}
}

class Role {

	constructor(role, roles) {

		Object.assign(this, role);

		this.roles = roles;
	}

	get row() {

		if(this.rowElement)
			return this.rowElement;

		const row = this.rowElement = document.createElement('tr');

		row.innerHTML = `
			<td>${this.role_id}</td>
			<td>${this.name}</td>
			<td>${this.is_admin ? 'Yes' : 'No'}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		row.querySelector('.action.green').on('click', () => this.edit());
		row.querySelector('.action.red').on('click', () => this.delete());

		return row;
	}

	edit() {

		const parent = this.roles.container.parentElement;

		if(!parent)
			return;

		parent.insertBefore(this.form, this.roles.container);

		this.roles.container.remove();
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		const form = this.formElement = document.createElement('form');

		form.classList.add('settings-module');

		form.innerHTML = `

			<h1>Editing Role: ${this.name} <span class="NA">#${this.role_id}</span></h1>

			<header class="toolbar">
				<button type="button" id="back"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit"><i class="far fa-save"></i> Save</button>
			</header>

			<div class="form block">

				<label>
					<span>Name</span>
					<input type="text" name="name" maxlength="30" value="${this.name}" required>
				</label>

				<label>
					<span>Admin</span>
					<select name="is_admin">
						<option value="1">Yes</option>
						<option value="0">No</option>
					</select>
				</label>
			</div>
		`;

		form.querySelector('header #back').on('click', () => this.back());

		form.is_admin.value = parseInt(this.is_admin) ? 1 : 0;

		form.on('submit', e => {
			e.preventDefault();
			this.update();
		});

		return form;
	}

	back() {

		if(history.state)
			return history.back();

		history.pushState(null, '', `/settings-new/roles`);
	}

	async update() {

		const
			parameter = {
				role_id: this.role_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		try {

			await AllSpark.API.call('roles/update', parameter, options);

			await this.roles.load();

			new SnackBar({
				message: 'Role Saved',
				subtitle: `${this.form.name.value} #${this.role_id}`,
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

	async delete({skipConfirm = false} = {}) {

		if(!skipConfirm && !confirm('Are you sure?!'))
			return;

		const
			parameter = {
				role_id: this.role_id,
			},
			options = {
				method: 'POST',
			};

		try {

			await AllSpark.API.call('roles/delete', parameter, options);

			await this.roles.load();

			new AllSpark.SnackBar({
				message: 'Role Deleted',
				subtitle: `${this.name} #${this.role_id}`,
				icon: 'far fa-trash-alt',
			});

		} catch(e) {

			new AllSpark.SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}
}