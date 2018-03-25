class Login extends Page {

	static async setup(container) {

		await Page.setup();

		Login.container = document.querySelector('main');
		Login.form = Login.container.querySelector('form');
		Login.message = Login.container.querySelector('#message');

		Login.form.on('submit', Login.submit);

		if(!account) {
			Login.message.textContent = 'Account not found! :(';
			Login.message.classList.remove('hidden');
			Login.message.classList.add('warning');
			return;
		}

		const logo = Login.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;

		if(account.settings.get('skip_authentication'))
			return Login.skip_authentication();
	}

	static async skip_authentication() {

		Login.form.innerHTML = `
			<div class="whitelabel">
				<i class="fa fa-spinner fa-spin"></i>
			</div>
		`;
		const parameters = new URLSearchParams(window.location.search);

		if(!localStorage.access_token && (!parameters.has('access_token') || !parameters.get('access_token'))) {
			Login.form.innerHTML = '<div class="whitelabel"><i class="fas fa-exclamation-triangle"></i></div>';
			Login.message.textContent = 'Cannot authenticate user, please reload the page :(';
			Login.message.classList.remove('hidden');
			Login.message.classList.add('warning');
		}

		try {

			const params = {
				access_token: localStorage.access_token || parameters.get('access_token'),
			};

			localStorage.refresh_token = await API.call('authentication/tookan', params);

		} catch(response) {

			Login.message.classList.remove('notice');
			Login.message.classList.add('warning');
			Login.message.textContent = response.description || response;

			return;
		}

		if(!account.settings.get('skip_authentication'))
			Login.message.innerHTML = 'Login Successful! Redirecting&hellip;';

		window.location = '../';
	}

	static async submit(e) {

		e.preventDefault();

		if(!account)
			return;

		Login.message.classList.add('notice');
		Login.message.classList.remove('warning', 'hidden');
		Login.message.textContent = 'Logging you in!';

		const options = {
			method: 'POST',
			form: new FormData(Login.form),
		};

		try {

			localStorage.refresh_token = await API.call('authentication/login', {}, options);

		} catch(response) {

			Login.message.classList.remove('notice');
			Login.message.classList.add('warning');
			Login.message.textContent = response.description || response;

			return;
		}

		Login.message.innerHTML = 'Login Successful! Redirecting&hellip;';

		window.location = '../';
	}
}

window.on('DOMContentLoaded', Login.setup);