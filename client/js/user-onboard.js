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

		try {

			UserOnboard.instance.onboard = JSON.parse(onboard);
		}
		catch(e) {

			UserOnboard.instance.onboard = {};
		}
		
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

		[this.nextStage] = this.stages.filter(x => !x.completed);

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

		if(this.stateChanged && this.nextStage) {

			window.location = this.nextStage.url;
		}

		if(this.nextStage) {

			this.nextStage.setActive();
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('setup-stages');

		container.innerHTML = `
			<div class="wrapper"></div>
			<a href="${this.onboard.demo_url}" target="_blank"><i class="fas fa-external-link-alt"></i> View Demo</a>
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

		if(window.location.pathname == '/connections-manager/add/mysql')
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

			<a href="${this.onboard.demo_url}" target="_blank" class="view-demo">
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

			window.location = '/connections-manager/add/mysql';
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
		this.page = onboard.page;
		this.onboard = onboard.onboard;
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
			<div class="info">${this.title}</div>
			<div class="status"></div>
			<div class="hover-info">${this.subtitle}</div>
		`;

		container.on('click', () => {

			window.location = this.url;
		});

		this.autoFillForm();

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

	hidePopUp() {

		if(document.body.querySelector('.save-pop-up')) {

			document.body.querySelector('.save-pop-up').remove();
		}

		for(const element of document.body.querySelectorAll('.blink')) {

			element.classList.remove('blink');
		}
	}
}

UserOnboard.stages.add(class AddConnection extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Connection';
		this.subtitle = 'Connect to an external datasource';

		try {

			if(this.page instanceof Connections) {

				this.currentStage = true;
			}
		}
		catch(e) {

			this.currentStage = false;
		}
	}

	get url() {

		return '/connections-manager/add/mysql';
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

	autoFillForm() {
		
		if(!this.currentStage || this.connection) {

			return;
		}

		const
			submitButton = this.page.container.querySelector('#form .toolbar button[type=submit]'),
			connectionsForm = this.page.container.querySelector('#connections-form');

		const rect = submitButton.getBoundingClientRect();

		this.page.container.querySelector('section#form .toolbar #back').on('click', () => this.hidePopUp());

		if(!document.body.querySelector('.save-pop-up') && this.page.container.querySelector('section#form').classList.contains('show')) {

			document.body.insertAdjacentHTML('beforeend', `
				<div class="save-pop-up">Click save to continue</div>
			`);

			const popUp = document.body.querySelector('.save-pop-up');

			popUp.style.top = `${rect.top - 10}px`;
			popUp.style.left = `${rect.right}px`;

			submitButton.classList.add('blink');
		}

		for(const key in this.onboard.connection) {

			if(connectionsForm.elements[key])
				connectionsForm.elements[key].value = this.onboard.connection[key];
		}

		new SnackBar({
			message: 'We\'ve added a default connection for you',
			subtitle: 'Click save to continue'
		});
	}

});

UserOnboard.stages.add(class AddReport extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Report';
		this.subtitle = 'Define a query to extract data';

		try {

			if(this.page instanceof ReportsManger) {

				this.currentStage = true;
			}
		}
		catch(e) {

			this.currentStage = false;
		}
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

	autoFillForm() {

		if(!this.currentStage) {

			return;
		}

		if(this.page.stages.selected instanceof ReportsManger.stages.get('configure-report')) {

			this.loadConfigureReportForm();
		}

		if(this.page.stages.selected instanceof ReportsManger.stages.get('define-report')) {

			this.loadDefineReportForm();
		}
	}

	loadConfigureReportForm() {

		if(this.report) {
			
			return;
		}

		const
			submitButton = this.page.stages.selected.container.querySelector('.toolbar button[type=submit]'),
			configureForm = this.page.stages.selected.container.querySelector('#configure-report-form');

		document.body.insertAdjacentHTML('beforeend', `
			<div class="save-pop-up">Click save to continue</div>
		`);

		const
			rect = submitButton.getBoundingClientRect(),
			popUp = document.body.querySelector('.save-pop-up');

		popUp.style.top = `${rect.top - 10}px`;
		popUp.style.left = `${rect.right}px`;

		submitButton.classList.add('blink');

		for(const key in this.onboard.report) {

			if(configureForm.elements[key]) {

				configureForm.elements[key].value = this.onboard.report[key];
			}
		}

		for(const stage of this.page.container.querySelectorAll('#stage-switcher .stage')) {

			if(stage.disabled) {

				return;
			}

			stage.on('click', () => this.hidePopUp());
		}

		submitButton.on('click', () => this.hidePopUp())

		new SnackBar({
			message: 'We\'ve added a default report for you',
			subtitle: 'Click save to continue'
		});
	}

	loadDefineReportForm() {

		const
			submitButton = this.page.stages.selected.container.querySelector('.toolbar button[type=submit]');
		
		if(this.report && this.report.query) {

			this.hidePopUp();
			return;
		}

		if(!document.body.querySelector('.save-pop-up')) {

			document.body.insertAdjacentHTML('beforeend', `
				<div class="save-pop-up">Click save to continue</div>
			`);
		}

		submitButton.classList.add('blink');

		const
			rect = submitButton.getBoundingClientRect(),
			popUp = document.body.querySelector('.save-pop-up');

		popUp.style.top = `${rect.top - 10}px`;
		popUp.style.left = `${rect.right}px`;

		this.page.stages.selected.report.connection.editor.value = this.onboard.report.query;

		submitButton.on('click', () => this.hidePopUp());

		new SnackBar({
			message: 'Default query has been added for you',
			subtitle: 'Click save to continue'
		});
	}

});

