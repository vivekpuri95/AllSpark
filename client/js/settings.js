class Settings extends Page {

	constructor() {
		super();

		const nav = this.container.querySelector('nav');

		for(const [key, settings] of Settings.list) {

			const setting = new settings(this.container);

			const a = document.createElement('a');
		
			a.textContent = setting.name;
			
			a.on('click', () => {
				
				for(const a of nav.querySelectorAll('a.selected'))
					a.classList.remove('selected');

				for(const a of this.container.querySelectorAll('.setting-page'))
					a.classList.add('hidden');

				a.classList.add('selected');
				setting.setup();
				setting.load();
				setting.container.classList.remove('hidden');
			});

			nav.appendChild(a);
		};

		const byDefault = this.container.querySelector('nav a');

		byDefault.classList.add('selected');
		
		for(const [key, settings] of Settings.list) {

			const setting = new settings(this.container);

			if(byDefault.textContent == setting.name) {
				setting.setup();
				setting.load();
				setting.container.classList.remove('hidden');
			}
		}
	}
}

Page.class = Settings;

class SettingPage {

	constructor(page) {
		this.page = page;
	}
}

Settings.list = new Map;

Settings.list.set('datasets', class Datasets extends SettingPage {

	get name() {
		return 'Datasets';
	}

	setup() {

		this.container = this.page.querySelector('.datasets-page');
		this.form = this.container.querySelector('section#datasets-form form');

		for(const data of MetaData.categories.values()) {
			this.form.category_id.insertAdjacentHTML('beforeend',`
				<option value="${data.category_id}">${data.name}</option>
			`);
		}

		this.container.querySelector('section#datasets-list #add-datset').on('click', () => SettingsDataset.add(this));

		this.container.querySelector('#datasets-form #cancel-form').on('click', () => {
			Sections.show('datasets-list');
		});
	}

	async load() {

		const response = await API.call('datasets/list');

		this.list = new Map;

		for(const data of response)
			this.list.set(data.id, new SettingsDataset(data, this));

		await this.render();
	}

	async render() {

		const container = this.container.querySelector('#datasets-list table tbody')
		container.textContent = null;

		if(!this.list.size)
			container.innerHTML = '<div class="NA">No rows found :(</div>'

		for(const dataset of this.list.values()){
			container.appendChild(dataset.row);
		}

		await Sections.show('datasets-list');
	}


});

Settings.list.set('privileges', class Privileges extends SettingPage {

    get name() {
        return 'Privileges';
    }

    setup() {

        this.container = this.page.querySelector('.privilege-page');
        this.form = this.container.querySelector('section#privileges-form form');

        this.container.querySelector('section#privileges-list #add-privilege').on('click', () => SettingsPrivilege.add(this));

        this.container.querySelector('#privileges-form #cancel-form').on('click', () => {
            Sections.show('privileges-list');
        });
    }

    async load() {

        const response = await API.call('privileges/list');

        this.list = new Map;

        for(const data of response)
            this.list.set(data.privilege_id, new SettingsPrivilege(data, this));

        await this.render();
    }

    async render() {

        const container = this.container.querySelector('#privileges-list table tbody')
        container.textContent = null;

        if(!this.list.size)
            container.innerHTML = '<div class="NA">No rows found :(</div>'

        for(const dataset of this.list.values()){
            container.appendChild(dataset.row);
        }

        await Sections.show('privileges-list');
    }


});

class SettingsDataset {

	constructor(dataset, datasets) {

		for(const key in dataset)
			this[key] = dataset[key];

		this.datasets = datasets;
	}

	static add(datasets) {

		datasets.container.querySelector('#datasets-form h1').textContent = 'Add new Dataset';
		datasets.form.reset();

		datasets.form.removeEventListener('submit', SettingsDataset.submitListener);

		datasets.form.on('submit', SettingsDataset.submitListener = e => SettingsDataset.insert(e, datasets));

		Sections.show('datasets-form');

		datasets.form.focus();
	}

