class Login extends Page {

	static async setup(container) {

		await Page.setup();

		Login.container = document.querySelector('main');
		Login.form = Login.container.querySelector('form');
		Login.message = Login.container.querySelector('#message');

		const logo = Login.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		if(account)
			logo.src = account.logo;

		Login.form.on('submit', Login.submit);
	}

	static async submit(e) {

		e.preventDefault();

		Login.message.classList.add('notice');
		Login.message.classList.remove('warning', 'hidden');
		Login.message.textContent = 'Logging you in!';

		const options = {
			form: new FormData(Login.form)
		};

		try {

			localStorage.refresh_token = await API.call('v2/authentication/login', {}, options);

		} catch(response) {

			Login.message.classList.remove('notice');
			Login.message.classList.add('warning');
			Login.message.textContent = response.message || response;

			return;
		}

		Login.message.innerHTML = 'Login Successful! Redirecting&hellip;';

		window.location = '../';
	}
}

window.on('DOMContentLoaded', Login.setup);