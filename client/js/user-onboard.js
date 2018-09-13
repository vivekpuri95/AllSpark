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

		if(this.progress == 100) {

			await Storage.delete('newUser');
		}

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
		`;

		if(this.progress == 0) {

			container.querySelector('.progress').classList.add('progress-zero');
		}

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

		return container;
	}

	async loadWelcomeDialogBox() {

		if(this.stages.some(stage => stage.completed))
			return;

		if(window.location.pathname == '/connections-manager')
			return;

		const newUser = await Storage.get('newUser');

		if(newUser.skipWelcomeDialogBox)
			return;

		if(!this.dialogBox) {

			this.dialogBox = new DialogBox({closable: false});

			this.dialogBox.container.classList.add('user-onboarding-welcome');
		}

		document.body.querySelector('.setup-stages').classList.add('blur');

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
		`;

		this.dialogBox.body.querySelector('.initiate-walkthrough').on('click', () => {
			window.location = '/connections-manager';
		});

		if(window.loadWelcomeDialogBoxListener)
			window.loadWelcomeDialogBoxListener(this);

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

		container.innerHTML = `
			<div class="current">
				<span class="NA">${this.progress}%</span>
				<span><i class="fa fa-server"></i> Add Connection</span>
			</div>
			<div class="next">
				<span class="NA">Next</span>
				<span><i class="fa fa-database"></i> Add Report</span>
			</div>
		`;

		container.querySelector('.current').on('click', () => {

			window.location = this.url;
		});

		container.querySelector('.next').on('click', () => {

			window.location = '/reports/configure-report/add';
		});

		if(!this.completed) {

			container.querySelector('.next').classList.add('disabled');
		}


		return container;
	}

	get url() {

		return '/connections-manager';
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

		container.innerHTML = `
			<div class="current">
				<span class="NA">${this.progress}%</span>
				<span><i class="fa fa-database"></i> Add Report</span>
			</div>
			<div class="next">
				<span class="NA">Next</span>
				<span><i class="fa fa-newspaper"></i>Add Dashboard</span>
			</div>
		`;

		container.querySelector('.current').on('click', () => {

			window.location = this.url;
		});

		container.querySelector('.next').on('click', () => {

			window.location = '/dashboards-manager/add';
		});

		if(!this.completed) {

			container.querySelector('.next').classList.add('disabled');
		}

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

		container.innerHTML = `
			<div class="current">
				<span class="NA">${this.progress}%</span>
				<span><i class="fa fa-newspaper"></i> Add Dashboard</span>
			</div>
			<div class="next">
				<span class="NA">Next</span>
				<span><i class="fa fa-chart-line"></i> Add Visualization</span>
			</div>
		`;

		container.querySelector('.current').on('click', () => {

			window.location = this.url;
		});

		container.querySelector('.next').on('click', () => {

			window.location = this.stages[1].report ? `/reports/pick-visualization/${this.stages[1].report.query_id}` : '/reports';
		});

		if(!this.completed) {

			container.querySelector('.next').classList.add('disabled');
		}

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

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = super.container;

		container.innerHTML = `
			<div class="current">
				<span class="NA">${this.progress}%</span>
				<span><i class="fa fa-chart-line"></i> Add Visualization</span>
			</div>
		`;

		container.querySelector('.current').on('click', () => {

			window.location = this.url;
		});

		return container;
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