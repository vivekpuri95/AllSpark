Page.class = class Profile extends Page {

	constructor() {

		super();

		const container = this.container;
		this.id = parseInt(location.pathname.split('/').pop());

		(async() => {

			await DataSource.load();
			await this.load();

			this.profileInfo = new ProfileInfo(this);

			this.sessions = new Sessions(this);

			this.render();

			this.container.querySelector('#activity-info').appendChild(this.sessions.container);
		})();
	}

	async load() {

		const
			parameters = {
				user_id: this.id || user.id,
			},
			options = {
				method: 'POST',
			};

		[this.data] = await API.call('users/list', parameters, options);
	}

	render() {

		if(!this.data.user_id)
			return this.container.innerHTML = '<div class="NA">No User found</div>';

		this.container.querySelector('.edit').classList.toggle('hidden', user.id != this.id);

		this.container.querySelector('h1 span').textContent = [this.data.first_name, this.data.middle_name, this.data.last_name].filter(a => a).join(' ');

		this.container.querySelector('#profile-info').innerHTML = `
			<div class="profile-details">
				<label>
					<span>User ID</span>
					<div>${this.data.user_id}</div>
				</label>
				<label>
					<span>Email</span>
					<div>${this.data.email}</div>
				</label>
				<label>
					<span>Phone</span>
					<div>${this.data.phone || ''}</div>
				</label>
			</div>
		`;

		this.profileInfo.render();

		const
			info = this.container.querySelector('.heading-bar .info'),
			activity = this.container.querySelector('.heading-bar .activity'),
			access = this.container.querySelector('.heading-bar .access');


		info.on('click',() => {

			this.container.querySelector('.heading-bar .selected').classList.remove('selected');
			info.classList.add('selected');

			Sections.show('profile-info');
		});

		access.on('click',() => {

			this.container.querySelector('.heading-bar .selected').classList.remove('selected');
			access.classList.add('selected');

			Sections.show('access');
		});

		activity.on('click', async() => {

			this.container.querySelector('.heading-bar .selected').classList.remove('selected');

			activity.classList.add('selected');

			await this.sessions.load();

			this.sessions.render();

			Sections.show('activity-info');
		});
	}
}

class Sessions {

	constructor(user) {

		Object.assign(this, user.data);

		this.sessionsList = new Map;
	}

	async load() {

		const
			parameters = {
				user_id: this.user_id,
			},
			options = {
				method: 'GET',
			};

		const sessions = await API.call('session-logs/list', parameters, options);

		await this.process(sessions);
	}

	async process(sessions) {

		this.sessionsList.clear();

		for(const session of sessions) {
			this.sessionsList.set(session.id, new Session(session));
		}
	}

	render() {

		const container = this.container;
		const list = container.querySelector('.list');
		list.textContent = null;

		for(const session of this.sessionsList.values())
			list.appendChild(session.container);
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('sessions');

		container.innerHTML = `

			<div class="toolbar hidden">
				<h3>Show session details</h3>
			</div>

			<div class="list"></div>
		`;

		return container;
	}
}

class Session {

	constructor(session) {

		Object.assign(this, session);
	}

	async load() {

		if(this.reports && this.errors)
			return;

		const
			parameters = {
				user_id: this.user_id,
				session_id: this.id,
			},
			options = {
				method: 'Get',
			};

		this.reports = await API.call('reports/logs/log', parameters, options);
		this.errors = await API.call('errors/list', parameters, options);

		this.process(this.reports, this.errors);
	}

	process(reports, errors) {

		for(const report of reports)
			report.type = 'report';

		for(const error of errors)
			error.type = 'error';

		this.reportsCount = reports.length;
		this.errorsCount = errors.length;

		const groupedActivity = this.groupedActivity(reports, errors);

		this.activityGroups = new ActivityGroups(groupedActivity);
	}

