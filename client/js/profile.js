Page.class = class x extends Page {

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

		this.container.querySelector('.heading-bar .info').on('click',() => {
			this.profileInfo.render();
			Sections.show('profile-info');
		});

		this.container.querySelector('.heading-bar .activity').on('click', () => {
			this.sessions.render();
			Sections.show('activity-info');
		});

		this.container.querySelector('.heading-bar .activity').click();
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
			container.appendChild(session.container);
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.innerHTML = `

			<div class="toolbar">
				<h3>Show session details</h3>
			</div>
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

		container.innerHTML = `
			<div class="sessions">
				<div><i class="far fa-clock"></i></div>
				<div class="details">
					<div class="time"><strong>${Format.dateTime(this.created_at)} Session Id: ${this.id}</div>
					<div class="device-info">
						<label>
							<span>Browser: ${this.browser}</span>
						</label>
						<label>
							<span>Os: ${this.OS}</span>
						</label>
						<label>
							<span>IP: ${this.ip}</span>
						</label>
					</div>
				</div>
			<div>
		`;

		for(const elemnt of this.sortedActivity)
			container.appendChild(elemnt.container);

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
			<div><i class="fas fa-file-alt"></i></div>
			<div class="details">

				<strong>${DataSource.list.get(this.query_id).name}#${this.id}</strong>
				<div class="time-info">
					<div>Execution time: ${this.response_time}</div>
					<div>${Format.dateTime(this.created_at)}</div>
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

		container.innerHTML = `
			<div><i class="fas fa-exclamation-triangle"></i></div>

			<div class="details">
				<strong>Error</strong>
				<div class="time-info">
					<div>${this.type}</div>
					<div>${this.message}</div>
					<div>${Format.dateTime(this.created_at)}</div>
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