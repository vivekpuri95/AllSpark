Page.class = class Login extends Page {

	constructor() {

		super();

		if(!this.account)
			return this.message('Account not found! :(', 'warning');

		document.querySelector('body > header').classList.add('hidden');

		const logo = this.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));
		logo.src = this.account.logo;

		this.container.querySelector('#accept-email form').on('submit', e => {
			e.preventDefault();
			this.loadAccounts();
		});

		this.container.querySelector('#password-back').on('click', () => {
			Sections.show('accept-email');
			this.message('');
		});

		this.bypassLogin();
	}

	async bypassLogin() {

		if(!this.account.auth_api || !(await IndexedDb.instance.get('access_token')))
			return this.acceptEmail();

		Sections.show('loading');

		const
			GETParameters = new URLSearchParams(window.location.search),
			parameters = {
				access_token: (await IndexedDb.instance.get('access_token')) || GETParameters.get('access_token') || '',
			},
			options = {
				method: 'POST',
			};

		await this.authenticate(parameters, options);
	}

	async acceptEmail() {

		await Sections.show('accept-email');

		this.container.querySelector('#accept-email input').focus();
	}

	async loadAccounts() {

		this.message('');
		Sections.show('loading');

		const
			parameters = {},
			options = {
				method: 'POST',
				form: new FormData(this.container.querySelector('#accept-email form')),
			};

		let accounts;

		try {
			accounts = await API.call('authentication/login', parameters, options);
		} catch(error) {

			this.message(error.message || error, 'warning');

			await Sections.show('accept-email');
			this.container.querySelector('#accept-email input').focus();

			return;
		}

		if(!Array.isArray(accounts))
			throw new Page.exception('Invalid account list! :(');

		const container = this.container.querySelector('#accept-account');

		container.textContent = null;

		for(const account of accounts) {

			const item = document.createElement('div');

			item.classList.add('account');
			item.innerHTML = `<img src="${account.logo}"><span>${account.name}</span>`;

			item.on('click', () => this.acceptPassword(account));

			container.appendChild(item);
		}

		if(!accounts.length)
			container.innerHTML = `<div class="NA">Email not associated with any account! :(</div>`;

		if(accounts.length == 1)
			container.querySelector('.account').click();

		else Sections.show('accept-account');
	}

	async acceptPassword(account) {

		Sections.show('accept-password');

		const logo = this.container.querySelector('.logo img');

		logo.parentElement.classList.add('hidden');
		logo.on('load', () => logo.parentElement.classList.remove('hidden'));
		logo.src = account.logo;

		const form = this.container.querySelector('#accept-password form');

		form.reset();
		form.email.value = this.container.querySelector('#accept-email input').value;
		form.password.focus();

		form.removeEventListener('submit', this.acceptPasswordListener);

		form.on('submit', this.acceptPasswordListener = e => {
			e.preventDefault();
			this.login(account);
		});
	}

	async login(account) {

		Sections.show('loading');
		this.message('Logging you in!', 'notice');

		const
			parameters = {
				email: this.container.querySelector('#accept-email input').value,
				password: this.container.querySelector('#accept-password input[type=password]').value,
				account_id: account.account_id,
			},
			options = {
				method: 'POST',
			};

		this.authenticate(parameters, options);

		Sections.show('accept-password');
	}

	async authenticate(parameters, options) {

		try {

			const response = await API.call('authentication/login', parameters, options);

			if(!response.jwt && response.length)
				return this.message('Ambigious email! :(', 'warning');

			await IndexedDb.instance.set('refresh_token', response.jwt);
			this.cookies.set('refresh_token', response.jwt);

			if(response.access_token) {
				await IndexedDb.instance.set('access_token', response.access_token);
				this.cookies.set('access_token', response.access_token);
			}

			await API.refreshToken();

			this.message('Login Successful! Redirecting&hellip;', 'notice');
			window.location = '../';

		} catch(error) {
			this.message(error.message || error, 'warning');
		}
	}

	message(body, type = '') {

		const container = this.container.querySelector('#message');

		container.innerHTML = body;
		container.classList.remove('warning', 'notice', 'hidden');

		if(type)
			container.classList.add(type);

		container.classList.toggle('hidden', !body);
	}
}