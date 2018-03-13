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

		const resposne = await API.call('v2/user/password/resetlink', {}, options);
		if(resposne)
			ForgotPassword.message.innerHTML = 'reset link is been sent';
		else {
			ForgotPassword.message.classList.remove('notice');
			ForgotPassword.message.classList.add('warning');
			ForgotPassword.message.innerHTML = 'Tokan Expired';
		}

	}

}

window.on('DOMContentLoaded', ForgotPassword.setup);