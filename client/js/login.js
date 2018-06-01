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

		document.querySelector('body > header .logout').classList.add('hidden');

		document.querySelector('body > header .left-menu-toggle').classList.add('hidden');
		document.querySelector('body > header nav').classList.remove('left');

		const logo = this.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;

		this.skip_authentication();
	}

	async skip_authentication() {

		if(!account.auth_api || !await IndexedDb.instance.get('access_token')) {

			this.container.querySelector('.whitelabel').classList.add('hidden');
			this.form.classList.remove('hidden');

			this.form.email.focus();
			return;
		}

		const parameters = new URLSearchParams(window.location.search);

		if(!(await IndexedDb.instance.has('access_token')) && (!parameters.has('access_token') || !parameters.get('access_token'))) {

			this.form.innerHTML = '<div class="whitelabel form"><i class="fas fa-exclamation-triangle"></i></div>';

			this.message.textContent = 'Cannot authenticate user, please reload the page :(';
			this.message.classList.remove('hidden');
			this.message.classList.add('warning');
		}

		const
			params = {
				access_token: (await IndexedDb.instance.get('access_token')) || parameters.get('access_token') || '',
			},
			options = {
				method: 'POST',
			};

		this.login(params, options);
	}

	async submit(e) {

		e.preventDefault();

		if(!account)
			return;

		this.message.classList.add('notice');
		this.message.classList.remove('warning', 'hidden');
		this.message.textContent = 'Logging you in!';

		const
			params = {},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		this.login(params, options);
	}

	async login(params, options) {

		try {

			const response = await API.call('authentication/login', params, options);

			if(!response.jwt && response.length)
				throw new Page.exception('Same email from multiple accounts not supported yet! :(');

			await IndexedDb.instance.set('refresh_token', response.jwt);
			this.cookies.set('refresh_token', response.jwt);

			if(response.access_token) {
				await IndexedDb.instance.set('access_token', response.access_token);
				this.cookies.set('access_token', response.access_token);
			}

			await API.refreshToken();

			this.message.innerHTML = 'Login Successful! Redirecting&hellip;';
			window.location = '../';

		} catch(error) {

			this.container.querySelector('.whitelabel').classList.add('hidden');
			this.message.classList.remove('notice', 'hidden');
			this.message.classList.add('warning');
			this.message.textContent = error.message || error;
		}
	}
}