UserOnboard.stages.add(class AddDashboard extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Dashboard';
		this.subtitle = 'At-a-glance view of visualizations';

		try {

			if(this.page instanceof DashboardManager) {

				this.currentStage = true;
			}
		}
		catch(e) {

			this.currentStage = false;
		}
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

	autoFillForm() {

		if(!this.currentStage || this.dashboard) {

			return;
		}

		const submitButton = this.page.container.querySelector('#form .toolbar button[type=submit]');

		for(const element of DashboardsDashboard.form.elements) {

			if(this.onboard.dashboard[element.name]) {

				element.value = this.onboard.dashboard[element.name];
			}
		}

		const rect = submitButton.getBoundingClientRect();

		if(!document.body.querySelector('.save-pop-up')) {

			document.body.insertAdjacentHTML('beforeend', `
				<div class="save-pop-up">Click save to continue</div>
			`);
			submitButton.classList.add('blink');
		}

		const popUp = document.body.querySelector('.save-pop-up');

		popUp.style.top = `${rect.top - 10}px`;
		popUp.style.left = `${rect.right}px`;

		DashboardsDashboard.container.querySelector('#back').on('click', () => this.hidePopUp());
		submitButton.on('click', () => this.hidePopUp());

		new SnackBar({
			message: 'We\'ve added a default dashboard for you',
			subtitle: 'Click save to continue'
		});
	}

});

UserOnboard.stages.add(class AddVisualization extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add Visualization';
		this.subtitle = 'Visualize your data';

		try {

			if((this.page.stages.selected instanceof ReportsManger.stages.get('pick-visualization')) || (this.page.stages.selected instanceof ReportsManger.stages.get('configure-visualization'))) {

				this.currentStage = true;
			}
		}
		catch(e) {

			this.currentStage = false;
		}
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

	autoFillForm() {

		if(!this.currentStage) {

			return;
		}

		if(this.page.stages.selected instanceof ReportsManger.stages.get('pick-visualization')) {

			const visualizationPickerForm = this.page.stages.selected.container.querySelector('#add-visualization-form');

			for(const element of visualizationPickerForm.querySelectorAll('label')) {

				if(element.name != 'Line') {

					element.removeEventListener('click', element.clickListener);
					element.classList.add('grey');
				}
			}

			this.setPickVisualizationStage();

			this.page.stages.selected.container.querySelector('#add-visualization').on('click', () => this.setPickVisualizationStage());
			this.page.stages.selected.container.querySelector('#visualization-picker-back').on('click', () => this.setPickVisualizationStage());
		}

		if(this.page.stages.selected instanceof ReportsManger.stages.get('configure-visualization')) {

			this.loadConfigureVisualizationForm();
		}
	}

	setPickVisualizationStage() {

		if(!document.body.querySelector('.save-pop-up')) {

			document.body.insertAdjacentHTML('beforeend', `
				<div class="save-pop-up">Click to pick visualization</div>
			`);
		}

		if(this.page.stages.selected.container.querySelector('#visualization-list').classList.contains('hidden')) {

			const
				label = this.page.stages.selected.container.querySelector('#add-visualization-form label:not(.grey)'),
				rect = label.getBoundingClientRect();

			const popUp = document.body.querySelector('.save-pop-up');
			popUp.textContent = 'Select line visualization';

			label.appendChild(popUp);

			this.page.stages.selected.container.querySelector('#add-visualization-form label:not(.grey)').style.position = 'relative';
			popUp.style.top = `${rect.top - 330}px`;
			popUp.style.left = `${rect.right - 30}px`;

		}
		else {

			const addButton = this.page.stages.selected.container.querySelector('#add-visualization');

			for(const stage of this.page.container.querySelectorAll('#stage-switcher .stage')) {

				if(stage.disabled) {

					return;
				}

				stage.on('click', () => this.hidePopUp());
			}

			addButton.classList.add('blink');

			const rect = addButton.getBoundingClientRect();

			const popUp = document.body.querySelector('.save-pop-up');
			popUp.textContent = 'Click to pick visualization';

			document.body.appendChild(popUp);

			popUp.style.top = `${rect.top - 10}px`;
			popUp.style.left = `${rect.right}px`;
		}

	}

	async loadConfigureVisualizationForm() {

		const submitButton = this.page.stages.selected.container.querySelector('.toolbar button[type=submit]');

		if(!document.body.querySelector('.save-pop-up')) {

			document.body.insertAdjacentHTML('beforeend', `
				<div class="save-pop-up">Click save to finish</div>
			`);
		}

		for(const stage of this.page.container.querySelectorAll('#stage-switcher .stage')) {

			if(stage.disabled) {

				return;
			}

			stage.on('click', () => this.hidePopUp());
		}

		submitButton.on('click', () => this.hidePopUp());
		this.page.stages.selected.container.querySelector('#configure-visualization-back').on('click', () => this.hidePopUp());

		const
			rect = submitButton.getBoundingClientRect(),
			popUp = document.body.querySelector('.save-pop-up');

		popUp.textContent = 'Click save to finish';
		submitButton.classList.add('blink');

		popUp.style.top = `${rect.top - 10}px`;
		popUp.style.left = `${rect.right}px`;
		document.body.appendChild(popUp);
	}
});

UserOnboard.stages.add(class AddVisualizationDashboard extends UserOnboardStage {

	constructor(onboard) {

		super(onboard);

		this.title = 'Add visualization to dashboard';
		this.subtitle= '';

		try {

			if((this.page.stages.selected instanceof ReportsManger.stages.get('configure-visualization'))) {

				this.currentStage = true;
			}
		}
		catch(e) {

			this.currentStage = false;
		}
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

		this.visualization = this.report.visualizations[0];

		this.completed = true;
		this.progress = this.progress + 25;
	}

	autoFillForm() {

		if(!this.currentStage) {

			return;
		}
	}
})
UserOnboard.setup();