Page.class = class Signup extends Page {

	constructor() {

		super();

		if(this.user.id) {
			location.href = 'dashboard/first';
			return;
		}

		this.form = this.container.querySelector('form#signup-form');
		this.setup();

	}

	setup() {

		this.container.querySelector('.toolbar #back').on('click', () => location.href = '/login');
		this.container.querySelector('.toolbar .loading').classList.add('hidden');
		this.form.on('submit', e => this.submit(e));
	}

	async submit(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(this.form),
		};

		this.container.querySelector('.toolbar .loading').classList.remove('hidden');

		await API.call('signup/createaccount', {}, options);

		this.form.reset();
		location.href = '/login';

	}
}