	groupedActivity(reports, errors) {

		let activity = reports.concat(errors);

		activity = activity.sort((a, b) => a.created_at - b.created_at);

		const groupedList = [];

		let tempList = [];

		for(const index in activity) {

			if(!parseInt(index)) {
				tempList.push(activity[index]);
			}

			if(tempList[tempList.length - 1].type == activity[parseInt(index)].type) {
				tempList.push(activity[index]);
			}
			else {
				groupedList.push(tempList);
				tempList = [];
				tempList.push(activity[index]);
			}

			if(index == activity.length - 1){
				groupedList.push(tempList);
			}
		}

		return groupedList;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('article');
		container.classList.add('active');

		const detailString = `${this.browser || ''} ${this.OS ? '&middot;&nbsp;'+this.OS : ''} ${this.ip ? '&middot;&nbsp;'+this.ip : ''}`
		container.innerHTML = `
			<header>
				<div class="icon"><i class="far fa-clock"></i></div>
				<div class="details">
					<div class="title">
						<div class="NA">#${this.id}</div>
							${Format.dateTime(this.created_at)}
						<div class="down">
							<i class="fas fa-angle-right"></i>
						</div>
					</div>
					<div class="device-info NA">
						${detailString}
						<span class="activity-details NA"></span>
					</div>
				</div>
			</header>

			<div class="activities hidden"></div>
		`;

		container.querySelector('header').on('click', async() => {

			await this.load();

			container.querySelector('.activity-details').innerHTML = `Reports: ${this.reportsCount} &middot; Errors: ${this.errorsCount}`;

			container.querySelector('.activities').classList.toggle('hidden');
			container.querySelector('.down').classList.toggle('angle-rotate');

			container.querySelector('.activities').appendChild(this.activityGroups.container);
		});

		return container;
	}
}

class ActivityGroups extends Set {

	constructor(activityGroups) {

		super();

		for(const activityGroup of activityGroups) {
			this.add(new ActivityGroup(activityGroup))
		}
	}

	render() {

		const container = this.container;

		for(const activityGroup of this)
			container.appendChild(activityGroup.container);
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('activityGroups');

		this.render();

		return container;
	}
}

class ActivityGroup extends Set {

	constructor(activityGroup) {

		super();

		for(const activity of activityGroup) {
			this.add(new Activity(activity));
		}
	}

	get container() {

		if(this.containerElement)
			return this.containerElement

		;

		const container = this.containerElement = document.createElement('div');


		container.classList.add('activity-group');

		const icon = Array.from(this)[0].type == 'report' ? 'far fa-file' : 'fas fa-exclamation';

		container.innerHTML = `
			<header>
				<div class="icon"><i class="${icon}"></i></div>
				<div class="details">
					<div class="title">
						<span>${this.size}</span><span>${Array.from(this)[0].type}${this.size == 1 ? '' : 's'}</span>

						<div class="down">
							<i class="fas fa-angle-right"></i>
						</div>
					</div>

					<div class="extra-info">
						${Format.dateTime(Array.from(this)[0].created_at)} - ${Format.dateTime(Array.from(this)[this.size - 1].created_at)}
					</div>
				</div>
			</header>

			<div class="activity-list hidden"></div>
		`;

		const activityList = container.querySelector('.activity-list');

		container.querySelector('header').on('click', () => {

			activityList.classList.toggle('hidden');

			container.querySelector('.down').classList.toggle('angle-rotate');

			const tempContainer = document.createDocumentFragment();

			for(const activity of this)
				tempContainer.appendChild(activity.container);

			activityList.appendChild(tempContainer);
		});

		return container;
	}
}

class Activity {

	constructor(data) {

		Object.assign(this, data);

		if(data.result_query) {
			this.activityType = new ActivityReport(data);
		}
		else {
			this.activityType = new ActivityError(data);
		}
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('activity', 'report');
		const
			div = document.createElement('div'),
			details = document.createElement('div');

		details.classList.add('details');

		container.on('click', () => {

			const dialogueBox = new DialogBox();

			dialogueBox.heading = this.type;
			dialogueBox.body.classList.add('activity-popup');

			for(const key of this.activityType.keys) {

				const span = document.createElement('span');
				span.classList.add('key');
				span.textContent = `${key}:`;

				dialogueBox.body.appendChild(span);

				try {
					const value = JSON.parse(this[key]);

					if(typeof value == 'object') {

						const pre = document.createElement('pre');
						pre.classList.add('value', 'json');
						pre.textContent = JSON.stringify(value, 0, 4);

						dialogueBox.body.appendChild(pre);
					}
					else {

						const span = document.createElement('span');
						span.classList.add('value');
						span.textContent = this[key];

						dialogueBox.body.appendChild(span);
					}
				}
				catch(e) {

					const pre = document.createElement('pre');
						pre.classList.add('value', 'sql');

						pre.textContent = new FormatSQL(this[key]).query;

						dialogueBox.body.appendChild(pre);
				}
			}

			dialogueBox.show();
		});

		details.appendChild(this.activityType.name);
		details.appendChild(this.activityType.extraInfo);

		container.appendChild(div);
		container.appendChild(details);

		return container;
	}
}

