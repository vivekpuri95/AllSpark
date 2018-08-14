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

		if(!this.data)

			return this.container.innerHTML = '<div class="NA">No User found</div>';

		this.container.querySelector('.edit').classList.toggle('hidden', user.id != this.id);

		this.container.querySelector('h1 span').textContent = [this.data.first_name, this.data.middle_name, this.data.last_name].filter(a => a).join(' ');

		this.container.querySelector('.profile-details').innerHTML = `
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

		activity.on('click', () => {

			this.container.querySelector('.heading-bar .selected').classList.remove('selected');

			activity.classList.add('selected');

			this.sessions.render();
			Sections.show('activity-info');
		});
	}
}

class Sessions {

	constructor(user) {

		Object.assign(this, user.data);

		this.sessionsList = new Map;

		(async() => {
			await this.load();
		})();
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

		this.process(sessions);
	}

	process(sessions) {

		this.sessionsList.clear();

		for(const session of sessions)
			this.sessionsList.set(session.id, new Session(session))
	}

	render() {

		const container = this.container;

		for(const session of this.sessionsList.values())
			container.querySelector('.list').appendChild(session.container);
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('session-activity');

		container.innerHTML = `

			<div class="sessions-toolbar hidden">
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

		(async() => {
			await this.load();
		})();
	}

	async load() {

		const
			parameters = {
				user_id: this.user_id,
				session_id: this.id,
			},
			options = {
				method: 'Get',
			};

		const reports = await API.call('reports/logs/log', parameters, options);
		const errors = await API.call('errors/list', parameters, options);

		this.sortedActivity = this.process(reports, errors);
	}

	process(reports, errors) {

		const
			logs = reports.concat(errors),
			list = new Set;

		logs.sort((a,b) => {

			const
				first = a.created_at,
				second = b.created_at;
		});

		for(const data of logs) {

			if(data.result_query) {
				list.add(new ReportContainer(data));
			}
			else {
				list.add(new ErrorContainer(data));
			}
		}

		return list;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('session-container');

		container.innerHTML = `
			<div class="session">
				<div class="list-icon"><i class="far fa-clock"></i></div>
				<div class="details">
					<div class="time">
						<div class="NA">#${this.id}</div>
							${Format.dateTime(this.created_at)}
						<div class="down">
							<i class="fas fa-angle-right"></i>
						</div>
					</div>
					<div class="device-info">
						<label>
							<span>${this.browser}</span>
						</label>
						&middot;&nbsp;
						<label>
							<span>${this.OS}</span>
						</label>
						&middot;&nbsp;
						<label>
							<span>${this.ip}</span>
						</label>
					</div>
				</div>
			</div>

			<div class="logs hidden"></div>
		`;

		container.querySelector('.details').on('click', () => {
			container.querySelector('.logs').classList.toggle('hidden');
			container.querySelector('.down').classList.toggle('angle-rotate');
		});

		for(const elemnt of this.sortedActivity)
			container.querySelector('.logs').appendChild(elemnt.container);

		return container;
	}
}

class ReportContainer {

	constructor(report) {
		Object.assign(this, report)
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('report-log');

		container.innerHTML = `
			<div class="list-icon"><i class="far fa-file"></i></div>
			<div class="details">
				<div class="report-name">
					${DataSource.list.get(this.query_id).name}<div class="NA"> #${this.id}</div>
				</div>
				<div class="extra-info">
					<span>Execution time: ${this.response_time}</span>
					<span>${Format.dateTime(this.created_at)}</span>
				</div>
			</div>
		`;

		return container;
	}
}

class ErrorContainer {

	constructor(error) {
		Object.assign(this, error)
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('error-log');

		container.innerHTML = `
			<div class="list-icon"><i class="fas fa-exclamation"></i></div>

			<div class="details">
				<div class="error-info">
					Error
				</div>
				<div class="extra-info">
					<span>Type: ${this.type}</span>
					<span>Message: ${this.message}</span>
					<span>${Format.dateTime(this.created_at)}</span>
				</div>
			</div>
		`;

		return container;
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