class Profile extends Page {

	constructor() {

		super();

		(async () => {
			Profile.setup();
			await Profile.load();
			Profile.render();
		})();
	}

	static setup() {

		Profile.container = document.querySelector('main #profile-details');
	}

	static async load() {

		const options = {
			method: 'POST',
		}

		const parameters = {
			user_id: user.user_id,
		}

		Profile.response = await API.call('users/list', parameters, options);
	}

	static render() {

		const response = Profile.response[0]
		Profile.container.querySelector('#name').textContent = response.first_name + (" "+response.middle_name || "") +" "+response.last_name ;
		Profile.container.querySelector('#user_id').textContent = response.user_id;
		Profile.container.querySelector('#email').textContent = response.email;
		Profile.container.querySelector('#phone').textContent = response.phone || 'NA';

		const privileges_table = Profile.container.querySelector('.privileges table tbody');
		for(const data of response.privileges) {
			const tr = document.createElement('tr');
			tr.innerHTML =`
				<td>${MetaData.categories.get(data.category_id).name}</td>
				<td>${MetaData.privileges.get(data.privilege_id).name}</td>
			`;
			privileges_table.appendChild(tr);
		}

		const roles_table = Profile.container.querySelector('.roles table tbody');
		for(const data of response.roles) {
			const tr = document.createElement('tr');
			tr.innerHTML =`
				<td>${MetaData.categories.get(data.category_id).name}</td>
				<td>${MetaData.roles.get(data.role_id).name}</td>
			`;
			roles_table.appendChild(tr);
		}

	}
}

Page.class = Profile;