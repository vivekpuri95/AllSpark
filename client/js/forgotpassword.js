Page.class = class ForgotPassword extends Page {

	constructor() {

		super();

		document.querySelector('body > header').classList.add('hidden');

		this.form = this.container.querySelector('form');
		this.message = this.container.querySelector('#message');

		this.form.on('submit', e => this.loadAccounts(e));

		if(!account) {

			this.message.textContent = 'Account not found!';
			this.message.classList.remove('hidden');
			this.message.classList.add('warning');

			return;
		}

		const logo = this.container.querySelector('.logo img');

		logo.on('load', () => logo.parentElement.classList.remove('hidden'));

		logo.src = account.logo;
	}

	async loadAccounts(e) {

		e.preventDefault();

		this.message.classList.remove('warning', 'hidden', 'notice');
		this.message.textContent = null;

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		let accounts;

		try {

			accounts = await API.call('authentication/login', {}, options);
		}
		catch(e) {

			this.message.classList.add('warning');
			this.message.textContent = e.message || e || 'Something went wrong!';

			this.message.classList.remove('hidden');

			return;
		}

		const container = this.container.querySelector('#accept-account');

		container.innerHTML = `
			<div>Select the account to reset password for: </div>
		`;

		for(const account of accounts) {

			const item = document.createElement('div');

			item.classList.add('account');
			item.innerHTML = `<img src="${account.logo}"><span>${account.name}</span>`;

			item.on('click', (e) => {

				e.preventDefault();

				this.sendLink(account)
			});

			container.appendChild(item);
		}

		const backButton = document.createElement('button');
		backButton.textContent = 'Back';

		backButton.on('click', () => Sections.show('accept-email'));

		container.appendChild(backButton);

		if(accounts.length == 1) {

			this.sendLink(accounts[0]);
		}
		else {

			Sections.show('accept-account');
		}
	}

	async sendLink(account) {

		const
			parameters = {
				account_id: account.account_id,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		try {

			const response = await API.call('authentication/resetlink', parameters, options);

			window.location = '/login?resetlink=true';
		}
		catch(error) {

			this.message.classList.add('warning');
			this.message.textContent = error.message || error || 'Something went wrong!';
		}

		this.message.classList.remove('hidden');
	}
}