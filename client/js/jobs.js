Page.class = class Tasks extends Page {

	constructor() {

		super();

		this.list = new Map;

		window.on('popstate', e => this.loadState(e.state));

		(async () => {

			await this.load();

			this.loadState();
		})();

		// setTimeout(() => {
		// 	location.reload();
		// }, 60 * 1000);
	}

	async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if (what == 'add')
			return Task.add(this);

		if (what == 'define') {

			const id = parseInt(location.pathname.split('/')[location.pathname.split('/').length - 2]);

			if (this.list.has(id))
				return this.list.get(id).define();
		}

		if (this.list.has(parseInt(what)))
			return this.list.get(parseInt(what)).edit();

		await Sections.show('list');
	}

	async back() {

	}

	async load() {

		await this.fetch();
		this.process();
		this.render();
	}

	async fetch() {

		[this.jobs, this.tasks] = await Promise.all([
				API.call('scheduler/jobs/list'),
				API.call('scheduler/tasks/list')
			]
		);
	}

	async save() {

		const
			parameters = {
				type: this.type,
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		try {

			await API.call('roles/test', parameters, options);

			await this.load();

			new SnackBar({
				message: 'Added new Job',
				icon: 'far fa-save',
			});
		}

		catch (e) {

			new SnackBar({
				message: 'could not add this job',
				subtitle: e.message,
				type: 'error',
			});
		}
	}

	process() {

		if (!Array.isArray(this.tasks)) {

			throw Page.exception('Invalid task list response!');
		}

		if (!Array.isArray(this.jobs)) {

			throw Page.exception('Invalid job list response!');
		}

		const taskJobMapping = {};

		for (const task of this.tasks) {

			if (!taskJobMapping.hasOwnProperty(task.job_id)) {

				taskJobMapping[task.job_id] = new Task(task);
				continue;
			}

			taskJobMapping[task.job_id].push(new Task(task));
		}

		this.list.clear();

		for (const job of this.jobs) {

			this.list.set(job.job_id, new Job(job));
		}
	}

	get currentState() {

		const currentLocation = location.pathname.split('/');

		if (currentLocation.includes('jobs')) {

			if (currentLocation.slice(-1)[0] && currentLocation.slice(-1)[0] == parseInt(currentLocation.slice(-1)[0])) {

				return {
					"type": "jobs",
					"id": currentLocation.slice(-1)[0]
				}
			}

			return {
				"type": "jobs"
			}
		}

	}

	render() {

		this.form = this.container.querySelector('#add-job-form');

		if (this.currentState.type == 'jobs' && this.currentState.hasOwnProperty('id')) {

			console.log('job render for this.list.get(this.currentState.id)');
		}

		else if (this.currentState.type == 'jobs' && !this.currentState.hasOwnProperty('id')) {

			const tBodyContainer = this.listContainer.querySelector('table.block tbody');

			tBodyContainer.textContent = null;

			for (const job of this.list.values()) {

				tBodyContainer.appendChild(job.row);
			}
		}

		this.container.querySelector('#add-job').on('click', () => {

			this.form.reset();

			this.container.querySelector('#list').classList.add('hidden');
			this.container.querySelector('#add-new-job').classList.remove('hidden');
		});

		this.container.querySelector('#add-job-back').on('click', () => {

			this.container.querySelector('#add-new-job').classList.add('hidden');
			this.container.querySelector('#list').classList.remove('hidden');
		});

		this.form.removeEventListener('submit', Tasks.addListener);

		this.form.on('submit', Tasks.addListener = async (e) => {

			e.preventDefault();
			await this.save();
		});

	}

	get listContainer() {

		return this.container.querySelector('table.block');
	}
};

class Job {

	constructor(job) {

		Object.assign(this, job);
	}

	async execute() {

		try {

			await API.call(`scheduler/jobs/execute?job_id=${this.job_id}`);

			new SnackBar({
				message: 'Executed successfully, check job history for more info.',
				subtitle: `${this.name} #${this.job_id}`,
				icon: 'far fa-save',
			});
		}

		catch (e) {

			new SnackBar({
				message: 'Job failed, check job history for more info.',
				subtitle: e.message,
				type: 'error',
			});
		}
	}

	get row() {

		if (this.tr) {

			return this.tr;
		}

		const tr = document.createElement('tr');

		tr.innerHTML = `
			<td>${this.job_id}</td>
			<td>${this.name}</td>
			<td class="type">${this.type}</td>
			<td>${this.next_interval}</td>
			<td>${this.is_enabled ? 'Yes' : 'No'}</td>
			<td class="action green"><i class="fa fa-edit"></i></td>
			<td class="action red"><i class="far fa-trash-alt"></i></td>
		`;

		tr.querySelector('.green').on('click', () => this.update());

		tr.querySelector('.red').on('click', async (e) => {
			e.stopPropagation();
			await this.update(true)
		});

		this.tr = tr;

		return this.tr;
	}

	async update(deletion = false) {

		if (deletion) {

			//delete
			console.log('deletion');
		}

		//update from form.
		console.log('updation from form');

		await Sections.show('edit-job');

		this.container.querySelector('edit-job-form input[name="name"]').textContent = this.name;
		this.container.querySelector('edit-job-form input[name="cron_interval_string"]').textContent = this.cron_interval_string;
		this.container.querySelector('edit-job-form input[name="next_interval"]').textContent = this.next_interval;
		this.container.querySelector('edit-job-form input[name="type"]').value = this.type;

	}

	async insert() {


	}

	async history() {


	}
}

class Task {

	constructor(task) {

		Object.assign(this, task);
	}

	async add() {


	}

	async update() {


	}

	async history() {


	}
}

class Contact {


}
