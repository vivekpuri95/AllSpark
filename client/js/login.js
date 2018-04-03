Page.class = class Login extends Page {

	constructor() {

		super();

		this.form = this.container.querySelector('form');
		this.message = this.container.querySelector('#message');

		this.form.on('submit', e => this.submit(e));

		if(!account) {
			this.message.textContent = 'Account not found! :(';
			this.message.classList.remove('hidden');
			this.message.classList.add('warning');
			return;
		}

		const logo = this.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;

		if(account.settings.get('skip_authentication'))
			return this.skip_authentication();

		this.form.email.focus();
	}

	async skip_authentication() {

		this.form.innerHTML = `
			<div class="whitelabel">
				<i class="fa fa-spinner fa-spin"></i>
			</div>
		`;

		const parameters = new URLSearchParams(window.location.search);

		if(!localStorage.access_token && (!parameters.has('access_token') || !parameters.get('access_token'))) {

			this.form.innerHTML = '<div class="whitelabel"><i class="fas fa-exclamation-triangle"></i></div>';

			this.message.textContent = 'Cannot authenticate user, please reload the page :(';
			this.message.classList.remove('hidden');
			this.message.classList.add('warning');
		}

		try {

			const params = {
				access_token: localStorage.access_token || parameters.get('access_token'),
			};

			localStorage.refresh_token = await API.call('authentication/tookan', params);

		} catch(error) {

			this.message.classList.remove('notice');
			this.message.classList.add('warning');
			this.message.textContent = error.message || error;

			return;
		}

		this.message.innerHTML = 'Login Successful! Redirecting&hellip;';

		window.location = '../';
	}

	async submit(e) {

		e.preventDefault();

		console.log(this);

		if(!account)
			return;

		this.message.classList.add('notice');
		this.message.classList.remove('warning', 'hidden');
		this.message.textContent = 'Logging you in!';

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		try {

			localStorage.refresh_token = await API.call('authentication/login', {}, options);

			await API.refreshToken();

		} catch(error) {

			this.message.classList.remove('notice');
			this.message.classList.add('warning');
			this.message.textContent = error.message || error;

			return;
		}

		this.message.innerHTML = 'Login Successful! Redirecting&hellip;';

		window.location = '../';
	}
}