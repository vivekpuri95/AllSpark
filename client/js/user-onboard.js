class UserOnboard {

	constructor() {

		this.page = window.page;
	}

	static async setup() {

		if(document.querySelector('.setup-stages'))
			document.querySelector('.setup-stages').remove();

		const onboard = new UserOnboard();

		await onboard.load();
	}

	async load() {

		const container = document.createElement('div');

		container.classList.add('setup-stages');

		container.innerHTML = `<a href="${demo_url}" target="_blank">View Demo</a>`;

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage();

			container.appendChild(stageObj.container);
			await stageObj.load();
		}

		container.insertAdjacentHTML('beforeend', '<span class="close">Skip</span>');

		container.querySelector('.close').on('click', async () => {

			container.remove();
			await Storage.delete('newUser');
		});

		if(container.querySelectorAll('.completed').length == 4) {

			await Storage.delete('newUser');
		}

		document.querySelector('main').appendChild(container);
	}
}

UserOnboard.stages = new Set();

UserOnboard.stages.add(class AddConnection {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

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

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">2</span>
			<span>Add Report</span>
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

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">3</span>
			<span> Add Dashboard</span>
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

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span class="order">4</span>
			<span>Add Visualization</span>
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
