Page.class = class ResetPassword extends Page {

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
	}

	async submit(e) {

		e.preventDefault();

		this.message.classList.remove('warning', 'notice', 'hidden');
		this.message.textContent = null;

		const parameters = {
			reset_token: new URLSearchParams(window.location.search).get('reset_token')
		};

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		try {

			const response = await API.call('authentication/reset', parameters, options);

			window.location = '/login?passwordReset=true'
		}

		catch(error) {

			this.message.classList.add('warning');
			this.message.textContent = error.message || error || 'Something went wrong! :(';
		}
	}
}