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
		this.stages = [];

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage(this);
			await stageObj.load();

			this.stages.push(stageObj);
			this.progress = stageObj.progress;
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

	get container() {

		const [nextStage] = this.stages.filter(x => !x.completed);

		if(this.stateChanged && nextStage) {

			window.location = nextStage.url;
		}

		if(nextStage) {
			
			nextStage.setActive();
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('setup-stages');

		container.innerHTML = `
			<div class="wrapper"></div>
			<a href="${demo_url}" target="_blank"><i class="fas fa-external-link-alt"></i> View Demo</a>
		`;

		const wrapper = container.querySelector('.wrapper');

		for(const stage of this.stages) {

			if(stage.completed) {

				stage.checked();
			}

			wrapper.appendChild(stage.container);
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

		await Storage.set('newUser', {skipWelcomeDialogBox: true});

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
		container.classList.add('stage');

		container.innerHTML = `
			<div class="hellip">
				<i class="fas fa-ellipsis-v"></i>
				<i class="fas fa-ellipsis-v"></i>
			</div>
			<div class="info">${this.title}<span class="NA">${this.subtitle || ''}</span></div>
			<div class="status"></div>
		`;

		container.on('click', () => {

			window.location = this.url;
		});

		return container;
	}

	checked() {

		const status = this.container.querySelector('.status');

		status.innerHTML = '<i class="fas fa-check"></i>';
		status.classList.add('checked');

	}

	setActive() {

		this.container.classList.add('active');
	}
}

UserOnboard.stages.add(class AddConnection extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Connection';
		this.subtitle = 'Connect to an external datasource';
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
		this.subtitle = 'Define a query to extract data';
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
		this.subtitle = 'At-a-glance view of visualizations';
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
		this.subtitle = 'Visualize your data';
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