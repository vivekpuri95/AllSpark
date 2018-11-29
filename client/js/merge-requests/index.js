import * as AllSpark from '/js/main-modules.js';
import * as Reports from '/js/reports-modules.js';

AllSpark.Page.class = class MergeRequestsPage extends AllSpark.Page {

	constructor() {

		super();

		this.mergeRequests = new MergeRequests(this);

		this.load();
	}

	async load() {

		await this.mergeRequests.load();

		this.container.appendChild(this.mergeRequests.container);

		AllSpark.Sections.show('merge-request-list');
	}
}

class MergeRequests extends Map {

	constructor(page) {

		super();

		this.page = page;

		this.sourceMultiSelect = new AllSpark.MultiSelect({multiple: false, expand: true});
		this.destinationMultiSelect = new AllSpark.MultiSelect({multiple: false, expand: true});

		const filters = [
			{
				key: 'ID',
				rowValue: row => [row.id],
			},
			{
				key: 'Source ID',
				rowValue: row => row.source_id ? [row.source_id] : [],
			},
			{
				key: 'Destination ID',
				rowValue: row => row.destination_id ? [row.destination_id] : [],
			},
			{
				key: 'Status',
				rowValue: row => row.status ? [row.status] : [],
			},
			{
				key: 'Opened At',
				rowValue: row => row.created_at ? [row.created_at] : [],
			},
			{
				key: 'Opened By',
				rowValue: row => row.user_name ? [row.user_name] : [],
			},
			{
				key: 'Opened By User ID',
				rowValue: row => row.added_by ? [row.added_by] : [],
			},
		];

		this.searchBar = new AllSpark.SearchColumnFilters({ filters });
	}

	async load() {

		const [response] = await this.fetch();

		this.process(response);

		this.render();
	}

	async fetch() {

		const parameters = {
			status: this.container.querySelector('.status-filter').value,
		};

		return await Promise.all([
			AllSpark.API.call('merge-requests/requests/list', parameters),
			Reports.DataSource.load(),
		]);
	}

	process(response = {}) {

		this.clear();

		for(const request of response)
			this.set(request.id, new MergeRequest(request, this));

		this.searchBar.data = Array.from(this.values());

		// Load datalists for source/destination multiselects
		{
			const datalist = [];

			for(const report of Reports.DataSource.list.values()) {

				datalist.push({
					name: `<span class="NA">#${report.query_id}</span> ${report.name}`,
					value: report.query_id,
				});
			}

			this.sourceMultiSelect.datalist = JSON.parse(JSON.stringify(datalist));
			this.sourceMultiSelect.render();

			this.destinationMultiSelect.datalist = JSON.parse(JSON.stringify(datalist));
			this.destinationMultiSelect.render();
		}
	}

	render() {

		const
			container = this.container.querySelector('#merge-request-list .list'),
			data = this.searchBar.filterData;

		container.textContent = null;

		for(const mergeRequest of data)
			container.appendChild(mergeRequest.container);

		if(!data.length)
			container.innerHTML = '<div class="NA">No Merge Requests Found</div>';

		this.container.querySelector('.information-bar').innerHTML = `
			<span>Total: <strong>${AllSpark.Format.number(this.size)}</strong></span>
			<span>Filtered: <strong>${AllSpark.Format.number(data.length)}</strong></span>
		`;
	}

