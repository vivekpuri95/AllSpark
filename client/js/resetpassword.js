
Page.class = class ResetPassword extends Page {

	constructor() {

		super();

		document.querySelector('body > header').classList.add('hidden');

		this.form = this.container.querySelector('form');
		this.message = this.container.querySelector('#message');

		this.form.on('submit', e => this.submit(e));

		if(!account) {
			this.message.textContent = 'Account not found!';
			this.message.classList.remove('hidden');
			this.message.classList.add('warning');
			return;
		}

		this.form.email.value = this.urlSearchParameters.get('email');

		this.form.querySelector('.account').textContent = `Account: ${this.urlSearchParameters.get('account')}`;

		const logo = this.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;
	}

	async submit(e) {

		e.preventDefault();

		this.message.classList.remove('warning', 'notice', 'hidden');
		this.message.textContent = null;

		const parameters = {
			reset_token: this.urlSearchParameters.get('reset_token'),
			password: this.form.password.value,
		};

		const options = {
			method: 'POST',
		};

		try {

			const response = await API.call('authentication/reset', parameters, options);

			window.location = `/login?passwordReset=true&email=${this.urlSearchParameters.get('email')}`
		}

		catch(error) {

			this.message.classList.add('warning');
			this.message.textContent = error.message || error || 'Something went wrong!';
		}
	}
}