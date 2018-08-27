class Setup {

	constructor() {

	}

	load() {

		for(const stage of Setup.stages.values()) {

			this.container.appendChild((new stage()).container);
		}

		document.querySelector('main').appendChild(this.container);

	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('setup-stages');

		container.innerHTML = `<span><i class="fa fa-times"></i></span>`;

		document.querySelector('main').appendChild(container);

		return container;
	}
}

Setup.stages = new Map();

Setup.stages.set('addConnection', class AddConnection extends Setup {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-server"></i></span>
			<span class="title">Add Connection</span>
		`;

		return container;
	}

	get url() {

		return '/connections-manager';
	}


});

Setup.stages.set('addReport', class AddReport extends Setup {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-database"></i></span>
			<span class="title">Add Report</span>
		`;

		return container;
	}

	get url() {

		return '/reports-manager';
	}

});

Setup.stages.set('addVisualization', class AddVisualization extends Setup {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fas fa-chart-bar"></i></span>
			<span class="title">Add and configure visualization</span>
		`;

		return container;
	}

	get url() {

		return '/reports-manager'
	}

});

Setup.stages.set('addDashboard', class AddDashboard extends Setup {

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('stage');

		container.innerHTML = `
			<span><i class="fa fa-newspaper"></i></span>
			<span class="title">Add Dashboard</span>
		`;

		return container;
	}

	get url() {

		return '/dashboards-manager';
	}

});