	get container() {

		if(this.containerEelement)
			return this.containerEelement;

		const container = this.containerEelement = document.createElement('div');

		container.classList.add('merge-requests');

		container.innerHTML = `

			<section class="section" id="merge-request-list">

				<h1><i class="fas fa-code-branch"></i> Merge Requests</h1>

				<div class="toolbar">
					<button class="new-merge-request-button"><i class="fa fa-plus"></i> New Merge Requests</button>
					<div></div>
					<select class="status-filter">
						<option value="open">Open</option>
						<option value="merged">Merged</option>
						<option value="closed">Closed</option>
						<option value="">All</option>
					</select>
				</div>

				<div class="NA information-bar"></div>

				<div class="list"></div>
			</section>

			<section class="section" id="new-merge-request">

				<h1><i class="fas fa-code-branch"></i> Create New Merge Request</h1>

				<div class="toolbar">

					<button class="merge-request-back">
						<i class="fas fa-arrow-left"></i>
						Back
					</button>

					<button type="submit" form="new-merge-request-form">
						<i class="far fa-save"></i>
						Create Merge Request
					</button>
				</div>

				<form class="form block" id="new-merge-request-form">

					<label>
						<span>Type</span>
						<select name="source">
							<option value="report">Report</option>
						</select>
					</label>

					<div class="report-picker">

						<label class="source-report">
							<span>Source</span>
						</label>

						<div class="report-picker-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>

						<label class="destination-report">
							<span>Destination</span>
						</label>
					</div>
				</form>
			<section>
		`;

		container.querySelector('.new-merge-request-button').on('click', () => this.add());
		container.querySelector('.merge-request-back').on('click', () => this.back());

		container.querySelector('.source-report').appendChild(this.sourceMultiSelect.container);
		container.querySelector('.destination-report').appendChild(this.destinationMultiSelect.container);

		container.querySelector('.status-filter').on('change', () => this.load());

		container.querySelector('.status-filter').insertAdjacentElement('afterend', this.searchBar.globalSearch.container);
		container.querySelector('.toolbar').insertAdjacentElement('afterend', this.searchBar.container);

		this.searchBar.on('change', () => {
			this.render();
		});

		this.container.querySelector('form').on('submit', e => {
			e.preventDefault();
			this.insert();
		});

		return container;
	}

	back() {

		AllSpark.Sections.show('merge-request-list');
	}

	add() {

		this.container.querySelector('form').reset();

		this.sourceMultiSelect.value = [];
		this.destinationMultiSelect.value = [];

		AllSpark.Sections.show('new-merge-request');
	}

	async insert() {

		const
			[source] = this.sourceMultiSelect.value,
			[destination] = this.destinationMultiSelect.value;

		if(!source)
			return new AllSpark.SnackBar({message: 'Source Report is Required!', type: 'warning'});

		if(!destination)
			return new AllSpark.SnackBar({message: 'Destination Report is Required!', type: 'warning'});

		if(source == destination)
			return new AllSpark.SnackBar({message: 'Source cannot be the same as the Destination!', type: 'warning'});

		const
			parameters = {
				source_id: source,
				destination_id: destination,
			},
			options = {
				form: new FormData(this.container.querySelector('form')),
				method: 'POST',
			};

		try {

			await AllSpark.API.call('merge-requests/requests/insert', parameters, options);

			await this.load();

			new AllSpark.SnackBar({
				message: 'Merge Request Created!',
				icon: 'fas fa-plus',
			});

			AllSpark.Sections.show('merge-request-list');

		} catch(e) {

			new AllSpark.SnackBar({
				message: 'Request Failed!',
				subtitle: e.message || e,
				type: 'error',
			});
		}
	}
}

class MergeRequest {

	constructor(request, mergeRequests) {

		Object.assign(this, request);

		this.mergeRequests = mergeRequests;
		this.page = mergeRequests.page;

		this.sourceMultiSelect = new AllSpark.MultiSelect({multiple: false, expand: true});
		this.destinationMultiSelect = new AllSpark.MultiSelect({multiple: false, expand: true});
	}

	get container() {

		if(this.containerEelement)
			return this.containerEelement;

		const
			container = this.containerEelement = document.createElement('div'),
			source = Reports.DataSource.list.get(this.source_id),
			destination = Reports.DataSource.list.get(this.destination_id);

		container.classList.add('merge-request', 'block', this.status);

		container.innerHTML = `
			<h2>
				<span>
					<span class="NA">#${this.source_id}</span>
					${source.name}
				</span>
				<span class="NA"><i class="fas fa-long-arrow-alt-right"></i></span>
				<span>
					<span class="NA">#${this.destination_id}</span>
					${destination.name}
				</span>
			</h2>

			<div class="NA">
				<span>#${this.id}</span>
				&middot;
				<span title="${AllSpark.Format.dateTime(this.created_at)}" class="created-at">${AllSpark.Format.ago(this.created_at)}</span>
				&middot;
				<a href="/user/profile/${this.added_by}" target="_blank">${this.user_name}</a>
				&middot;
				<a class="edit">Edit</a>
				&middot;
				<a>${this.status[0].toUpperCase() + this.status.slice(1)}</a>
			</div>
		`;

		const createdAt = container.querySelector('.created-at');

		setInterval(() => createdAt.textContent = AllSpark.Format.ago(this.created_at), 1000);

		container.querySelector('.edit').on('click', () => this.edit());

		return container;
	}

