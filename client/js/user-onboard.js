class UserOnboard {

	static async setup() {

		if(document.querySelector('.setup-stages'))
			document.querySelector('.setup-stages').remove();

		if(!UserOnboard.instance)
			UserOnboard.instance = new UserOnboard();

		await UserOnboard.instance.load();
	}

	constructor() {

		this.page = window.page;
		this.stages = [];
	}

	async load() {

		this.stages = [];

		const stageLoads = [];

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage();

			this.stages.push(stageObj);

			stageLoads.push(stageObj.load());
		}

		await Promise.all(stageLoads);

		if(this.stages.every(stage => stage.isCompleted))
			return await Storage.delete('newUser');

		if(document.querySelector('main .setup-stages'))
			document.querySelector('main .setup-stages').remove();

		document.querySelector('main').appendChild(this.container);

		this.loadWelcomeDialogBox();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('setup-stages');

		container.innerHTML = `<a href="${demo_url}" target="_blank">View Demo</a>`;

		for(const stage of this.stages)
			container.appendChild(stage.container);

		container.insertAdjacentHTML('beforeend', '<span class="close">Skip</span>');

		container.querySelector('.close').on('click', async () => {

			container.remove();

			await Storage.delete('newUser');
		});

		return container;
	}

	async loadWelcomeDialogBox() {

		if(this.stages.some(stage => stage.isCompleted))
			return;

		const newUser = await Storage.get('newUser');

		if(newUser.skipWelcomeDialogBox == true)
			return;

		if(!this.dialogBox) {

			this.dialogBox = new DialogBox();

			this.dialogBox.container.classList.add('user-onboarding-welcome');
		}

		this.dialogBox.body.innerHTML = `

			<h2>Lets Get You Started</h2>

			<a href="${demo_url}" target="_blank" class="view-demo">
				<span class="figure"><i class="fas fa-external-link-alt"></i></span>
				<span>View Demo</span>
			</a>

			<a class="initiate-walkthrough">
				<span class="figure"><i class="fas fa-cogs"></i></span>
				<span>Configure Manually</span>
			</a>

			<a class="skip">Skip &nbsp;<i class="fas fa-arrow-right"></i></a>
		`;

		this.dialogBox.body.querySelector('.initiate-walkthrough').on('click', () => this.dialogBox.hide);

		if(window.loadWelcomeDialogBoxListener)
			window.loadWelcomeDialogBoxListener(this);

		this.dialogBox.body.querySelector('.skip').on('click', async () => {

			this.dialogBox.hide();

			const newUser = await Storage.get('newUser');

			newUser.skipWelcomeDialogBox = true;

			await Storage.set('newUser', newUser);
		});

		this.dialogBox.show();
	}
}

UserOnboard.stages = new Set();

UserOnboard.stages.add(class AddConnection {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">1</span>
			<span>Add Connection</span>
		`;

		container.on('click', () => {

			window.location = '/connections-manager';
		});

		if(window.location.pathname.split('/').pop() == 'connections-manager') {

			container.classList.add('active');
		}

		return container;
	}

	async load() {

		const response = await API.call('credentials/list');

		if(response.length) {

			this.connection = response[0];

			this.isCompleted = true;
			this.container.classList.add('completed');
			this.container.querySelector('span.order').innerHTML = '<i class="fa fa-check"></i>';
		}
	}
});

UserOnboard.stages.add(class AddReport {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">2</span>
			<span>Create Report</span>
		`;

		container.on('click', () => {

			window.location = this.report ? `/reports/define-report/${this.report.query_id}` : '/reports';
		});

		if(['reports', 'pick-report'].includes(window.location.pathname.split('/').pop())) {

			container.classList.add('active');
		}

		return container;
	}

	async load() {

		await DataSource.load(true);

		if(DataSource.list.size) {

			this.report = DataSource.list.values().next().value;

			this.isCompleted = true;
			this.container.classList.add('completed');
			this.container.querySelector('span.order').innerHTML = '<i class="fa fa-check"></i>';
		}
	}
});

UserOnboard.stages.add(class AddDashboard {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">3</span>
			<span>Create Dashboard</span>
		`;

		container.on('click', () => {

			window.location = this.dashboard ? `/dashboards-manager/${this.dashboard.id}` : '/dashboards-manager/add';
		});

		if(window.location.pathname.split('/').pop() == 'dashboards-manager') {

			container.classList.add('active');
		}

		return container;
	}

	async load() {

		const response = await API.call('dashboards/list');

		if(response.length) {

			this.dashboard =  response[0];

			this.isCompleted = true;
			this.container.classList.add('completed');
			this.container.querySelector('span.order').innerHTML = '<i class="fa fa-check"></i>';
		}
	}
});

UserOnboard.stages.add(class AddVisualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">4</span>
			<span>Create Visualization</span>
		`;

		container.on('click', () => {

			window.location = this.report ? `/reports/pick-visualization/${this.report.query_id}` : '/reports'
		});

		if(window.location.pathname.split('/').pop() == 'pick-visualization') {

			container.classList.add('active');
		}

		return container;
	}

	async load() {

		await DataSource.load();

		if(DataSource.list.size) {

			this.report = DataSource.list.values().next().value;

			if(this.report.visualizations.length) {

				this.isCompleted = true;
				this.container.classList.add('completed');
				this.container.querySelector('span.order').innerHTML = '<i class="fa fa-check"></i>';
			}
		}
	}
});

UserOnboard.setup();