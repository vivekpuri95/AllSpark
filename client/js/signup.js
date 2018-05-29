Page.class = class Signup extends Page {

	constructor() {

		super();

		if(account.settings.get("enable_account_signup"))
			Sections.show('signup');

		if(this.user.id) {
			location.href = 'dashboard/first';
			return;
		}

		this.form = this.container.querySelector('form#signup-form');
		this.setup();

	}

	setup() {

		this.container.querySelector('.toolbar #back').on('click', () => location.href = '/login');
		this.container.querySelector('.toolbar span.notice').classList.add('hidden');
		this.form.on('submit', e => this.submit(e));
	}

	async submit(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		await API.call('accounts/signup', {}, options);


		this.container.querySelector('.toolbar span.notice').innerHTML = 'Signup Successful! Please login...';
		this.container.querySelector('.toolbar span.notice').classList.remove('hidden');

		this.form.reset();
		location.href = '/login';

	}
}