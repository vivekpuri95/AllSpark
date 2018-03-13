class ForgotPassword extends Page {

	static async setup() {

		await Page.setup();

		ForgotPassword.container = document.querySelector('main');
		ForgotPassword.form = ForgotPassword.container.querySelector('form');
		ForgotPassword.message = ForgotPassword.container.querySelector('#message');

		const logo = ForgotPassword.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;

		ForgotPassword.form.on('submit', ForgotPassword.sendLink);
	}

	static async sendLink(e) {

		e.preventDefault();

		ForgotPassword.message.classList.add('notice');
		ForgotPassword.message.classList.remove('warning', 'hidden');

		const options = {
			method: 'POST',
			form: new FormData(ForgotPassword.form)
		};

		const response = await API.call('v2/user/password/resetlink', {}, options);
		ForgotPassword.message.innerHTML = 'reset link is been sent';
	}

}

window.on('DOMContentLoaded', ForgotPassword.setup);