class ActivityReport {

	constructor(report) {
		Object.assign(this, report)
	}

	get name() {

		if(this.nameElement)
			return this.nameElement;

		const title = this.nameElement = document.createElement('div');
		title.classList.add('title');

		title.textContent = DataSource.list.get(this.query_id).name;

		const span = document.createElement('span');
		span.classList.add('NA');
		span.textContent = '#' + this.id;

		title.appendChild(span);

		return title;
	}

	get keys() {

		return ['user_id','session_id', 'query_id', 'response_time', 'rows', 'result_query'];
	}

	get extraInfo() {

		if(this.extraInfoElement)
			return this.extraInfoElement;

		const extraInfo = this.extraInfoElement = document.createElement('div');
		extraInfo.classList.add('extra-info');

		const executionTime = document.createElement('span');
		executionTime.textContent = `Execution time: ${this.response_time}`;

		const date = document.createElement('span');
		date.textContent = Format.dateTime(this.created_at);

		extraInfo.appendChild(executionTime);
		extraInfo.appendChild(date);

		return extraInfo;
	}
}

class ActivityError {

	constructor(error) {
		Object.assign(this, error)
	}

	get keys() {

		return ['user_id', 'session_id', 'status', 'message', 'description'];
	}

	get name() {

		if(this.titleElement)
			return this.titleElement;

		const title = this.containerElement = document.createElement('div');
		title.classList.add('title');

		title.textContent = 'Error';

		return title;
	}

	get extraInfo() {

		if(this.extraInfoElement)
			return this.extraInfoElement;

		const extraInfo = this.containerElement = document.createElement('div');
		extraInfo.classList.add('extra-info');

		const type = document.createElement('span');
		type.textContent = 'Type:' + this.type;

		const date = document.createElement('span');
		date.textContent = Format.dateTime(this.created_at);

		extraInfo.appendChild(type);
		extraInfo.appendChild(date);

		return extraInfo;
	}
}

class ProfileInfo {

	constructor(page) {

		Object.assign(this, page);
	}

	render() {

		const privileges = this.container.querySelector('.privileges tbody');

		privileges.textContent = null;

		for(const privilege of this.data.privileges || []) {
			privileges.insertAdjacentHTML('beforeend', `
				<tr>
					<td>${MetaData.categories.has(privilege.category_id) ? MetaData.categories.get(privilege.category_id).name : ''}</td>
					<td>${MetaData.privileges.has(privilege.privilege_id) ? MetaData.privileges.get(privilege.privilege_id).name : ''}</td>
				</tr>
			`);
		}

		if(!this.data.privileges || !this.data.privileges.length)
			privileges.innerHTML = `<tr class="NA"><td colspan="2">No Privileges assigned!</td></tr>`;

		const roles = this.container.querySelector('.roles tbody');

		roles.textContent = null;

		for(const role of this.data.roles || []) {
			roles.insertAdjacentHTML('beforeend', `
				<tr>
					<td>${MetaData.categories.has(role.category_id) ? MetaData.categories.get(role.category_id).name : ''}</td>
					<td>${MetaData.roles.has(role.role_id) ? MetaData.roles.get(role.role_id).name : ''}</td>
				</tr>
			`);
		}

		if(!this.data.roles || !this.data.roles.length)
			roles.innerHTML = `<tr class="NA"><td colspan="2">No Roles assigned!</td></tr>`;
	}
}