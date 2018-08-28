class UserOnboard {

	constructor() {

		this.page = window.page;
	}

	static setup() {

		const onboard = new UserOnboard();
		onboard.load();

	}

	load() {

		const container = document.createElement('div');
		container.classList.add('setup-stages');

		container.innerHTML = '<span class="heading">Setup Progress</span>'

		for(const stage of UserOnboard.stages.values()) {

			const stageObj = new stage();

			container.appendChild(stageObj.container);
		}

		container.insertAdjacentHTML('beforeend', '<span class="close"><i class="fa fa-times"></i></span>');

		container.querySelector('.close').on('click', async () => {

			container.remove();
			await Storage.set('forceClosed', true);
		});

		document.querySelector('main').appendChild(container);
	}

	// get container() {
	//
	// 	if(this.containerElement) {
	//
	// 		return this.containerElement;
	// 	}
	//
	// 	const container = this.containerElement = document.createElement('div');
	// 	container.classList.add('setup-stages');
	//
	// 	container.innerHTML = '<span class="heading">Setup Progress</span>'
	//
	// 	for(const stage of UserOnboard.stages.values()) {
	//
	// 		const stageObj = new stage();
	//
	// 		container.appendChild(stageObj.container);
	// 	}
	//
	// 	container.insertAdjacentHTML('beforeend', '<span class="close"><i class="fa fa-times"></i></span>');
	//
	// 	container.querySelector('.close').on('click', async () => {
	//
	// 		container.remove();
	// 		await Storage.set('forceClosed', true);
	// 	});
	//
	// 	return container;
	// }

	set selected(value) {

		this.container.classList.add('selected');
	}
}

UserOnboard.stages = new Map();

UserOnboard.stages.set('addConnection', class AddConnection extends UserOnboard {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-server"></i></span>
			<span>Add Connection</span>
		`;

		container.on('click', () => {

			window.location = '/connections-manager';
			this.selected = true;
		});

		return container;
	}

	get url() {

		return '/connections-manager';
	}
});

UserOnboard.stages.set('addReport', class AddReport extends UserOnboard {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-database"></i></span>
			<span>Add Report</span>
		`;

		container.on('click', () => window.location = '/reports');

		return container;
	}

	get url() {

		return '/reports-manager';
	}



});

UserOnboard.stages.set('addDashboard', class AddDashboard extends UserOnboard {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-newspaper"></i></span>
			<span> Add Dashboard</span>
		`;

		container.on('click', () => window.location = '/dashboards-manager');

		return container;
	}

	get url() {

		return '/dashboards-manager';
	}

});

UserOnboard.stages.set('addVisualization', class AddVisualization extends UserOnboard {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fas fa-chart-bar"></i></span>
			<span>Add and configure visualization</span>
		`;

		container.on('click', () => window.location = '/reports');

		return container;
	}

	get url() {

		return '/reports-manager'
	}

});

UserOnboard.setup();
