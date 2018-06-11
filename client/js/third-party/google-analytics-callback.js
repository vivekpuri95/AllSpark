Page.class = class extends Page {

	constructor() {

		super();

		this.validate();
	}

	async validate() {

		const
			search = new URLSearchParams(window.location.search),
			parameters = {
				state: search.get('state'),
				code: search.get('code'),
			},
			options = {method: 'POST'},
			body = this.container.querySelector('#body');

		if(search.get('error') == 'access_denied')
			return body.innerHTML = `<div class="warning">Access Denied, Please try again!</div>`;

		let resposne = null;

		try {
			resposne = await API.call('third-party/google-analytics/validate', parameters, options);
		}
		catch(e) {
			body.innerHTML = `<div class="warning">${e.message}</div>`;
			return;
		}

		body.innerHTML = `<div class="notice">Google Analytics authentication successful!</div>`;

		if(resposne == 'done')
			window.location = '/settings/';
	}
}