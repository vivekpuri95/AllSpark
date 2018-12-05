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

		this.sourceMultiSelect = new AllSpark.MultiSelect({multiple: false});
		this.destinationMultiSelect = new AllSpark.MultiSelect({multiple: false});

		const filters = [
			{
				key: 'ID',
				rowValue: row => [row.id],
			},
			{
				key: 'Title',
				rowValue: row => [row.title],
			},
			{
				key: 'Source Type',
				rowValue: row => [row.source],
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
			this.fetchApprovers(),
		]);
	}

	async fetchApprovers() {

		if(this.approvers)
			return;

		this.approvers = await AllSpark.API.call('merge-requests/approvers/list');
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
			container.appendChild(mergeRequest.row);

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
						<option value="">Any Status</option>
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
						<span>Title <span class="red">*</span></span>
						<input type="text" name="title" maxlength="250" required>
					</label>

					<label>
						<span>Type <span class="red">*</span></span>
						<select name="source" required>
							<option value="report">Report</option>
							<option value="visualization">Visualization</option>
						</select>
					</label>

					<div class="report-picker">

						<label class="source-report">
							<span>Source <span class="red">*</span></span>
						</label>

						<div class="report-picker-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>

						<label class="destination-report">
							<span>Destination <span class="red">*</span></span>
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

		container.querySelector('.toolbar').appendChild(this.searchBar.globalSearch.container);
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

		this.approvers = new MergeRequestApprovers(this);
		this.sourceMultiSelect = new AllSpark.MultiSelect({multiple: false});
		this.destinationMultiSelect = new AllSpark.MultiSelect({multiple: false});

		MergeRequest.minimumApprovals = 1;
	}

	get row() {

		if(this.rowEelement)
			return this.rowEelement;

		const
			container = this.rowEelement = document.createElement('div'),
			source = Reports.DataSource.list.get(this.source_id),
			destination = Reports.DataSource.list.get(this.destination_id);

		container.classList.add('merge-request-row', 'block', this.status);

		container.innerHTML = `
			<h2>
				${this.title}
				<span class="NA">#${this.id}</span>
			</h2>

			<div class="subtitle">

				<span>
					<a href="/report/${this.destination_id}" target="_blank">
						${source.name}
					</a>
					<span class="NA">#${this.source_id}</span>
				</span>

				<span class="NA"><i class="fas fa-long-arrow-alt-right"></i></span>

				<span>
					<a href="/report/${this.destination_id}" target="_blank">
						${destination.name}
					</a>
					<span class="NA">#${this.destination_id}</span>
				</span>
			</div>

			<div class="NA">
				<span title="${AllSpark.Format.dateTime(this.created_at)}" class="created-at">${AllSpark.Format.ago(this.created_at)}</span>
				&middot;
				<a href="/user/profile/${this.added_by}" target="_blank">${this.user_name}</a>
				&middot;
				<a class="edit">Edit</a>
				&middot;
				<span>${this.source[0].toUpperCase() + this.source.slice(1)}</span>
			</div>

			<div class="status">${this.status[0].toUpperCase() + this.status.slice(1)}</div>
		`;

		const createdAt = container.querySelector('.created-at');

		setInterval(() => createdAt.textContent = AllSpark.Format.ago(this.created_at), 1000);

		container.querySelector('.edit').on('click', () => this.edit());

		container.querySelector('h2').on('click', () => this.load());

		return container;
	}

	back() {

		AllSpark.Sections.show('merge-request-list');
	}

	edit() {

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
			this.sourceMultiSelect.value = this.source_id;

			this.destinationMultiSelect.datalist = JSON.parse(JSON.stringify(datalist));
			this.destinationMultiSelect.render();
			this.destinationMultiSelect.value = this.destination_id;
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
					<span>Title <span class="red">*</span></span>
					<input type="text" name="title" maxlength="250" value="${this.title}" required>
				</label>

				<label>
					<span>Type <span class="red">*</span></span>
					<select name="source" required>
						<option value="report">Report</option>
						<option value="visualization">Visualization</option>
					</select>
				</label>

				<div class="report-picker">

					<label class="source-report">
						<span>Source <span class="red">*</span></span>
					</label>

					<div class="report-picker-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>

					<label class="destination-report">
						<span>Destination <span class="red">*</span></span>
					</label>
				</div>
			</form>
		`;

		const form = container.querySelector('form');

		container.querySelector('.merge-request-back').on('click', () => this.back());

		container.querySelector('.source-report').appendChild(this.sourceMultiSelect.container);
		container.querySelector('.destination-report').appendChild(this.destinationMultiSelect.container);

		form.source.value = this.source;

		for(const key in this) {

			if(!(key in form.elements))
				continue;

			form.elements[key].value = this[key];
			form.elements[key].on('change', () => this.setDirtyForm());
			form.elements[key].on('keyup', () => this.setDirtyForm());
		}

		form.on('submit', e => {
			e.preventDefault();
			this.update();
		});

		return container;
	}

	setDirtyForm() {
		this.form.querySelector('.toolbar button[type=submit]').classList.add('dirty');
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
				form: new FormData(this.form.querySelector('form')),
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

	async load() {

		this.mergeRequests.container.appendChild(this.container);

		AllSpark.Sections.show(this.container.id);
	}

	get container() {

		if(this.containerEelement)
			return this.containerEelement;

		const
			container = this.containerEelement = document.createElement('section'),
			source = Reports.DataSource.list.get(this.source_id),
			destination = Reports.DataSource.list.get(this.destination_id);

		container.classList.add('merge-request', 'section');

		container.id = `merge-request-${this.id}`;

		container.innerHTML = `

			<h1>
				<i class="fas fa-code-branch"></i>
				${this.title}
				<span class="NA">#${this.id}</span>
			</h1>

			<div class="toolbar">

				<button class="merge-request-back">
					<i class="fas fa-arrow-left"></i>
					Back
				</button>
			</div>

			<div class="information">

				<h3>
					<span>
						<span class="NA">#${this.source_id}</span>
						<a href="/report/${this.destination_id}" target="_blank">
							${source.name}
						</a>
					</span>

					<span class="NA"><i class="fas fa-long-arrow-alt-right"></i></span>

					<span>
						<span class="NA">#${this.destination_id}</span>
						<a href="/report/${this.destination_id}" target="_blank">
							${destination.name}
						</a>
					</span>
				</h3>

				<div class="grid block">

					<div>
						<div class="key">Type</div>
						<div class="value">${this.source}</div>
					</div>

					<div>
						<div class="key">Created</div>
						<div class="value">${AllSpark.Format.ago(this.created_at)}</div>
					</div>

					<div>
						<div class="key">Created By</div>
						<a class="value" href="/user/profile/${this.added_by}" target="_blank">${this.user_name}</a>
					</div>
				</div>
			</div>

			<div class="summary">

				<div class="approvals"></div>

				<button class="accept-merge-request"></button>
			</div>
		`;

		// If the current user is an approver then show them the approve button
		{
			const summary = container.querySelector('.summary');

			for(const approver of this.approvers) {

				if(approver.user_id != this.mergeRequests.page.user.user_id)
					continue;

				const button = document.createElement('button');

				button.classList.add('approve-merge-request');

				button.innerHTML = '<i class="fas fa-thumbs-up"></i> Approve';

				button.on('click', () => this.approve());

				summary.appendChild(button);

				break;
			}
		}

		container.appendChild(this.approvers.container);

		container.querySelector('.merge-request-back').on('click', () => this.back());
		container.querySelector('.accept-merge-request').on('click', () => this.back());

		this.render();

		return container;
	}

	render() {

		const
			approvalsContainer = this.container.querySelector('.summary .approvals'),
			mergeButton = this.container.querySelector('.accept-merge-request'),
			approveButton = this.container.querySelector('.approve-merge-request'),
			approvals = [];

		approvalsContainer.innerHTML = null;

		for(const approver of this.approvers) {

			if(approver.approval && approver.approval.status == 'approved')
				approvals.push(approver);
		}

		mergeButton.disabled = approvals.length < MergeRequest.minimumApprovals;

		mergeButton.innerHTML = (approvals.length < MergeRequest.minimumApprovals ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>') + 'Accept Merge Request';

		approveButton.classList.toggle('approved', this.approvers.current.approval && this.approvers.current.approval.status == 'approved' ? true : false);

		if(!approvals.length)
			approvalsContainer.innerHTML = '<span class="NA">No one has approved this merge request yet.</span>';
	}

	async approve() {

		try {

			const
				parameters = {
					merge_request_id: this.id,
					status: this.approvers.current.approval && this.approvers.current.approval.status == 'approved' ? 'rejected' : 'approved',
				},
				options = {
					method: 'POST',
				};

			[this.approvers.current.approval] = await AllSpark.API.call('merge-requests/approvals/approve', parameters, options);

			this.render();
			this.approvers.render();

			new AllSpark.SnackBar({
				message: 'Merge Request ' + parameters.status[0].toUpperCase() + parameters.status.slice(1),
			});
		}

		catch(e) {

			new AllSpark.SnackBar({
				message: 'Request Failed',
				subtitle: e.message || e,
				type: 'error',
			});
		}
	}
}

class MergeRequestApprovers extends Set {

	constructor(mergeRequest) {

		super();

		this.mergeRequest = mergeRequest;

		for(const approver of this.mergeRequest.mergeRequests.approvers) {

			const
				[approval] = this.mergeRequest.approvals.filter(a => a.user_id == approver.user_id && a.source == approver.source),
				mergeRequestApprover = new MergeRequestApprover(approver, approval, this);

			if(mergeRequestApprover.user_id == this.mergeRequest.mergeRequests.page.user.user_id)
				this.current = mergeRequestApprover;

			this.add(mergeRequestApprover);
		}
	}

	get container() {

		if(this.containerEelement)
			return this.containerEelement;

		const container = this.containerEelement = document.createElement('div');

		container.classList.add('approvers');

		container.innerHTML = `
			<h3>Approvers</h3>
			<div class="list block"></div>
		`;

		const list = container.querySelector('.list');

		for(const approver of this)
			list.appendChild(approver.container);

		return container;
	}

	render() {

		for(const approver of this)
			approver.render();
	}
}

class MergeRequestApprover {

	constructor(approver, approval, approvers) {

		Object.assign(this, approver);

		this.approval = approval;
		this.approvers = approvers;
	}

	get container() {

		if(this.containerEelement)
			return this.containerEelement;

		const container = this.containerEelement = document.createElement('div');

		container.classList.add('approver');

		this.render();

		return container;
	}

	render() {

		this.container.innerHTML = `
			<i class="far ${this.approval && this.approval.status == 'approved' ? 'fa-check-square' : 'fa-square'}"></i> ${this.name}
			${this.approval ? '<span class="NA">' + (this.approval.updated_at ? AllSpark.Format.ago(this.approval.updated_at) : '') + '</span>' : ''}
		`;

		this.container.classList.toggle('approved', this.approval && this.approval.status == 'approved' ? true : false);
	}
}