	back() {

		AllSpark.Sections.show('merge-request-list');
	}

	edit() {

		const form = this.form.querySelector('form');

		form.reset();

		form.source.value = this.source;
		this.sourceMultiSelect.value = this.source_id;
		this.destinationMultiSelect.value = this.destination_id;

		this.mergeRequests.container.appendChild(this.form);

		AllSpark.Sections.show(this.form.id);
	}

	get form() {

		if(this.formElement)
			return this.formElement;

		// Load datalists for source/destination multiselects
		{
			const datalist = [];

			for(const report of Reports.DataSource.list.values()) {

				datalist.push({
					name: `<span class="NA">#${report.query_id}</span> ${report.name}`,
					value: report.query_id,
				});
			}

			this.sourceMultiSelect.datalist = JSON.parse(JSON.stringify(datalist));
			this.sourceMultiSelect.render();

			this.destinationMultiSelect.datalist = JSON.parse(JSON.stringify(datalist));
			this.destinationMultiSelect.render();
		}

		const container = this.formElement = document.createElement('section');

		container.classList.add('section');
		container.id = 'merge-request-form-' + Math.floor(Math.random() * 1000);

		container.innerHTML = `

			<h1><i class="fas fa-code-branch"></i> Edit Merge Request #${this.id}</h1>

			<div class="toolbar">

				<button class="merge-request-back">
					<i class="fas fa-arrow-left"></i>
					Back
				</button>

				<button type="submit" form="edit-${container.id}">
					<i class="far fa-save"></i>
					Save
				</button>
			</div>

			<form class="form block" id="edit-${container.id}">

				<label>
					<span>Type</span>
					<select name="source">
						<option value="report">Report</option>
					</select>
				</label>

				<div class="report-picker">

					<label class="source-report">
						<span>Source</span>
					</label>

					<div class="report-picker-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>

					<label class="destination-report">
						<span>Destination</span>
					</label>
				</div>
			</form>
		`;

		container.querySelector('.merge-request-back').on('click', () => this.back());

		container.querySelector('.source-report').appendChild(this.sourceMultiSelect.container);
		container.querySelector('.destination-report').appendChild(this.destinationMultiSelect.container);

		container.querySelector('form').on('submit', e => {
			e.preventDefault();
			this.update();
		});

		return container;
	}

	async update() {

		const
			[source] = this.sourceMultiSelect.value,
			[destination] = this.destinationMultiSelect.value;

		if(!source)
			return new AllSpark.SnackBar({message: 'Source Report is Required!', type: 'warning'});

		if(!destination)
			return new AllSpark.SnackBar({message: 'Destination Report is Required!', type: 'warning'});

		if(source == destination)
			return new AllSpark.SnackBar({message: 'Source cannot be the same as the Destination!', type: 'warning'});

		const
			parameters = {
				id: this.id,
				source_id: this.sourceMultiSelect.value[0],
				destination_id: this.destinationMultiSelect.value[0],
			},
			options = {
				form: new FormData(this.container.querySelector('form')),
				method: 'POST',
			};

		try {

			await AllSpark.API.call('merge-requests/requests/update', parameters, options);

			await this.mergeRequests.load();

			new AllSpark.SnackBar({
				message: 'Merge Request Saved',
				icon: 'far fa-save',
			});

			AllSpark.Sections.show('merge-request-list');

		} catch(e) {

			new AllSpark.SnackBar({
				message: 'Request Failed!',
				subtitle: e.message || e,
				type: 'error',
			});
		}
	}
}