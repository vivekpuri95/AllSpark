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
		this.progress = 0;
	}

	async load() {

		this.stages = [];

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage();
			await stageObj.load();

			this.progress = this.progress + (stageObj.progress || 0);

			if(!stageObj.isCompleted) {
				this.stages.push(stageObj);
				break;
			}
		}

		if(this.stages.every(stage => stage.isCompleted))
			return await Storage.delete('newUser');

		if(document.querySelector('.setup-stages'))
			document.querySelector('.setup-stages').remove();

		document.body.appendChild(this.container);

// 		this.loadWelcomeDialogBox();
	}

	get container() {

		if(this.containerElement) {

			for(const stage of this.stages) {

				stage.container.style.background = `linear-gradient(to right,  #b3f0b3 0%,#b3f0b3 ${this.progress}%, #d9e3f7 ${this.progress}%, #d9e3f7 100%)`;
			}

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');

		container.classList.add('setup-stages');

		container.innerHTML = `
			<a href="${demo_url}" target="_blank">View Demo</a>
		`;

		let next;

		for(const stage of this.stages) {

			container.appendChild(stage.container);
			stage.container.style.background = `linear-gradient(to right,  #b3f0b3 0%,#b3f0b3 ${this.progress}%, #d9e3f7 ${this.progress}%, #d9e3f7 100%)`;
			next = stage.next;
		}

		container.insertAdjacentHTML('beforeend', `
			<div class="next stage">Next:</div>
			<div class="skip">Skip</div>
		`);

		const nextStep = container.querySelector('.next');

		if(next) {

			nextStep.insertAdjacentHTML('beforeend', `<span>${next.title}</span>`);

			nextStep.on('click', () => {

				window.location = next.url;
			});

			container.querySelector('.skip').on('click', async () => {

			container.remove();

			await Storage.delete('newUser');
		});
		}
		else {

			nextStep.textContent = 'Dismiss';

			nextStep.on('click', async () => {

				container.remove();

				await Storage.delete('newUser');
			});
			container.querySelector('.skip').remove();
			container.style['grid-template-columns'] = '180px 1fr 150px';
		}

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

UserOnboard.stages = new Map();

UserOnboard.stages.set('add-connection', class AddConnection {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `<span>Add Connection</span>`;

		container.on('click', () => {

			window.location = this.url;
		});

		if(window.location.pathname.split('/').pop() == 'connections-manager') {

			container.classList.add('active');
		}

		return container;
	}

	get url() {

		return '/connections-manager';
	}

	async load() {

		const response = await API.call('credentials/list');

		if(response.length) {

			this.connection = response[0];

			this.isCompleted = true;
			this.container.classList.add('completed');

			this.progress = 10;
		}
		
		this.next = {
			title: 'Add Report',
			url: '/reports'
		};
	}
});

UserOnboard.stages.set('add-report', class AddReport {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `<span>Create Report</span>`;

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

			this.progress = 50;
		}

		this.next = {
			title: 'Add Dashboard',
			url: '/dashboards-manager/add'
		};
	}
});

UserOnboard.stages.set('add-dashboard', class AddDashboard {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `<span>Create Dashboard</span>`;

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

			this.progress = 25;
		}

		this.next = {
			title: 'Add Visualization',
			url: '/reports'
		};
	}
});

UserOnboard.stages.set('add-visualization', class AddVisualization {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `<span>Create Visualization</span>`;

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
				this.progress = 25;
				this.container.classList.add('completed');
			}
		}
	}
});

UserOnboard.setup();