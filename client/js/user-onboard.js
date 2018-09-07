class UserOnboard {

	constructor(stateChanged) {

		this.page = window.page;
		this.stateChanged = stateChanged;
	}

	static async setup(stateChanged) {

		if(document.querySelector('.setup-stages'))
			document.querySelector('.setup-stages').remove();

		if(!UserOnboard.instance)
			UserOnboard.instance = new UserOnboard(stateChanged);

		UserOnboard.instance.stateChanged = stateChanged;
		await UserOnboard.instance.load();
	}

	async load() {

		this.progress = 0;

		this.stage = (await this.getCurrentStage());

		if(!this.stage) {

			await Storage.delete('newUser');
		}

		if(document.querySelector('.setup-stages')) {

			document.querySelector('.setup-stages').remove();
		}

		document.body.appendChild(this.container);

		this.loadWelcomeDialogBox();
	}

	async getCurrentStage() {

		this.stages = [];

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage(this);
			await stageObj.load();

			this.stages.push(stageObj);

			if(!stageObj.completed) {

				return stageObj;
			}

			this.progress = stageObj.progress;
		}

		return 0;
	}

	get container() {

		if(this.stateChanged) {

			window.location = this.stage.url;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('setup-stages');

		container.innerHTML = `
			<a href="${demo_url}" target="_blank">View Demo <i class="fas fa-external-link-alt"></i></a>
			<div class="progress-bar">
				<div class="progress" style="width: ${this.progress}%"></div>
			</div>		
			<button class="dismiss"><i class="fa fa-times"></i> Dismiss</button>
			
		`;

		if(this.stage) {

			container.appendChild(this.stage.container);
		}
		else {
			container.insertAdjacentHTML('beforeend', `
				<div class="stage-info">
					<div class="current">
						<span class="NA">${this.progress}%</span><span>Setup Complete</span>
					</div>
				</div>
			`);
		}

		container.querySelector('.dismiss').on('click', async () => {

			container.remove();

			await Storage.delete('newUser');

			console.log(await Storage.get('newUser'));
		});

		return container;
	}

	async loadWelcomeDialogBox() {

		if(this.stages.some(stage => stage.completed))
			return;

		const newUser = await Storage.get('newUser');

		if(newUser.skipWelcomeDialogBox)
			return;

		if(!this.dialogBox) {

			this.dialogBox = new DialogBox({closable: false});

			this.dialogBox.container.classList.add('user-onboarding-welcome');
		}

		this.dialogBox.body.innerHTML = `

			<h2>Let's Get <strong>You Started!</strong></h2>

			<a href="${demo_url}" target="_blank" class="view-demo">
				<span class="figure"><img src="/images/onboarding/demo.svg"></span>
				<span>View Demo</span>
				<span class="NA">Check out an established demo with various visualisations</span>
			</a>

			<a class="initiate-walkthrough">
				<span class="figure"><img src="/images/onboarding/manual.svg"></span>
				<span>Configure Manually</span>
				<span class="NA">Connect to a data source and define the data query</span>
			</a>

			<a class="skip">Skip &nbsp;<i class="fas fa-arrow-right"></i></a>
		`;

		this.dialogBox.body.querySelector('.initiate-walkthrough').on('click', () => this.dialogBox.hide());

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

class UserOnboardStage {

	constructor(onboard) {

		this.stages = onboard.stages;
		this.progress = onboard.progress;
	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage-info');

		container.innerHTML = `
			<div class="current"><span class="NA">${this.progress}%</span><span>${this.title}</span></div>
		`;

		container.querySelector('.current').on('click', () => {

			window.location = this.url;
		});

		return container;
	}
}

UserOnboard.stages.add(class AddConnection extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Connection';
	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = super.container;

		const nextStage = document.createElement('div');
		nextStage.classList.add('next');

		nextStage.innerHTML = '<span class="NA">Next</span><span>Add Report</span>';
		nextStage.on('click', () => {

			window.location = '/reports/configure-report/add';
		});

		if(!this.completed) {

			nextStage.classList.add('disabled');
		}

		container.appendChild(nextStage);

		return container;
	}

	get url() {

		return '/connections-manager/add';
	}

	async load() {

		const [response] = await API.call('credentials/list');

		if(!response) {

			return;
		}

		this.connection = response;

		this.completed = true;
		this.progress = this.progress + 10;
	}

});

UserOnboard.stages.add(class AddReport extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Report';
	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = super.container;

		const nextStage = document.createElement('div');
		nextStage.classList.add('next');

		nextStage.innerHTML = '<span class="NA">Next</span><span>Add Dashboard</span>';

		nextStage.on('click', () => {

			window.location = '/dashboards-manager/add';
		});

		if(!this.completed) {

			nextStage.classList.add('disabled');
		}

		container.appendChild(nextStage);

		return container;
	}

	get url() {

		return this.report ? `/reports/define-report/${this.report.query_id}` : '/reports/configure-report/add';
	}

	async load() {

		await DataSource.load(true);

		if(!DataSource.list.size) {

			return;
		}

		this.report = DataSource.list.values().next().value;

		this.completed = true;
		this.progress = this.progress + 40;
	}

});

UserOnboard.stages.add(class AddDashboard extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Dashboard';
	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = super.container;

		const nextStage = document.createElement('div');
		nextStage.classList.add('next');

		nextStage.innerHTML = '<span class="NA">Next</span><span>Add Visualization</span>';

		nextStage.on('click', () => {

			window.location = this.stages[1].report ? `/reports/pick-visualization/${this.stages[1].report.query_id}` : '/reports';
		});

		if(!this.completed) {

			nextStage.classList.add('disabled');
		}

		container.appendChild(nextStage);

		return container;

	}

	get url() {

		return '/dashboards-manager/add';

	}

	async load() {

		const [response] = await API.call('dashboards/list');

		if(!response) {

			return;
		}

		this.dashboard =  response;

		this.completed = true;
		this.progress = this.progress + 25;
	}

});

UserOnboard.stages.add(class AddVisualization extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Visualization';
	}

	get container() {

		return super.container;

	}

	get url() {

		return this.report ? `/reports/pick-visualization/${this.report.query_id}` : '/reports';

	}

	async load() {

		await DataSource.load();

		if(!DataSource.list.size) {

			return;
		}

		this.report = DataSource.list.values().next().value;

		if(!this.report.visualizations.length) {

			return;
		}

		this.completed = true;
		this.progress = this.progress + 25;
	}

});

UserOnboard.setup();