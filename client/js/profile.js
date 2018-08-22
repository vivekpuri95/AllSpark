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

			this.container.querySelector('.activity-info').appendChild(this.sessions.container);
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
				<span>User ID</span>
				<div>${this.data.user_id}</div>
				<span>Email</span>
				<div>${this.data.email}</div>
				<span>Phone</span>
				<div>${this.data.phone || '<span class="NA">-</span>'}</div>
				<span>Sign-up Date</span>
				<div>${Format.dateTime(this.data.created_at) || '<span class="NA">-</span>'}</div>
				<span>Added By</span>
				<div>${this.data.added_by_user || '<span class="NA">-</span>'}</div>
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

		activity.on('click', async () => {

			this.container.querySelector('.heading-bar .selected').classList.remove('selected');

			activity.classList.add('selected');

			const response = await this.sessions.load();
			await this.sessions.process(response);

			this.sessions.render();

			Sections.show('activity');
		});
	}
}

class Sessions {

	constructor(user) {

		Object.assign(this, user.data);

		this.sessionsList = new Map;
	}

	async load() {

		if(this.response)
			return this.response;

		const
			parameters = {
				user_id: this.user_id,
			},
			options = {
				method: 'GET',
			};

		this.response = await API.call('session-logs/list', parameters, options);

		return this.response;
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
				method: 'GET',
			};

		[this.reports, this.errors] = await Promise.all([
			API.call('reports/logs/log', parameters, options),
			API.call('errors/list', parameters, options),
		]);

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

		activity = activity.sort((a, b) => {

			const created_atA = a.created_at.toLowerCase();
			const created_atB = b.created_at.toLowerCase();

			if (created_atA < created_atB) {
				return -1;
			}

			if (created_atA > created_atB) {
				return 1;
			}

			return 0;
		});

		const groupedList = [];

		let tempList = [];

		for(const data of activity) {

			if(!activity.indexOf(data)) {
				tempList.push(data);
			}
			else if(tempList[tempList.length - 1].type == activity[activity.indexOf(data)].type) {
				tempList.push(data);
			}
			else {
				groupedList.push(tempList);
				tempList = [];
				tempList.push(data);
			}

			if(activity.indexOf(data) == activity.length - 1){
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

		let detailString = [this.browser, this.OS, this.ip].filter(d => d);

		detailString = detailString.join('&middot;&nbsp;');

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
					<div class="extra-info NA">
						${detailString}
						<span class="activity-details NA"></span>
					</div>
				</div>
			</header>
			<div class="loading-activity-groups hidden">
				<i class="fa fa-spinner fa-spin"></i>
			</div>
		`;

		container.querySelector('header').on('click', async() => {

			container.querySelector('.loading-activity-groups').classList.remove('hidden');

			await this.load();

			container.querySelector('.activity-details').innerHTML = `Reports: ${this.reportsCount} &middot; Errors: ${this.errorsCount}`;

			container.querySelector('.down').classList.toggle('angle-rotate');

			container.appendChild(this.activityGroups.container);

			container.querySelector('.loading-activity-groups').classList.add('hidden');

			container.querySelector('.activity-groups').classList.toggle('hidden');
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

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('activity-groups', 'hidden');

		for(const activityGroup of this)
			container.appendChild(activityGroup.container);

		return container;
	}
}

class ActivityGroup extends Set {

	constructor(activityGroup) {

		super();

		this.type = activityGroup[0].type;

		for(const activity of activityGroup) {

			if(activity.result_query) {
				this.add(new ActivityReport(activity));
			}
			else {
				this.add(new ActivityError(activity));
			}
		}
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');


		container.classList.add('activity-group');

		const icon = this.type == 'report' ? 'far fa-file' : 'fas fa-exclamation';

		container.innerHTML = `
			<header>
				<div class="icon"><i class="${icon}"></i></div>
				<div class="details">
					<div class="title">
						<span>${this.size}</span><span>${this.type}${this.size == 1 ? '' : 's'}</span>

						<div class="down">
							<i class="fas fa-angle-right"></i>
						</div>
					</div>

					<div class="extra-info">
						${Format.dateTime(Array.from(this)[0].created_at)} - ${Format.dateTime(Array.from(this)[this.size - 1].created_at)}
					</div>
			</header>

			<div class="activity-list hidden"></div>
		`;

		const activityList = container.querySelector('.activity-list');

		container.querySelector('header').on('click', () => {

			activityList.classList.toggle('hidden');

			container.querySelector('header').classList.toggle('selected');
			container.querySelector('.down').classList.toggle('angle-rotate');

			if(activityList.childElementCount)
				return;

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
	}

	get container() {

		if(this.activityContainerElement)
			return this.activityContainerElement;

		const container = this.activityContainerElement = document.createElement('div');

		container.classList.add('activity', 'report');
		const
			div = document.createElement('div'),
			details = document.createElement('div');

		details.classList.add('details');

		container.on('click', () => {

			const dialogueBox = new DialogBox();

			dialogueBox.heading = this.type;
			dialogueBox.body.classList.add('activity-popup');

			for(const key of this.keys) {

				const span = document.createElement('span');
				span.classList.add('key');
				span.textContent = key + ':';

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

		details.appendChild(this.name);
		details.appendChild(this.extraInfo);

		container.appendChild(div);
		container.appendChild(details);

		return container;
	}
}

class ActivityReport extends Activity {

	constructor(report) {

		super(report);

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
		executionTime.textContent = `Execution Time: ${this.response_time}`;

		const date = document.createElement('span');
		date.textContent = Format.dateTime(this.created_at);

		extraInfo.appendChild(executionTime);
		extraInfo.appendChild(date);

		return extraInfo;
	}
}

class ActivityError extends Activity {

	constructor(error) {

		super(error);

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