	static async insert(e, datasets) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(datasets.form),
		}

		const response = await API.call('datasets/insert', {}, options);

		await datasets.load();

		await datasets.list.get(response.insertId).edit();
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td>${this.name}</td>
			<td>${MetaData.categories.get(this.category_id).name}</td>
			<td>${this.query_id}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.green').on('click', () => this.edit());

		this.container.querySelector('.red').on('click', () => this.delete());

		return this.container;
	}

	async edit() {

		this.datasets.container.querySelector('#datasets-form h1').textContent = 'Edit ' + this.name;
		this.datasets.form.reset();

		this.datasets.form.name.value = this.name;
		this.datasets.form.category_id.value = this.category_id;
		this.datasets.form.query_id.value = this.query_id;

		this.datasets.form.removeEventListener('submit', SettingsDataset.submitListener);
		this.datasets.form.on('submit', SettingsDataset.submitListener = e => this.update(e));

		await Sections.show('datasets-form');
	}

	async update(e) {

		e.preventDefault();

		const parameter = {
			id: this.id,
		}

		const options = {
			method: 'POST',
			form: new FormData(this.datasets.form),
		}

		await API.call('datasets/update', parameter, options);

		await this.datasets.load();

		this.datasets.list.get(this.id).edit();

		await Sections.show('datasets-form');

		this.datasets.list.get(this.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const options = {
			method: 'POST',
		}
		const parameter = {
			id: this.id,
		}

		await API.call('datasets/delete', parameter, options);
		await this.datasets.load();
	}
}


class SettingsPrivilege {

    constructor(privilege, privileges) {

        for(const key in privilege)
            this[key] = privilege[key];

        this.privileges = privileges;
    }

    static async add(privileges) {

        privileges.container.querySelector('#privileges-form h1').textContent = 'Add new Privileges';
        privileges.form.reset();

        if(SettingsPrivilege.submitListener)
        	privileges.form.removeEventListener('submit', SettingsPrivilege.submitListener);

        privileges.form.on('submit', SettingsPrivilege.submitListener = e => SettingsPrivilege.insert(e, privileges));

        await Sections.show('privileges-form');
    }

    static async insert(e, privileges) {

        e.preventDefault();

        const options = {
            method: 'POST',
            form: new FormData(privileges.form),
        }

        const response = await API.call('privileges/insert', {}, options);

        await privileges.load();

        await privileges.list.get(response.insertId).edit();
    }

    get row() {

        if(this.container)
            return this.container;

        this.container = document.createElement('tr');

        this.container.innerHTML = `
			<td>${this.privilege_id}</td>
			<td>${this.name}</td>
			<td>${this.is_admin}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

        this.container.querySelector('.green').on('click', () => this.edit());

        this.container.querySelector('.red').on('click', () => this.delete());

        return this.container;
    }

    async edit() {

        this.privileges.container.querySelector('#privileges-form h1').textContent = 'Edit ' + this.name;
        this.privileges.form.reset();

        this.privileges.form.name.value = this.name;
        this.privileges.form.is_admin.value = this.is_admin;

        this.privileges.form.removeEventListener('submit', SettingsPrivilege.submitListener);
        this.privileges.form.on('submit', SettingsPrivilege.submitListener = e => this.update(e));

        await Sections.show('privileges-form');
    }

    async update(e) {

        e.preventDefault();

        const parameter = {
            privilege_id: this.privilege_id,
        }

        const options = {
            method: 'POST',
            form: new FormData(this.privileges.form),
        }

        await API.call('privileges/update', parameter, options);

        await this.privileges.load();

        this.privileges.list.get(this.privilege_id).edit();

        await Sections.show('privileges-form');
    }

    async delete() {

        if(!confirm('Are you sure?'))
            return;

        const options = {
            method: 'POST',
        }
        const parameter = {
            privilege_id: this.privilege_id,
        }

        await API.call('privileges/delete', parameter, options);
        await this.privileges.load();
    }
}