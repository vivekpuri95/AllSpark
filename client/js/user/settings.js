class UserSettings extends Page {

	constructor() {

		super();

		new ChangePassword(this);

		this.settings = new Settings(this);

		this.settings.load();
	}
}

Page.class = UserSettings;

class ChangePassword {

	constructor(page) {

		this.page = page;

		this.render();
	}

	render() {

		const form = this.page.container.querySelector('.change-password .form');

		form.on('submit', async (e) => {

			e.preventDefault();

			const
				options = {
					method: 'POST',
				},
				parameters = {
					old_password: form.old_password.value,
					new_password: form.new_password.value,
				};

			try {
				const response = await API.call('users/changePassword', parameters, options);

				new SnackBar({
					message: 'Password Changed Successfully',
					icon: 'fa fa-plus',
				});
			}
			catch (e) {

				new SnackBar({
					message: 'Request Failed',
					subtitle: e.message,
					type: 'error',
				});
			}
		});
	}
}

class Settings {

	constructor(page) {

		this.page = page;
	}

	async load() {

		const settings_json = [
			{
				key: 'theme',
				type: 'multiselect',
				name: 'Theme',
				datalist: [
					{name: 'Dark', value: 'dark'},
					{name: 'Light', value: 'light'},
				],
				multiple: false,
				dropDownPosition: 'bottom',
			},
		];

		const settingsManger = new SettingsManager({
			owner: 'user',
			owner_id: user.user_id,
			format: settings_json,
		});

		// Clear the service worker on settings change to fetch new data
		settingsManger.on('submit', () => this.page.serviceWorker.clear());

		await settingsManger.load();

		const container = this.page.container.querySelector('.user-settings');

		if(container.querySelector('.settings-manager'))
			container.querySelector('.settings-manager').remove();

		container.appendChild(settingsManger.container);
	}
}