class ResetPassword extends Page {

	static async setup() {

		await Page.setup();

		ResetPassword.container = document.querySelector('main');
		ResetPassword.form = ResetPassword.container.querySelector('form');
		ResetPassword.message = ResetPassword.container.querySelector('#message');

		const logo = ResetPassword.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;

		ResetPassword.form.on('submit', ResetPassword.sendLink);
	}

	static async sendLink(e) {
		e.preventDefault();

		ResetPassword.message.classList.add('notice');
		ResetPassword.message.classList.remove('warning', 'hidden');

		const parameters = {
			reset_token : new URLSearchParams(window.location.search).get('reset_token')
		}

		const options = {
			method: 'POST',
			form: new FormData(ResetPassword.form)
		};
		const response = await API.call('authentication/reset', parameters, options);

		if(response) {

			ResetPassword.message.innerHTML = 'Pssword updated successfully';
			setTimeout(() => window.location = '/login', 3000);
		}

		else {
			ResetPassword.message.classList.remove('notice');
			ResetPassword.message.classList.add('warning');
			ResetPassword.message.innerHTML = 'Tokan Expired';
		}

	}

}

window.on('DOMContentLoaded', ResetPassword.setup);