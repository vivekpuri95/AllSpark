Page.class = class VisualizationsManager extends Page {

	constructor() {

		super();

		window.on('popstate', e => this.loadState(e.state));

		this.list = new VisualizationsManagerList(this);

		this.load();

		this.container.appendChild(this.list.container);

		this.container.insertAdjacentHTML('beforeend', `
			<section class"section" id="edit"></section>
		`);

		Sections.show('list');
	}

	async load() {

		await this.loadConnections();
		this.list.setup();
		await this.list.load();
	}

	async loadConnections() {

		this.connections = await API.call('credentials/list')

		const connections = new Map;

		for(const connection of this.connections) {

			for(const feature of MetaData.features.values()) {

				if(feature.slug == connection.type && feature.type == 'source')
					connection.feature = feature;
			}

			if(!connection.feature)
				continue;

			connections.set(connections.id, connection);
		}

		this.connections = new Map(this.connections.map(c => [c.id, c]));
	}
}

class VisualizationsManagerList extends Map {

	constructor(page) {

		super();

		this.page = page;
	}

	setup() {

		const filters = [
			{
				key: 'Query ID',
				rowValue: row => [row.query_id],
			},
			{
				key: 'Name',
				rowValue: row => row.name ? [row.name] : [],
			},
			{
				key: 'Description',
				rowValue: row => row.description ? [row.description] : [],
			},
			{
				key: 'Connection Name',
				rowValue: row => {
					if(page.connections.has(parseInt(row.connection_name)))
						return [page.connections.get(parseInt(row.connection_name)).connection_name];
					else
						return [];
				},
			},
			{
				key: 'Connection Type',
				rowValue: row => {
					if(page.connections.has(parseInt(row.connection_name)))
						return [page.connections.get(parseInt(row.connection_name)).feature.name];
					else
						return [];
				},
			},
			{
				key: 'Filters Length',
				rowValue: row => [row.filters.length]
			},
			{
				key: 'Filters Name',
				rowValue: row => row.filters.map(f => f.name ? f.name : []),
			},
			{
				key: 'Filters Placeholder',
				rowValue: row => row.filters.map(f => f.placeholder ? f.placeholder : []),
			},
			{
				key: 'Visualizations ID',
				rowValue: row => row.visualizations.map(f => f.visualization_id ? f.visualization_id : []),
			},
			{
				key: 'Visualizations Name',
				rowValue: row => row.visualizations.map(f => f.name ? f.name : []),
			},
			{
				key: 'Visualizations Type Name',
				rowValue: row => {
					return row.visualizations.map(f => f.type)
											   .map(m => MetaData.visualizations.has(m) ?
											   (MetaData.visualizations.get(m)).name : []);
				},
			},
			{
				key: 'Visualizations Length',
				rowValue: row => [row.visualizations.length],
			},
			{
				key: 'Report Enabled',
				rowValue: row => row.is_enabled ? ['yes'] : ['no'],
			},
			{
				key: 'Report Creation',
				rowValue: row => row.created_at ? [row.created_at] : [],
			},
			{
				key: 'Definition',
				rowValue: row => row.query ? [row.query] : [],
			},
			{
				key: 'Report Refresh Rate',
				rowValue: row => row.refresh_rate ? [row.refresh_rate] : [],
			},
			{
				key: 'Subtitle',
				rowValue: row => {
					if(MetaData.categories.has(parseInt(row.subtitle)))
						return [MetaData.categories.get(parseInt(row.subtitle)).name];
					else
						return [];
				},
			},
			{
				key: 'Report Last Updated At',
				rowValue: row => row.updated_at ? [row.updated_at] : [],
			}
		];

		this.searchBar = new SearchColumnFilters({ filters });

		this.container.querySelector('.section .toolbar').appendChild(this.searchBar.globalSearch.container);

		this.container.querySelector('.section .toolbar').insertAdjacentElement('afterend', this.searchBar.container);

		this.searchBar.on('change', () => this.load(false) );
	}

	get container() {

		if(this.containerElemenet)
			return this.containerElemenet;

		const container = this.containerElemenet = document.createElement('section');

		container.classList.add('section');
		container.id = 'list';

		container.innerHTML = `

			<h1>Visualizations Manager</h1>
			<form class="toolbar form"></form>
			<div class="visualizations"></div>
		`;

		if(0 && this.page.user.privileges.has('visualization.insert')) {

			container.querySelector('.toolbar').insertAdjacentHTML('beforebegin', `
				<button tpe="button"><i class="fas fa-plus"></i> Create New Visualization</button>
			`);

			container.querySelector('.toolbar button').on('click', () => VisualizationsManagerVisualization.add(this.page));
		}

		return container;
	}

	async load(force = true) {

		await this.fetch(force);

		this.process();

		this.render();
	}

	async fetch(force) {
		await DataSource.load(force);
	}

	process() {

		this.searchBar.data = Array.from(DataSource.list.values());

		this.clear();

		const filterData = this.searchBar.filterData;

		console.log(filterData,'filter');

		for(const report of filterData) {

			for(const visualization of report.visualizations)
				this.set(visualization.visualization_id, new VisualizationManager(visualization, report, this.page));
		}
	}

	render() {

		const list = this.container.querySelector('.visualizations');

		list.textContent = null;

		for(const visualization of this.values()) {

			list.appendChild(visualization.row);
		}
	}
}

class VisualizationManager {

	constructor(visualization, report, page) {

		Object.assign(this, visualization);

		this.report = report;
		this.page = page;

		this.visualization = MetaData.visualizations.get(this.type);

		if(!this.options)
			this.options = {};

		if(typeof this.options != 'string')
			return;

		try {
			this.options = JSON.parse(this.options) || {};
		}

		catch(e) {
			this.options = {};
		}
	}

	get row() {

		if(this.rowElement)
			return this.rowElement;

		const row = this.rowElement = document.createElement('div');

		row.classList.add('visualization');

		row.innerHTML = `
			<img src="${this.visualization.image}">

			<h2>
				<a href="/visualization/${this.visualization_id}" target="_blank">
					${this.name}
				</a>
				<span class="id">#${this.visualization_id}</span>
			</h2>

			<span class="subtitle">

				<span>Type: <strong>${this.visualization.name}</strong></span>

				<span>
					Report:
					<strong>
						<a href="/report/${this.report.query_id}" target="_blank">
							${this.report.name}
						</a>
					</strong>
					<span class="id">#${this.query_id}</span>
				</span>
			</span>

			<div class="actions"></div>
		`;

		if(this.editable) {

			const edit = document.createElement('a');

			edit.textContent = 'Edit';

			edit.on('click', () => window.location = `/reports/configure-visualization/${this.visualization_id}`);

			row.querySelector('.actions').appendChild(edit);
		}

		if(this.deletable) {

			const _delete = document.createElement('a');

			_delete.textContent = 'Delete';

			_delete.on('click', () => this.delete());

			row.querySelector('.actions').appendChild(_delete);
		}

		return row;
	}

	edit() {

		const container = this.page.container.querySelector('section#edit');

		container.textContent = null;

		container.appendChild(this.container);

		Sections.show('edit');
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			parameters = {
				visualization_id: this.visualization_id,
			},
			options = {
				method: 'POST',
			};

		try {

			const response = await API.call('reports/visualizations/delete', parameters, options);

			await this.page.list.load();

			const type = MetaData.visualizations.get(this.type);

			new SnackBar({
				message: `${type ? type.name : ''} Visualization Deleted`,
				subtitle: `${this.name} #${this.visualization_id}`,
				icon: 'far fa-trash-alt',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	get container() {

		if(this.containerElement) {

			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('visualization-form');

		container.innerHTML = `
			<form id="configure-visualization-form">
				<div class="configuration-section">
					<h3><i class="fas fa-angle-right"></i> General</h3>
					<div class="body">
						<div class="form subform">
							<label>
								<span>Name</span>
								<input type="text" name="name" required>
							</label>

							<label>
								<span>Visualization Type</span>
								<select name="type" required></select>
							</label>

							<label>
								<span>Description</span>
								<textarea  name="description" rows="4" cols="50"></textarea>
							</label>
						</div>
					</div>
				</div>

				<div class="options"></div>

			</form>
		`;

		this.form = container.querySelector('#configure-visualization-form');
		this.optionsForm = new (VisualizationManager.types.get(this.type))(this, this.page);

		this.transformations = new ReportTransformations(this, this.page);
		this.reportVisualizationFilters =  new ReportVisualizationFilters(this, this.page);

		container.appendChild(this.transformations.container);
		container.appendChild(this.reportVisualizationFilters.container);

		for(const visualization of MetaData.visualizations.values()) {

			this.form.type.insertAdjacentHTML('beforeend', `
				<option value="${visualization.slug}">${visualization.name}</option>
			`);
		}

		this.form.on('submit', e => this.update(e));

		return container;
	}

	async load() {

		this.form.reset();

		this.form.name.value = this.name;
		this.form.type.value = this.type;
		this.form.description.value = this.description;

		this.reportVisualizationFilters.load();

		this.transformations.load();
		this.container.querySelector('.options').appendChild(this.optionsForm.form);

		this.setupConfigurationSetions();

		const first = this.container.querySelector('.configuration-section');

		if(first && first.querySelector('.body.hidden'))
			first.querySelector('h3').click();
	}

	async update(e) {

		if(e) {

			e.preventDefault();
		}

		const
			parameters = {
				visualization_id: this.visualization_id
			},
			options = {
				method: 'POST',
				form: new FormData(this.form),
			};

		options.form.set('options', JSON.stringify(this.json.options));

		try {

			await API.call('reports/visualizations/update', parameters, options);

			await DataSource.load(true);

			this.page.logs.clear();

			this.list.load();

			const type = MetaData.visualizations.get(this.type);

			new SnackBar({
				message: `${type ? type.name : ''} Visualization Saved`,
				subtitle: `${this.name} #${this.visualization_id}`,
				icon: 'far fa-save',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	get json() {

		return {
			visualization_id: this.visualization_id,
			query_id: this.query_id,
			type: this.form.type.value,
			name: this.form.name.value,
			description: this.form.description.value,
			options: {
				...this.optionsForm.json,
				transformations: this.transformations.json,
				filters: this.reportVisualizationFilters.json
			}
		};
	}

	async preview() {

		this.stage.page.preview.load({
			query_id: this.query_id,
			visualizationOptions: this.json.options,
			visualization: {
				id: this.visualization_id,
				type: this.json.type,
				name: this.json.name
			}
		});

		new SnackBar({
			message: 'Preview Loaded',
			subtitle: 'Your changes are not saved yet, and will be lost if page is reloaded',
			icon: 'fas fa-eye',
		});
	}

	setupConfigurationSetions(container) {

		if(!container)
			container = this.container;

		for(const section of container.querySelectorAll('.configuration-section')) {

			const
				body = section.querySelector('.body'),
				h3 = section.querySelector('h3');

			body.classList.add('hidden');

			h3.removeEventListener('click', h3.clickListener);

			h3.on('click', h3.clickListener = e => {

				body.classList.toggle('hidden');

				for(const svg of h3.querySelectorAll('.fa-angle-right, .fa-angle-down'))
					svg.remove();

				h3.insertAdjacentHTML('afterbegin', body.classList.contains('hidden') ? '<i class="fas fa-angle-right"></i>' : '<i class="fas fa-angle-down"></i>');
			});
		}
	}
}

class VisualizationLog extends ReportLog {

	load() {

		const logInfo = this.logs.container.querySelector('.info');

		logInfo.classList.remove('hidden');
		this.logs.container.querySelector('.list').classList.add('hidden');

		logInfo.querySelector('.toolbar').innerHTML =  `
			<button class="back"><i class="fa fa-arrow-left"></i> Back to history</button>
			<button class="restore"><i class="fa fa-window-restore"></i> Restore</button>
			<button class="preview"><i class="fas fa-eye"></i> Preview</button>
			<span class="log-title">
				<a href="/user/profile/${this.updated_by}" target="_blank">${this.user_name}</a> &#183; ${Format.dateTime(this.created_at)}
			</span>
		`;

		logInfo.querySelector('.toolbar').classList.add('visualization');

		logInfo.querySelector('.toolbar button.back').on('click', () => {

			this.logs.container.querySelector('.list').classList.remove('hidden');
			logInfo.classList.add('hidden');
		});

		logInfo.querySelector('.toolbar .restore').on('click', () => {

			if(this.logsVisualizationManager) {

				this.logs.page.loadVisualizationForm(this.logsVisualizationManager.json);
			}

			new SnackBar({
				message: this.owner_id + ' Visualization Restored',
				subtitle: 'The restored visualization is not saved yet and will be lost on page reload.',
				icon: 'fa fa-plus',
			});
		});

		logInfo.querySelector('.toolbar .preview').on('click', () => {

			if(this.logsVisualizationManager) {

				this.logsVisualizationManager.preview();
			}

		});

		const queryInfo = this.logs.container.querySelector('.info div.log-form');
		queryInfo.textContent =null;

		queryInfo.classList.remove('block');

		if(!this.logsVisualizationManager) {

			this.logsVisualizationManager = new VisualizationManager(this.state, this.logs.page);
		}

		queryInfo.appendChild(this.logsVisualizationManager.container);

		this.logsVisualizationManager.load();
	}
}

class Axes extends Set {

	constructor(axes, stage) {
		super();

		this.stage = stage;
		this.list = axes;
		this.clear();

		for(const axis of this.list || [])
			this.add(new Axis(axis, this));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('options', 'form', 'body', 'axes');

		this.render();

		return container;
	}

	render() {

		this.container.textContent = null;

		this.stage.formContainer.querySelector('.configuration-section .count').innerHTML = `${this.size ? this.size + ' axes added' : ''}`;

		for(const axis of this)
			this.container.appendChild(axis.container);

		if(!this.size)
			this.container.innerHTML = '<div class="NA">No axes added yet!</div>';

		this.container.insertAdjacentHTML('beforeend', `

			<div class="add-axis">
				<fieldset>
					<legend>Add Axis</legend>
					<div class="form">

						<label>
							<span>Position</span>
							<select name="position" value="${this.position}" required>
								<option value="bottom">Bottom</option>
								<option value="left">Left</option>
								<option value="right">Right</option>
							</select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="button"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</div>
		`);

		this.container.querySelector('.add-axis button[type=button]').on('click', e => this.insert(e));
	}

	get json() {

		const response = [];

		for(const axis of this.values())
			response.push(axis.json);

		return response;
	}

	restCheck(action) {

		for(const rest of this.container.querySelectorAll('.restCheck'))
			rest.classList.toggle('hidden', action);
	}

	insert(e) {

		e.preventDefault();

		const position = this.container.querySelector('.add-axis select').value;

		this.add(new Axis({position}, this));
		this.render();
	}
}

class Axis {

	constructor(axis, axes) {

		for(const key in axis)
			this[key] = axis[key]

		this.axes = axes;

		if(!this.columns)
			this.columns = [];
	}

	get container() {

		if(this.axisContainer)
			return this.axisContainer;

		const container = this.axisContainer = document.createElement('div');

		let datalist = [];

		container.classList.add('axis');

		for(const [key, column] of this.axes.stage.page.preview.report.columns)
			datalist.push({name: column.name, value: key});

		let usedColumns = [];

		for(const axis of this.axes) {

			if(axis.position == this.position)
				continue;

			usedColumns = usedColumns.concat(axis.columns.map(x => x.key));
		}

		for(const column of usedColumns)
			datalist = datalist.filter(x => !column.includes(x.value));

		this.position = this.position || 'top';

		container.multiSelectColumns = new MultiSelect({datalist: datalist, expand: true});

		const axisColumn = container.multiSelectColumns.container;

		container.multiSelectColumns.value = this.columns ? this.columns.map(x => x.key) : [];

		container.innerHTML = `

			<fieldset>
				<legend>${this.position[0].toUpperCase() + this.position.slice(1)} Axis</legend>

				<div class="form">

					<label>
						<span>Label</span>
						<input type="text" name="label" value="${this.label || ''}">
					</label>

					<label class="axis-column">
						<span>Columns</span>
					</label>

					<label class="restCheck"><span><input type="checkbox" name="restcolumns" class="restcolumns" ${this.restcolumns ? 'checked' : ''}> Rest</span></label>

					<label>
						<span>Format</span>
						<select name="format">
							<option value="">None</option>
							<option value="s">SI</option>
						</select>
					</label>

					<label>
						<span>
							<input type="checkbox" name="axisShowValues"> Show Values
						</span>
					</label>

					<label>
						<button class="delete" type="button">
							<i class="far fa-trash-alt"></i> Delete
						</button>
					</label>
				</div>
			</fieldset>
		`;

		container.multiSelectColumns.on('change', () => {

			let usedColumns = [];
			const freeColumns = [];

			for(const axis of this.axes)
				usedColumns = usedColumns.concat(axis.container.multiSelectColumns.value);

			for(const axis of this.axes) {
				for(const item of axis.container.multiSelectColumns.datalist) {
					if(!freeColumns.some(c => c.value.includes(item.value)) && !usedColumns.includes(item.value))
						freeColumns.push(item);
				}
			}

			for(const axis of this.axes) {

				if(axis == this)
					continue;

				const selected = axis.container.multiSelectColumns.value;

				var newDataList = [];

				for(const data of axis.container.multiSelectColumns.datalist) {
					if(!usedColumns.includes(data.value) || selected.includes(data.value)) {
						newDataList.push(data);
					}
				}

				for(const value of freeColumns) {
					if(!newDataList.some(k => k.value.includes(value.value)))
						newDataList.push(value);
				}

				if(axis.container.multiSelectColumns.datalist.map(x => x.value).sort().join() == newDataList.map(x => x.value).sort().join())
					continue;

				axis.container.multiSelectColumns.datalist = newDataList;
				axis.container.multiSelectColumns.render();
			}
		});

		const restColumns = container.querySelector('.restcolumns');

		restColumns.on('change', () => {

			this.axes.restCheck(restColumns.checked);
			axisColumn.classList.toggle('hidden');

			if(restColumns.checked)
				container.querySelector('.restCheck').classList.remove('hidden');
		});

		if(this.restcolumns) {

			this.axes.restCheck(true);
			axisColumn.classList.add('hidden');
		}

		container.querySelector('.axis-column').appendChild(axisColumn);

		container.querySelector('select[name=format]').value = this.format || '';
		container.querySelector('input[name=axisShowValues]').checked = this.showValues;

		container.querySelector('.delete').on('click', () => {
			this.axes.delete(this);
			this.axes.render();
		});

		return container;
	}

	get json() {

		return {
			label: this.container.querySelector('input[name=label]').value,
			columns: this.container.multiSelectColumns.value.map(c => {return {key: c}}),
			restcolumns: this.container.querySelector('input[name=restcolumns]').checked,
			format: this.container.querySelector('select[name=format]').value,
			showValues: this.container.querySelector('input[name=axisShowValues]').checked,
			position: this.position,
		};
	}
}

class LinearAxes extends Set {

	constructor(axes = [], stage) {
		super();

		this.stage = stage;
		this.list = axes;
		this.clear();

		for(const axis of this.list)
			this.add(new LinearAxis(axis, this));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('options', 'form', 'body', 'axes');

		this.render();

		return container;
	}

	render() {

		this.container.textContent = null;

		this.stage.formContainer.querySelector('.configuration-section .count').innerHTML = `${this.size ? this.size + ' axes added' : ''}`;

		for(const axis of this)
			this.container.appendChild(axis.container);

		if(!this.size)
			this.container.innerHTML = '<div class="NA">No axes added yet!</div>';

		this.container.insertAdjacentHTML('beforeend', `

			<div class="add-axis">
				<fieldset>
					<legend>Add Axis</legend>
					<div class="form">

						<label>
							<span>Position</span>
							<select name="position" value="${this.position}" required>
								<option value="bottom">Bottom</option>
								<option value="left">Left</option>
								<option value="top">Top</option>
								<option value="right">Right</option>
							</select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="button"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</div>
		`);

		this.container.querySelector('.add-axis button[type=button]').on('click', e => this.insert(e));
	}

	get json() {

		const response = [];

		for(const axis of this.values())
			response.push(axis.json);

		return response;
	}

	restCheck(action) {

		for(const rest of this.container.querySelectorAll('.restCheck'))
			rest.classList.toggle('hidden', action);
	}

	insert(e) {

		e.preventDefault();

		const
			position = this.container.querySelector('.add-axis select').value,
			axis = new LinearAxis({position}, this);

		// Open the newly added axis
		axis.container.querySelector('legend').click();

		this.add(axis);
		this.render();
	}
}

class LinearAxis {

	constructor(axis, axes) {

		for(const key in axis)
			this[key] = axis[key]

		this.axes = axes;

		if(!this.columns)
			this.columns = [];
	}

	get container() {

		if(this.axisContainer)
			return this.axisContainer;

		const container = this.axisContainer = document.createElement('div');

		let datalist = [];

		container.classList.add('axis');

		for(const [key, column] of this.axes.stage.page.preview.report.columns)
			datalist.push({name: column.name, value: key});

		let usedColumns = [];

		for(const axis of this.axes) {

			if(axis.position == this.position)
				continue;

			usedColumns = usedColumns.concat(axis.columns.map(x => x.key));
		}

		for(const column of usedColumns)
			datalist = datalist.filter(x => !column.includes(x.value));

		this.position = this.position || 'top';

		container.multiSelectColumns = new MultiSelect({datalist: datalist, expand: true});

		const axisColumn = container.multiSelectColumns.container;

		container.multiSelectColumns.value = this.columns ? this.columns.map(x => x.key) : [];

		container.innerHTML = `

			<fieldset>
				<legend class="interactive">
					${this.position[0].toUpperCase() + this.position.slice(1)} Axis
				</legend>

				<div class="ellipsis"><i class="fas fa-ellipsis-h"></i></div>

				<div class="form hidden">

					<label>
						<span>Type</span>
						<select name="axis-type">
							<option value=""></option>
							<option value="line">Line</option>
							<option value="bar">Bar</option>
							<option value="area">Area</option>
						</select>
					</label>

					<label>
						<span>Position</span>
						<select name="position">
							<option value="bottom">Bottom</option>
							<option value="left">Left</option>
							<option value="top">Top</option>
							<option value="right">Right</option>
						</select>
					</label>

					<label>
						<span>Label</span>
						<input type="text" name="label" value="${this.label || ''}">
					</label>

					<label class="axis-column">
						<span>Columns</span>
					</label>

					<label class="restCheck"><span><input type="checkbox" name="restcolumns" class="restcolumns" ${this.restcolumns ? 'checked' : ''}> Rest</span></label>

					<label>
						<span>
							<input type="checkbox" name="axisStacked"> Stacked
						</span>
					</label>

					<div class="advanced-toggle"><i class="fa fa-angle-down"></i> &nbsp; Advanced &nbsp; <i class="fa fa-angle-down"></i></div>

					<label class="advanced hidden">
						<span>Format</span>
						<select name="format">
							<option value="">None</option>
							<option value="s">SI</option>
						</select>
					</label>

					<label class="advanced hidden">
						<span>Z Axis (Depth)</span>
						<input type="number" step="1" name="axisDepth" value="${this.depth || ''}">
					</label>

					<label class="advanced hidden">
						<span>Line Curve</span>
						<select name="curve">
							<option value="linear">Linear</option>
							<option value="step-before">Step Before</option>
							<option value="step-after">Step After</option>
							<option value="basis">Basis</option>
							<option value="basis-open">Basis Open</option>
							<option value="basis-closed">Basis Closed</option>
							<option value="bundle">Bundle</option>
							<option value="cardinal">Cardinal</option>
							<option value="cardinal-open">Cardinal Open</option>
							<option value="cardinal-closed">Cardinal Closed</option>
							<option value="monotone">Monotone</option>
						</select>
					</label>

					<label class="advanced hidden">
						<span>Line Thickness (Line Only)</span>
						<input type="number" step="0.1" name="axisLineThickness" value="${this.lineThickness || ''}">
					</label>

					<label class="advanced hidden">
						<span>
							<input type="checkbox" name="axisShowValues"> Show Values
						</span>
					</label>

					<label class="advanced hidden">
						<span>
							<input type="checkbox" name="axisShowPoints"> Show Points
						</span>
					</label>

					<label class="advanced hidden">
						<span>
							<input type="checkbox" name="axisHideScale"> Hide Scale
						</span>
					</label>

					<label class="advanced hidden">
						<span>
							<input type="checkbox" name="axisHideScaleLines"> Hide Scale Lines
						</span>
					</label>

					<label class="advanced hidden">
						<span>
							<input type="checkbox" name="axisDontAnimate"> Don't Animate
						</span>
					</label>

					<label>
						<button class="delete" type="button">
							<i class="far fa-trash-alt"></i> Delete
						</button>
					</label>
				</div>
			</fieldset>
		`;

		container.querySelector('legend').on('click', () => {
			container.querySelector('.form').classList.toggle('hidden');
			container.querySelector('.ellipsis').classList.toggle('hidden');
		});

		container.querySelector('.ellipsis').on('click', () => {
			container.querySelector('.form').classList.toggle('hidden');
			container.querySelector('.ellipsis').classList.toggle('hidden');
		});

		container.querySelector('.advanced-toggle').on('click', () => {

			for(const elemen of container.querySelectorAll('.advanced'))
				elemen.classList.toggle('hidden');
		});

		container.multiSelectColumns.on('change', () => {

			let usedColumns = [];
			const freeColumns = [];

			for(const axis of this.axes)
				usedColumns = usedColumns.concat(axis.container.multiSelectColumns.value);

			for(const axis of this.axes) {
				for(const item of axis.container.multiSelectColumns.datalist) {
					if(!freeColumns.some(c => c.value.includes(item.value)) && !usedColumns.includes(item.value))
						freeColumns.push(item);
				}
			}

			for(const axis of this.axes) {

				if(axis == this)
					continue;

				const selected = axis.container.multiSelectColumns.value;

				var newDataList = [];

				for(const data of axis.container.multiSelectColumns.datalist) {
					if(!usedColumns.includes(data.value) || selected.includes(data.value)) {
						newDataList.push(data);
					}
				}

				for(const value of freeColumns) {
					if(!newDataList.some(k => k.value.includes(value.value)))
						newDataList.push(value);
				}

				if(axis.container.multiSelectColumns.datalist.map(x => x.value).sort().join() == newDataList.map(x => x.value).sort().join())
					continue;

				axis.container.multiSelectColumns.datalist = newDataList;
				axis.container.multiSelectColumns.render();
			}
		});

		const restColumns = container.querySelector('.restcolumns');

		restColumns.on('change', () => {

			this.axes.restCheck(restColumns.checked);
			axisColumn.classList.toggle('hidden');

			if(restColumns.checked)
				container.querySelector('.restCheck').classList.remove('hidden');
		});

		if(this.restcolumns) {

			this.axes.restCheck(true);
			axisColumn.classList.add('hidden');
		}

		container.querySelector('.axis-column').appendChild(axisColumn);

		container.querySelector('select[name=axis-type]').value = this.type;
		container.querySelector('select[name=position]').value = this.position;
		container.querySelector('select[name=format]').value = this.format || '';
		container.querySelector('select[name=curve]').value = this.curve || '';
		container.querySelector('input[name=axisDepth]').value = this.depth;
		container.querySelector('input[name=axisLineThickness]').value = this.lineThickness;
		container.querySelector('input[name=axisStacked]').checked = this.stacked;
		container.querySelector('input[name=axisShowValues]').checked = this.showValues;
		container.querySelector('input[name=axisShowPoints]').checked = this.showPoints;
		container.querySelector('input[name=axisHideScale]').checked = this.hideScale;
		container.querySelector('input[name=axisHideScaleLines]').checked = this.hideScaleLines;
		container.querySelector('input[name=axisDontAnimate]').checked = this.dontAnimate;

		container.querySelector('.delete').on('click', () => {
			this.axes.delete(this);
			this.axes.render();
		});

		return container;
	}

	get json() {

		return {
			position: this.container.querySelector('select[name=position]').value,
			type: this.container.querySelector('select[name=axis-type]').value,
			label: this.container.querySelector('input[name=label]').value,
			columns: this.container.multiSelectColumns.value.map(c => {return {key: c}}),
			restcolumns: this.container.querySelector('input[name=restcolumns]').checked,
			format: this.container.querySelector('select[name=format]').value,
			curve: this.container.querySelector('select[name=curve]').value,
			depth: this.container.querySelector('input[name=axisDepth]').value,
			lineThickness: this.container.querySelector('input[name=axisLineThickness]').value,
			stacked: this.container.querySelector('input[name=axisStacked]').checked,
			showValues: this.container.querySelector('input[name=axisShowValues]').checked,
			showPoints: this.container.querySelector('input[name=axisShowPoints]').checked,
			hideScale: this.container.querySelector('input[name=axisHideScale]').checked,
			hideScaleLines: this.container.querySelector('input[name=axisHideScaleLines]').checked,
			dontAnimate: this.container.querySelector('input[name=axisDontAnimate]').checked,
		};
	}
}

class ReportVisualizationOptions {

	constructor(visualization, page, stage, readOnly = false) {
		this.visualization = visualization;
		this.page = page;
		this.stage = stage;
		this.readOnly = readOnly;
	}

	get form() {
		return document.createElement('form');
	}

	get json() {

		const result = {};

		for(const element of this.form.querySelectorAll('input, select')) {
			if(element.type != 'radio')
				result[element.name] = element[element.type == 'checkbox' ? 'checked' : 'value'];
		}

		return result;
	}
}

class ReportVisualizationLinearOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.classList.add('liner-visualization-options');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Axes <span class="count"></span></h3>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">

						<label>
							<span>
								<input type="checkbox" name="hideHeader"> Hide Header
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend"> Hide Legend
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="showValues"> Show Values
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		this.formContainer.axes = new Set();

		this.axes = new Axes(this.visualization.options.axes, this);

		container.querySelector('.configuration-section').appendChild(this.axes.container);



		if(this.visualization.options && this.visualization.options.hideLegend)
			container.querySelector('input[name=hideLegend]').checked = this.visualization.options.hideLegend;

		if(this.visualization.options && this.visualization.options.hideHeader)
			container.querySelector('input[name=hideHeader]').checked = this.visualization.options.hideHeader;

		if(this.visualization.options && this.visualization.options.showValues)
			container.querySelector('input[name=showValues]').checked = this.visualization.options.showValues;

		return container;
	}

	get json() {

		const response = {
			axes: this.axes.json,
			hideHeader: this.formContainer.querySelector('input[name=hideHeader]').checked,
			hideLegend: this.formContainer.querySelector('input[name=hideLegend]').checked,
			showValues: this.formContainer.querySelector('input[name=showValues]').checked,
		};

		return response;
	}
}

class SpatialMapOptionsLayers extends Set {

	constructor(layers, stage) {

		super();

		this.stage = stage;

		for(const layer of layers)
			this.add(new (SpatialMapOptionsLayer.types.get(layer.type))(layer, this));
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('options', 'form', 'body', 'layers');

		this.render();

		return container;
	}

	render() {

		this.container.textContent = null;

		this.stage.formContainer.querySelector('.configuration-section .count').innerHTML = `${this.size ? this.size + ' map layer' + ( this.size == 1 ? ' added' :'s added') : ''}`;

		if (!this.size)
			this.container.innerHTML = '<div class="NA">No layers added yet!</div>';

		for(const layer of this) {

			this.container.appendChild(layer.container);
		}

		this.container.insertAdjacentHTML('beforeend', `

			<div class="add-layer">
				<fieldset>
					<legend>Add New Layer</legend>
					<div class="form">

						<label>
							<span>Type</span>
							<select name="position" value="clustermap" required>
								<option value="clustermap">Cluster Map</option>
								<option value="heatmap">Heat Map</option>
								<option value="scattermap">Scatter Map</option>
								<option value="bubblemap">Bubble Map</option>
							</select>
						</label>

						<label>
							<span>&nbsp;</span>
							<button type="button"><i class="fa fa-plus"></i> Add</button>
						</label>
					</div>
				</fieldset>
			</div>
		`);

		this.container.querySelector('.add-layer button[type=button]').on('click', () => {

			const type = this.container.querySelector('.add-layer select').value;

			this.add(new (SpatialMapOptionsLayer.types.get(type))({type}, this));
			this.render();
		});
	}

	get json() {

		const response = [];

		for(const layer of this.values()) {
			response.push(layer.json);
		}

		return response;
	}
}

class SpatialMapOptionsLayer {

	constructor(layer, layers) {

		Object.assign(this, layer);

		this.layers = layers;
	}

	get container() {

		if(this.layerContainer)
			return this.layerContainer;

		const container = this.layerContainer = document.createElement('div');

		container.classList.add('layer');

		container.innerHTML = `
			<fieldset>
				<legend>${this.type.slice(0, 1).toUpperCase() + this.type.slice(1)}</legend>
				<div class="form">
					<label>
						<span>Name</span>
						<input type="text" name="layer_name">
					</label>

					<label>
						<span>Latitude Column</span>
						<select name="latitude"></select>
					</label>

					<label>
						<span>Longitude Column</span>
						<select name="longitude"></select>
					</label>

					<label>
						<button class="delete" type="button">
							<i class="far fa-trash-alt"></i> Delete
						</button>
					</label>
				</div>
			</fieldset>
		`;

		const
			latitude = container.querySelector('select[name=latitude]'),
			longitude = container.querySelector('select[name=longitude]');

		for(const [key, column] of this.layers.stage.page.preview.report.columns) {

			latitude.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			longitude.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		container.querySelector('.delete').on('click', () => {

			container.parentElement && container.parentElement.removeChild(container);
			this.layers.delete(this);
			this.layers.render();
		});

		for(const element of container.querySelectorAll('select, input')) {

			if(this[element.tagName == 'SELECT' ? element.name.concat('Column') : element.name])
				element[element.type == 'checkbox' ? 'checked' : 'value'] = this[element.tagName == 'SELECT' ? element.name.concat('Column') : element.name] ;
		}

		return container;
	}

	get json() {

		const response = {
			type: this.type
		};

		for(const element of this.container.querySelectorAll('select, input')) {

			if(element.type == 'checkbox') {

				response[element.name] = element.checked;
			}
			else if (element.tagName == 'SELECT') {

				response[element.name.concat('Column')] = element.value;
			}
			else {

				response[element.name] = element.type == 'number' || element.type == 'range' ? parseFloat(element.value) : element.value;
			}
		}

		return response;
	}
}

SpatialMapOptionsLayer.types = new Map();

SpatialMapOptionsLayer.types.set('clustermap', class ClusterMapLayer extends SpatialMapOptionsLayer {
});

SpatialMapOptionsLayer.types.set('heatmap', class HeatMapLayer extends SpatialMapOptionsLayer {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = super.container;

		container.querySelector('.delete').parentNode.insertAdjacentHTML('beforebegin', `
			<label>
				<span>Weight Column</span>
				<select name="weight">
					<option value=""></option>
				</select>
			</label>

			<label>
				<span>Radius</span>
				<input type="number" name="radius">
			</label>

			<label class="opacity">
				<span>Opacity <span class="value">${this.opacity || 0.6}</span></span>
				<input type="range" name="opacity" min="0" max="1" step="0.01">
			</label>
		`);

		container.querySelector('.opacity input').on('input', () => {

			container.querySelector('.opacity .value').textContent = container.querySelector('.opacity input').value;
		});

		const weight = container.querySelector('select[name=weight]');

		for(const [key, column] of this.layers.stage.page.preview.report.columns) {

			weight.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		if(this.weightColumn)
			container.querySelector('select[name=weight]').value = this.weightColumn;

		if(this.opacity)
			container.querySelector('input[name=opacity]').value = this.opacity;

		if(this.radius)
			container.querySelector('input[name=radius]').value = this.radius;

		return container;
	}
});

SpatialMapOptionsLayer.types.set('scattermap', class ScatterMapLayer extends SpatialMapOptionsLayer {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = super.container;

		container.querySelector('.delete').parentNode.insertAdjacentHTML('beforebegin', `
			<label>
				<span>Color Column</span>
				<select name="color">
					<option value=""></option>
				</select>
			</label>
		`);

		const color = container.querySelector('select[name=color]');

		for(const [key, column] of this.layers.stage.page.preview.report.columns) {

			color.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		if(this.colorColumn)
			color.value = this.colorColumn;

		return container;
	}
});

SpatialMapOptionsLayer.types.set('bubblemap', class BubbleMapLayer extends SpatialMapOptionsLayer {

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = super.container;

		container.querySelector('.delete').parentNode.insertAdjacentHTML('beforebegin', `
			<label>
				<span>Color Column</span>
				<select name="color">
					<option value=""></option>
				</select>
			</label>

			<label>
				<span>Radius Column</span>
				<select name="radius"></select>
			</label>
		`);

		const
			radius = container.querySelector('select[name=radius]'),
			color = container.querySelector('select[name=color]');

		for(const [key, column] of this.layers.stage.page.preview.report.columns) {

			radius.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			color.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		if(this.radiusColumn)
			radius.value = this.radiusColumn;

		if(this.colorColumn)
			color.value = this.colorColumn;

		return container;
	}
});

VisualizationManager.types = new Map;

VisualizationManager.types.set('table', class TableOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>
								<input type="checkbox" name="hideHeadingsBar">Hide Headings Bar
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideRowSummary">Hide Row Summary
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		this.form = this.visualization.options;



		return container;
	}

	set form(json) {

		for(const element of this.form.querySelectorAll('select, input')) {

			element[element.type == 'checkbox' ? 'checked' : 'value'] = json && json[element.name];

			if(this.readOnly) {

				element.disabled = true;
			}
		}
	}
});

VisualizationManager.types.set('line', class LineOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('scatter', class ScatterOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('bubble', class BubbleOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('bar', class BarOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('dualaxisbar', class DualAxisBarOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('linear', class LinearOptions extends ReportVisualizationLinearOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.classList.add('liner-visualization-options');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Axes <span class="count"></span></h3>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">

						<label>
							<span>
								<input type="checkbox" name="hideHeader"> Hide Header
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend"> Hide Legend
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="showValues"> Show Values
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="showPoints"> Show Points
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideScales"> Hide Scales
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideScaleLines"> Hide Scale Lines
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="dontAnimate"> Don't Animate
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		this.formContainer.axes = new Set();

		this.axes = new LinearAxes(this.visualization.options.axes, this);

		container.querySelector('.configuration-section').appendChild(this.axes.container);

		if(this.visualization.options && this.visualization.options.hideLegend)
			container.querySelector('input[name=hideLegend]').checked = this.visualization.options.hideLegend;

		if(this.visualization.options && this.visualization.options.hideHeader)
			container.querySelector('input[name=hideHeader]').checked = this.visualization.options.hideHeader;

		if(this.visualization.options && this.visualization.options.showValues)
			container.querySelector('input[name=showValues]').checked = this.visualization.options.showValues;

		if(this.visualization.options && this.visualization.options.showPoints)
			container.querySelector('input[name=showPoints]').checked = this.visualization.options.showPoints;

		if(this.visualization.options && this.visualization.options.hideScales)
			container.querySelector('input[name=hideScales]').checked = this.visualization.options.hideScales;

		if(this.visualization.options && this.visualization.options.hideScaleLines)
			container.querySelector('input[name=hideScaleLines]').checked = this.visualization.options.hideScaleLines;

		if(this.visualization.options && this.visualization.options.dontAnimate)
			container.querySelector('input[name=dontAnimate]').checked = this.visualization.options.dontAnimate;

		return container;
	}

	get json() {

		const response = {
			axes: this.axes.json,
			hideHeader: this.formContainer.querySelector('input[name=hideHeader]').checked,
			hideLegend: this.formContainer.querySelector('input[name=hideLegend]').checked,
			showValues: this.formContainer.querySelector('input[name=showValues]').checked,
			showPoints: this.formContainer.querySelector('input[name=showPoints]').checked,
			hideScales: this.formContainer.querySelector('input[name=hideScales]').checked,
			hideScaleLines: this.formContainer.querySelector('input[name=hideScaleLines]').checked,
			dontAnimate: this.formContainer.querySelector('input[name=dontAnimate]').checked,
		};

		return response;
	}
});

VisualizationManager.types.set('stacked', class StackedOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('area', class AreaOptions extends ReportVisualizationLinearOptions {
});

VisualizationManager.types.set('pie', class PieOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>Show</span>
							<select name="showValue">
								<option value="value">Value</option>
								<option value="percentage">Percentage</option>
							</select>
						</label>

						<label>
							<span>
								<input type="checkbox" name="classicPie">Classic Pie
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = this.visualization.options && this.visualization.options[element.name];

		return container;
	}
});

VisualizationManager.types.set('funnel', class FunnelOptions extends ReportVisualizationOptions {
});

VisualizationManager.types.set('spatialmap', class SpatialMapOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Map Layers <span class="count"></span></h3>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform map-options">
						<label>
							<span>Zoom</span>
							<input type="number" step="1" name="zoom" min="1" max="25">
						</label>

						<label>
							<span>Center Latitude</span>
							<input type="number" name="centerLatitude">
						</label>

						<label>
							<span>Center Longitude</span>
							<input type="number" name="centerLongitude">
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>

			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Themes</h3>
				<div class="body">
					<div class="form subform map-themes"></div>
				</div>
			</div>
		`;

		this.layers = new SpatialMapOptionsLayers(this.visualization.options.layers || [], this);

		container.querySelector('.configuration-section').appendChild(this.layers.container);

		const mapOptions = container.querySelector('.map-options');

		if(this.visualization.options) {

			for(const element of mapOptions.querySelectorAll('select, input')) {

				if(!this.visualization.options[element.name])
					continue;

				element[element.type == 'checkbox' ? 'checked' : 'value'] = this.visualization.options[element.name];
			}
		}

		this.themes = new SpatialMapThemes(this.visualization);

		container.querySelector('.map-themes').appendChild(this.themes.container);

		return container;

	}

	get json() {

		const
			mapOptions = this.formContainer.querySelector('.map-options'),
			response = {
				layers: this.layers.json,
				theme: this.themes.selected
			};

		for (const element of mapOptions.querySelectorAll('select, input')) {

			if(element.type == 'checkbox') {

				response[element.name] = element.checked;
			}
			else {

				response[element.name] = element.type == 'number' ? parseFloat(element.value) : element.value;
			}
		}

		return response;
	}
});

VisualizationManager.types.set('cohort', class CohortOptions extends ReportVisualizationOptions {
});

VisualizationManager.types.set('json', class JSONOptions extends ReportVisualizationOptions {
});

VisualizationManager.types.set('bigtext', class BigTextOptions extends ReportVisualizationOptions {

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		let datalist = [];

		for(const [key, column] of this.page.preview.report.columns)
			datalist.push({name: column.name, value: key});

		this.bigReportsColumns = new MultiSelect({datalist: datalist, expand: true, multiple: false});

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label class="axis-column">
							<span>Columns</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		container.querySelector('.axis-column').appendChild(this.bigReportsColumns.container);

		this.bigReportsColumns.value = this.visualization.options && this.visualization.options.column || [];

		for(const element of this.formContainer.querySelectorAll('select, input')) {
			if(element.type != 'radio')
				element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';
		}

		return container;
	}

	get json() {

		const parentJSON = super.json;

		parentJSON.column = this.bigReportsColumns.value[0];

		return parentJSON;
	}
});

VisualizationManager.types.set('livenumber', class LiveNumberOptions extends ReportVisualizationOptions {

	get form() {

		if (this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>Timing Column</span>
							<select name="timingColumn"></select>
						</label>

						<label>
							<span>Value Column</span>
							<select name="valueColumn"></select>
						</label>

						<label>
							<span>Center Offset</span>
							<input type="number" name="centerOffset">
						</label>

						<label>
							<span>Left Offset</span>
							<input type="number" name="leftOffset">
						</label>

						<label>
							<span>Right Offset</span>
							<input type="number" name="rightOffset">
						</label>

						<label>
							<span>Change Prefix</span>
							<input type="text" name="changePrefix">
						</label>

						<label>
							<span>Change Postfix</span>
							<input type="text" name="changePostfix">
						</label>

						<label class="sub-reports">
							<span>Sub-reports</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="invertValues"> Invert Values
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="showGraph"> Show Graph
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="graphParallax"> Graph Parallax
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend"> Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		const datalist = [];

		for(const [index, report] of DataSource.list.entries()) {

			for(const visualisation of report.visualizations) {

				if(visualisation.type == 'livenumber' && visualisation.visualization_id != this.visualization.visualization_id) {

					datalist.push({
						'name': `${visualisation.name} #${visualisation.visualization_id}`,
						'value': visualisation.visualization_id,
						'subtitle': `${report.subtitle && MetaData.categories.has(report.subtitle) ? MetaData.categories.get(report.subtitle).name + ' &rsaquo; ' : ''}${report.name} #${report.query_id}`,
					});
				}
			}
		}

		this.subReports = new MultiSelect({datalist: datalist, expand: true});

		container.querySelector('.form .sub-reports').appendChild(this.subReports.container);

		const
			timingColumn = container.querySelector('select[name=timingColumn]'),
			valueColumn = container.querySelector('select[name=valueColumn]');

		for(const [key, column] of this.page.preview.report.columns) {

			timingColumn.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);

			valueColumn.insertAdjacentHTML('beforeend', `
				<option value="${key}">${column.name}</option>
			`);
		}

		for(const element of this.formContainer.querySelectorAll('select, input')) {

			element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';
		}

		this.subReports.value = (this.visualization.options && this.visualization.options.subReports) || [];

		return container;
	}

	get json() {

		const result = super.json;

		if(this.subReports) {
			result.subReports = this.subReports.value;
		}

		return result;
	}
});

VisualizationManager.types.set('html', class HTMLOptions extends ReportVisualizationOptions {

	get form() {

		if (this.formContainer)
			return this.formContainer;

		const container = this.formContainer = document.createElement('div');

		container.innerHTML = `
			<div class="configuration-section">
				<h3><i class="fas fa-angle-right"></i> Options</h3>
				<div class="body">
					<div class="form subform">
						<label>
							<span>
								<input type="checkbox" name="hideHeader">Hide Header
							</span>
						</label>

						<label>
							<span>
								<input type="checkbox" name="hideLegend">Hide Legend
							</span>
						</label>
					</div>
				</div>
			</div>
		`;

		for(const element of this.formContainer.querySelectorAll('select, input'))
			element[element.type == 'checkbox' ? 'checked' : 'value'] = (this.visualization.options && this.visualization.options[element.name]) || '';

		return container;
	}
});

class ReportTransformations extends Set {

	constructor(visualization, stage) {

		super();

		this.visualization = visualization;
		this.stage = stage;
		this.page = this.stage.page;
	}

	get container () {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('configuration-section', 'transformations');

		container.innerHTML = `
			<h3>
				<i class="fas fa-angle-right"></i> Transformations
				<button id="transformations-preview" title="preview"><i class="fas fa-eye"></i></button>
				<span class="count transformation"></span>
			</h3>
			<div class="body">
				<div class="list"></div>
				<form class="add-transformation">
					<fieldset>
						<legend>Add Transformation</legend>
						<div class="form">

							<label>
								<span>Type</span>
								<select name="type"></select>
							</label>

							<label>
								<span>&nbsp;</span>
								<button type="submit"><i class="fa fa-plus"></i> Add</button>
							</label>
						</div>
					</fieldset>
				</form>
			</div>`;

		const preview = container.querySelector('h3 #transformations-preview');

		preview.removeEventListener('click', ReportTransformations.previewListener);

		preview.on('click', ReportTransformations.previewListener = e => {
			e.stopPropagation();
			this.preview();
		});

		this.container.querySelector('.add-transformation').on('submit', e => this.insert(e));

		return container;
	}

	load() {

		this.process();

		this.render();
	}

	process() {

		this.clear();

		if(!this.visualization.options)
			return;

		for(const transformation of this.visualization.options.transformations || []) {

			if(ReportTransformation.types.has(transformation.type))
				this.add(new (ReportTransformation.types.get(transformation.type))(transformation, this.stage));
		}
	}

	render() {

		const transformationsList = this.container.querySelector('.list');

		transformationsList.textContent = null;

		for(const transformation of this)
			transformationsList.appendChild(transformation.container);

		if(!this.size)
			transformationsList.innerHTML = '<div class="NA">No transformation added yet!</div>';

		const select = this.container.querySelector('.add-transformation select');

		for(const [key, type] of ReportTransformation.types)
			select.insertAdjacentHTML('beforeend', `<option value="${key}">${key}</option>`);

		this.container.querySelector('h3 .count').innerHTML = `
			${this.size ? this.size + ' transformation' + (this.size == 1 ? ' applied' : 's applied') : ''}
		`;
	}

	get json() {

		const response = [];

		for(const transformation of this)
			response.push(transformation.json);

		return response.filter(a => a);
	}

	preview() {

		const report = DataSource.list.get(this.stage.report.query_id);

		if(!report)
			return;

		if(!report.transformationVisualization) {

			const visualization = {
				visualization_id: Math.floor(Math.random() * 1000) + 1000,
				name: 'Table',
				type: 'table',
				options: {
					hideLegend: this.visualization.options.hideLegend
				},
			};

			report.visualizations.push(visualization);
			report.transformationVisualization = visualization;
		}

		report.transformationVisualization.options.transformations = this.json;

		this.page.preview.load({
			query_id: this.stage.report.query_id,
			visualization: {
				id: report.transformationVisualization.visualization_id
			},
		});
	}

	clear() {

		super.clear();
		this.container.querySelector('.list').innerHTML = '<div class="NA">Loading&hellip;</div>';
	}

	insert(e) {

		e.preventDefault();

		const type = this.container.querySelector('.add-transformation select').value;

		this.add(new (ReportTransformation.types.get(type))({type}, this.stage));

		this.render();
		this.preview();
	}
}

class ReportTransformation {

	constructor(transformation, stage) {

		this.stage = stage;
		this.page = this.stage.page;

		Object.assign(this, transformation);

		if(!ReportTransformation.types.has(this.type))
			throw new Page.exception(`Invalid transformation type ${this.type}!`);
	}
}

ReportTransformation.types = new Map;

ReportTransformation.types.set('pivot', class ReportTransformationPivot extends ReportTransformation {

	get name() {
		return 'Pivot Table';
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		if(!this.page.preview.report.originalResponse)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('fieldset'),
			rows = document.createElement('div'),
			columns = document.createElement('div'),
			values = document.createElement('div');

		container.classList.add('subform', 'form');

		rows.classList.add('rows');
		columns.classList.add('columns');
		values.classList.add('values');

		rows.innerHTML = `<h4>Rows</h4>`;
		columns.innerHTML = `<h4>Columns</h4>`;
		values.innerHTML = `<h4>Values</h4>`;

		for(const row of this.rows || [])
			rows.appendChild(this.row(row));

		const addRow = document.createElement('button');

		addRow.type = 'button';
		addRow.innerHTML = `<i class="fa fa-plus"></i> Add New Row`;
		addRow.on('click', () => rows.insertBefore(this.row(), addRow));

		rows.appendChild(addRow);

		for(const column of this.columns || [])
			columns.appendChild(this.column(column));

		const addColumn = document.createElement('button');

		addColumn.type = 'button';
		addColumn.innerHTML = `<i class="fa fa-plus"></i> Add New Column`;
		addColumn.on('click', () => columns.insertBefore(this.column(), addColumn));

		columns.appendChild(addColumn);

		for(const value of this.values || [])
			values.appendChild(this.value(value));

		const addValue = document.createElement('button');

		addValue.type = 'button';
		addValue.innerHTML = `<i class="fa fa-plus"></i> Add New Value`;
		addValue.on('click', () => values.insertBefore(this.value(), addValue));

		values.appendChild(addValue);

		container.innerHTML	= `
			<legend>${this.name}</legend>
			<div class="transformation pivot"></div>
		`;

		const transformation = container.querySelector('.transformation');

		transformation.appendChild(rows);
		transformation.appendChild(columns);
		transformation.appendChild(values);

		return container;
	}

	get json() {

		const response = {
			type: 'pivot',
			rows: [],
			columns: [],
			values: [],
		};

		for(const row of this.container.querySelectorAll('.row')) {
			response.rows.push({
				column: row.querySelector('*[name=column]').value,
			});
		}

		for(const column of this.container.querySelectorAll('.column')) {
			response.columns.push({
				column: column.querySelector('*[name=column]').value,
			});
		}

		for(const value of this.container.querySelectorAll('.value')) {
			response.values.push({
				column: value.querySelector('*[name=column]').value,
				function: value.querySelector('select[name=function]').value,
				name: value.querySelector('input[name=name]').value
			});
		}

		if(!response.rows.length && !response.columns.length && !response.values.length)
			return null;

		return response;
	}

	row(row = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'row');

		container.innerHTML = `<select name="column"></select>`;

		const select = container.querySelector('select');

		for(const column in this.page.preview.report.originalResponse.data[0])
			select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

		select.value = row.column;

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', e => {
			e.stopPropagation();
			container.remove();
		});

		return container;
	}

	column(column = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'column');

		container.innerHTML = `<select name="column"></select>`;

		const select = container.querySelector('select');

		for(const column in this.page.preview.report.originalResponse.data[0])
			select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

		select.value = column.column;

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', () => container.remove());

		return container;
	}

	value(value = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'value');

		container.innerHTML = `<select name="column"></select>`;

		const select = container.querySelector('select');

		for(const column in this.page.preview.report.originalResponse.data[0])
			select.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

		select.value = value.column;

		container.insertAdjacentHTML('beforeend',`
			<select name="function">
				<option value="sum">Sum</option>
				<option value="count">Count</option>
				<option value="distinctcount">Distinct Count</option>
				<option value="values">Values</option>
				<option value="distinctvalues">Distinct Values</option>
				<option value="max">Max</option>
				<option value="min">Min</option>
				<option value="average">Average</option>
			</select>
			<input type="text" name="name" value="${value.name || ''}" placeholder="Name">
			<button type="button"><i class="far fa-trash-alt"></i></button>
		`);

		if(value.function)
			container.querySelector('select[name=function]').value = value.function;

		container.querySelector('button').on('click', () => container.remove());

		return container;
	}
});

ReportTransformation.types.set('filters', class ReportTransformationFilters extends ReportTransformation {

	get name() {
		return 'Filters';
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		if(!this.page.preview.report.originalResponse)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('fieldset'),
			filters = document.createElement('div');

		container.classList.add('subform', 'form');

		filters.classList.add('filters');

		for(const filter of this.filters || [])
			filters.appendChild(this.filter(filter));

		const addFilter = document.createElement('button');

		addFilter.type = 'button';
		addFilter.innerHTML = `<i class="fa fa-plus"></i> Add New Filter`;
		addFilter.on('click', () => filters.insertBefore(this.filter(), addFilter));

		filters.appendChild(addFilter);

		container.innerHTML	= `
			<legend>${this.name}</legend>
			<div class="transformation filters"></div>
		`;

		container.querySelector('.transformation').appendChild(filters);

		return container;
	}

	get json() {

		const response = {
			type: 'filters',
			filters: [],
		};

		for(const filter of this.container.querySelectorAll('.filter')) {
			response.filters.push({
				column: filter.querySelector('select[name=column]').value,
				function: filter.querySelector('select[name=function]').value,
				value: filter.querySelector('input[name=value]').value,
			});
		}

		if(!response.filters.length)
			return null;

		return response;
	}

	filter(filter = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'filter');

		container.innerHTML = `
			<select name="column"></select>
			<select name="function"></select>
			<input type="text" name="value">
		`;

		const
			columnSelect = container.querySelector('select[name=column]'),
			functionSelect = container.querySelector('select[name=function]'),
			valueInput = container.querySelector('input[name=value]');

		for(const column in this.page.preview.report.originalResponse.data[0])
			columnSelect.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

		columnSelect.value = filter.column;

		for(const filter of DataSourceColumnFilter.types)
			functionSelect.insertAdjacentHTML('beforeend', `<option value="${filter.slug}">${filter.name}</option>`);

		functionSelect.value = filter.function;

		valueInput.value = filter.value || '';

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', e => {
			e.stopPropagation();
			container.remove();
		});

		return container;
	}
});

ReportTransformation.types.set('stream', class ReportTransformationFilters extends ReportTransformation {

	get name() {
		return 'Stream';
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		if(!this.page.preview.report.originalResponse)
			return this.containerElement;

		const
			container = this.containerElement = document.createElement('fieldset'),
			joins = document.createElement('div'),
			columns = document.createElement('div'),
			reports = [];

		container.classList.add('subform', 'form');

		joins.classList.add('joins');
		columns.classList.add('columns');

		joins.innerHTML = `<h4>Join On</h4>`;
		columns.innerHTML = `<h4>Columns</h4>`;

		for(const join of this.joins || [])
			joins.appendChild(this.join(join));

		const addJoin = document.createElement('button');

		addJoin.type = 'button';
		addJoin.innerHTML = `<i class="fa fa-plus"></i> Add New Join`;
		addJoin.on('click', () => joins.insertBefore(this.join(), addJoin));

		joins.appendChild(addJoin);

		for(const column of this.columns || [])
			columns.appendChild(this.column(column));

		const addColumn = document.createElement('button');

		addColumn.type = 'button';
		addColumn.innerHTML = `<i class="fa fa-plus"></i> Add New Column`;
		addColumn.on('click', () => columns.insertBefore(this.column(), addColumn));

		columns.appendChild(addColumn);

		container.innerHTML	= `
			<legend>${this.name}</legend>
			<div class="transformation stream">
				<div class="visualization">
					<h4>Columns</h4>
				</div>
			</div>
		`;

		const
			transformation = container.querySelector('.transformation'),
			datalist = [];

		for(const [index, report] of DataSource.list.entries()) {

			for(const visualisation of report.visualizations) {

				if(visualisation.visualization_id != this.stage.visualization.visualization_id) {

					datalist.push({
						'name': visualisation.name,
						'value': visualisation.visualization_id,
						'subtitle': `${report.name} #${report.query_id}`,
					});
				}
			}
		}

		this.visualizations = new MultiSelect({datalist: datalist, multiple: false});

		this.visualizations.value = this.visualization_id;

		transformation.querySelector('.visualization').appendChild(this.visualizations.container);
		transformation.appendChild(joins);
		transformation.appendChild(columns);

		return container;
	}

	get json() {

		const response = {
			type: 'stream',
			visualization_id: this.visualizations.value[0],
			joins: [],
			columns: [],
		};

		for(const join of this.container.querySelectorAll('.join')) {
			response.joins.push({
				sourceColumn: join.querySelector('select[name=sourceColumn]').value,
				function: join.querySelector('select[name=function]').value,
				streamColumn: join.querySelector('input[name=streamColumn]').value,
			});
		}

		for(const column of this.container.querySelectorAll('.column')) {
			response.columns.push({
				column: column.querySelector('input[name=column]').value,
				function: column.querySelector('select[name=function]').value,
				name: column.querySelector('input[name=name]').value,
			});
		}

		if(!response.columns.length)
			return null;

		return response;
	}

	join(join = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'join');

		container.innerHTML = `
			<select name="sourceColumn"></select>
			<select name="function"></select>
			<input type="text" name="streamColumn" placeholder="Stream Column">
		`;

		const
			sourceColumnSelect = container.querySelector('select[name=sourceColumn]'),
			functionSelect = container.querySelector('select[name=function]'),
			streamColumnInput = container.querySelector('input[name=streamColumn]');

		for(const column in this.page.preview.report.originalResponse.data[0])
			sourceColumnSelect.insertAdjacentHTML('beforeend', `<option value="${column}">${column}</option>`);

		sourceColumnSelect.value = join.sourceColumn;

		for(const filter of DataSourceColumnFilter.types)
			functionSelect.insertAdjacentHTML('beforeend', `<option value="${filter.slug}">${filter.name}</option>`);

		functionSelect.value = join.function;

		streamColumnInput.value = join.streamColumn || '';

		container.insertAdjacentHTML('beforeend',`<button type="button"><i class="far fa-trash-alt"></i></button>`);

		container.querySelector('button').on('click', e => {
			e.stopPropagation();
			container.remove();
		});

		return container;
	}

	column(column = {}) {

		const container = document.createElement('div');

		container.classList.add('form-row', 'column');

		container.insertAdjacentHTML('beforeend',`
			<input type="text" name="column" value="${column.column || ''}" placeholder="Column">
			<select name="function">
				<option value="sum">Sum</option>
				<option value="count">Count</option>
				<option value="distinctcount">Distinct Count</option>
				<option value="values">Values</option>
				<option value="distinctvalues">Distinct Values</option>
				<option value="max">Max</option>
				<option value="min">Min</option>
				<option value="average">Average</option>
			</select>
			<input type="text" name="name" value="${column.name || ''}" placeholder="Name">
			<button type="button"><i class="far fa-trash-alt"></i></button>
		`);

		if(column.function)
			container.querySelector('select[name=function]').value = column.function;

		container.querySelector('button').on('click', () => container.remove());

		return container;
	}
});

class ReportVisualizationDashboards extends Set {

	constructor(stage) {

		super();

		this.stage = stage;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('configuration-section', 'dashboards');

		container.innerHTML = `
			<h3><i class="fas fa-angle-right"></i> Dashboards <span class="count"></span></h3>
			<div class="body">
				<div class="list"></div>
				<form class="add-dashboard">
					<fieldset>
						<legend>Add To Dashboard</legend>
						<div class="form">

							<label class="dashboard_id">
								<span>Dashboard</span>
							</label>

							<label>
								<span>Position</span>
								<input name="position" type="number">
							</label>

							<label>
								<span>&nbsp;</span>
								<button type="submit"><i class="fa fa-plus"></i> Add</button>
							</label>

							<label class="create-new">
								<span>&nbsp;</span>
								<button type="button" disabled><i class="fa fa-plus"></i> Create New</button>
							</label>
						</div>
					</fieldset>
				</form>
			</div>
		`;

		if(user.privileges.has('dashboard.insert')) {

			this.container.querySelector('.create-new button').disabled = false;

			this.container.querySelector('.create-new').on('click', () => {
				window.open('/dashboards-manager/add');
			})
		}
		this.container.querySelector('form').on('submit', e => ReportVisualizationDashboards.insert(e, this.stage));

		this.dashboardMultiSelect = new MultiSelect({multiple: false, dropDownPosition: 'top'});
		this.container.querySelector('.add-dashboard .dashboard_id').appendChild(this.dashboardMultiSelect.container);

		return container;
	}

	async load(options) {

		await this.fetch(options);

		this.process();

		this.render();
	}

	async fetch({force = false} = {}) {

		if(ReportVisualizationDashboards.response && !force)
			return this.response = ReportVisualizationDashboards.response;

		ReportVisualizationDashboards.response = this.response = await API.call('dashboards/list');
	}

	process() {

		this.response = new Map(this.response.map(d => [d.id, d]));

		this.clear();

		for(const dashboard of this.response.values()) {

			if(!dashboard.format)
				dashboard.format = {};

			for(const report of dashboard.visualizations || []) {

				if(this.stage.visualization.visualization_id == report.visualization_id)
					this.add(new ReportVisualizationDashboard(dashboard, this.stage));
			}
		}
	}

	render() {

		const dashboardsList = this.container.querySelector('.list');

		dashboardsList.textContent = null;

		for(const dashboard of this)
			dashboardsList.appendChild(dashboard.form);

		if(!this.size)
			dashboardsList.innerHTML = '<div class="NA">No dashboard added yet!</div>';

		this.container.querySelector('h3 .count').innerHTML = `${this.size ? 'Added to ' + this.size + ' dashboard' + (this.size == 1 ? '' : 's') : ''}` ;

		const datalist = [];

		if(this.response) {

			for(const dashboard of this.response.values()) {

				if(!dashboard.editable)
					continue;

				const
					parents = [],
					seen = [];

				let parent = dashboard.parent;

				while(parent) {

					if(!this.response.has(parent) || seen.includes(parent))
						break;

					const parentDashboard = this.response.get(parent);

					parents.push(`${parentDashboard.name} #${parentDashboard.id}`);
					seen.push(parentDashboard.id);

					parent = parentDashboard.parent;
				}

				datalist.push({
					value: dashboard.id,
					name: dashboard.name,
					subtitle: parents.reverse().join(' &rsaquo; '),
				});
			}
		}

		this.dashboardMultiSelect.datalist = datalist;
		this.dashboardMultiSelect.render();
	}

	clear() {

		super.clear();
		this.container.querySelector('.list').innerHTML = '<div class="NA">Loading&hellip;</div>';
	}

	static async insert(e, stage) {

		e.preventDefault();

		const
			form = stage.dashboards.container.querySelector('.add-dashboard'),
			dashboard_id = parseInt(stage.dashboards.dashboardMultiSelect.value[0]);

		if(Array.from(stage.dashboards).some(d => d.id == dashboard_id)) {

			new SnackBar({
				message: 'Visualization Already Added',
				subtitle: `${stage.dashboards.response.get(dashboard_id).name} #${dashboard_id}`,
				type: 'warning',
			});

			return;
		}

		const
			option = {
				method: 'POST',
			},
			parameters = {
				dashboard_id,
				visualization_id: stage.visualization.visualization_id,
				format: JSON.stringify({position: parseInt(form.position.value)})
			};

		try {

			await API.call('reports/dashboard/insert', parameters, option);

			await stage.dashboards.load({force: true});

			new SnackBar({
				message: 'Visualization Added to Dahsboard',
				subtitle: `${stage.dashboards.response.get(dashboard_id).name} #${dashboard_id}`,
				icon: 'fas fa-plus',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}
}

class ReportVisualizationDashboard {

	constructor(dashboard, stage) {

		this.stage = stage;

		for(const key in dashboard)
			this[key] = dashboard[key];

		[this.visualization] = this.visualizations.filter(v => v.visualization_id == this.stage.visualization.visualization_id);
	}

	get form() {

		if(this.formContainer)
			return this.formContainer;

		const form = this.formContainer = document.createElement('form');

		form.classList.add('subform', 'form');

		form.innerHTML = `
			<label class="dashboard_id">
				<span>Dashboard</span>
			</label>

			<label>
				<span>Position</span>
				<input type="number" name="position" value="${this.visualization.format.position || ''}">
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="submit"><i class="far fa-save"></i> Save</button>
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="button" class="delete"><i class="far fa-trash-alt"></i></button>
			</label>

			<label>
				<span>&nbsp;</span>
				<button type="button" class="view-dashboard disabled"><i class="fas fa-external-link-alt"></i></button>
			</label>
		`;

		const datalist = [];

		if(this.stage.dashboards.response) {

			for(const dashboard of this.stage.dashboards.response.values()) {

				if(!dashboard.editable)
					continue;

				const
					parents = [],
					seen = [];

				let parent = dashboard.parent;

				while(parent) {

					if(!this.stage.dashboards.response.has(parent) || seen.includes(parent))
						break;

					const parentDashboard = this.stage.dashboards.response.get(parent);

					parents.push(`${parentDashboard.name} #${parentDashboard.id}`);
					seen.push(parentDashboard.id);

					parent = parentDashboard.parent;
				}

				datalist.push({
					value: dashboard.id,
					name: dashboard.name,
					subtitle: parents.reverse().join(' &rsaquo; '),
				});
			}
		}

		this.dashboardMultiSelect = new MultiSelect({datalist, multiple: false, dropDownPosition: 'top'});

		this.dashboardMultiSelect.value = this.visualization.dashboard_id;

		form.querySelector('.dashboard_id').appendChild(this.dashboardMultiSelect.container);

		if(this.dashboardMultiSelect.value.length) {

			const externalLink = form.querySelector('.view-dashboard');

			externalLink.classList.disabled = false;
			externalLink.on('click', () => window.open('/dashboard/' + this.dashboardMultiSelect.value[0]));
		}

		form.querySelector('.delete').on('click', () => this.delete());

		form.on('submit', async e => this.update(e))

		return form;
	}

	async delete() {

		if(!confirm('Are you sure?'))
			return;

		const
			option = {
				method: 'POST',
			},
			parameters = {
				id: this.visualization.id,
			};

		try {

			await API.call('reports/dashboard/delete', parameters, option);

			await this.stage.dashboards.load({force: true});

			new SnackBar({
				message: 'Dashboard Deleted',
				subtitle: `${this.stage.dashboards.response.get(this.visualization.dashboard_id).name} #${this.visualization.dashboard_id}`,
				icon: 'far fa-trash-alt',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}

	async update(e) {

		e.preventDefault();

		if(!this.dashboardMultiSelect.value[0]) {

			throw new Page.exception('Dashboard cannot be null');
		}

		this.visualization.format.position = parseInt(this.form.position.value);

		const
			option = {
				method: 'POST',
			},
			parameters = {
				id: this.visualization.id,
				dashboard_id: this.dashboardMultiSelect.value[0],
				visualization_id: this.visualization.visualization_id,
				format: JSON.stringify(this.visualization.format)
			};

		try {

			await API.call('reports/dashboard/update', parameters, option);

			await this.stage.dashboards.load({force: true});

			new SnackBar({
				message: 'Dashboard Saved',
				subtitle: `${this.stage.dashboards.response.get(this.visualization.dashboard_id).name} #${this.visualization.dashboard_id}`,
				icon: 'far fa-save',
			});

		} catch(e) {

			new SnackBar({
				message: 'Request Failed',
				subtitle: e.message,
				type: 'error',
			});

			throw e;
		}
	}
}

class ReportVisualizationFilters extends Map {

	constructor(visualization, stage) {

		super();

		this.visualization = visualization;
		this.stage = stage;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');
		container.classList.add('configuration-section', 'filters');

		container.innerHTML = `
			<h3><i class="fas fa-angle-right"></i> Filters <span class="count"></span></h3>
			<div class="body">
				<div class="list" class="list"></div>
				<form class="add-filter">
					<fieldset>
						<legend>Add Filter</legend>

						<div class="form">

							<label>
								<span>Name</span>
								<select></select>
							</label>

							<label>
								<span>&nbsp;</span>
								<button type="submit"><i class="fa fa-plus"></i> Add</button>
							</label>
						</div>
					</fieldset>
				</form>
			</div>
		`;

		this.container.querySelector('.add-filter').on('submit', (e) => {

			e.preventDefault();

			const
				filterOptions = this.container.querySelector('.add-filter select'),
				[filter] = this.stage.report.filters.filter(x => x.filter_id == parseInt(filterOptions.value));

			this.set(filter.filter_id, new ReportVisualizationFilter(
				{filter_id: filter.filter_id, default_value: ''},
				filter,
				this,
			));

			this.render();
		});

		return container;
	}

	load() {

		this.process();

		this.render();
	}

	process() {

		this.clear();

		if(!this.visualization.options)
			return;

		for(const filter of this.visualization.options.filters || []) {

			const [filterObj] = this.stage.report.filters.filter(x => x.filter_id == filter.filter_id);

			if(!filterObj)
				continue;

			this.set(filter.filter_id, new ReportVisualizationFilter(filter, filterObj, this));
		}
	}

	render() {

		const filterList = this.container.querySelector('.list');

		filterList.textContent = null;

		if(!this.stage.report.filters.length) {

			filterList.innerHTML = '<div class="NA">No filters found!</div>';
			this.container.querySelector('.add-filter').classList.add('hidden');

			return;
		}

		this.container.querySelector('.add-filter').classList.remove('hidden');

		for(const filter of this.values())
			filterList.appendChild(filter.container);

		if(!this.size)
			filterList.innerHTML = '<div class="NA">No filters added yet!</div>';

		const optionsList = this.container.querySelector('.add-filter select');

		optionsList.textContent = null;

		for(const filter of this.stage.report.filters) {

			if(!this.has(filter.filter_id))
				optionsList.insertAdjacentHTML('beforeend', `<option value="${filter.filter_id}">${filter.name}</option>`);
		}

		this.container.querySelector('.add-filter').classList.toggle('hidden', this.size == this.stage.report.filters.length);

		this.container.querySelector('h3 .count').innerHTML = `
			${this.size ? this.size + ' filter' + (this.size == 1 ? ' added' : 's added') : ''}
		`;
	}

	get json() {

		const response = [];

		for(const filter of this.values()) {

			response.push(filter.json);
		}

		return response;
	}

	clear() {

		super.clear();
		this.container.querySelector('.list').innerHTML = `<div class="NA">Loading&hellip;</div>`;
	}
}

class ReportVisualizationFilter {

	constructor(filter, reportFilter, filters) {

		this.reportVisualizationFilters = filters;
		this.reportFilter = reportFilter;

		Object.assign(this, filter);
	}

	get container() {

		if (this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('fieldset');

		container.innerHTML = `
			<legend>${this.reportFilter.name}</legend>

			<div class="form">
				<label>
					<span>Default Value</span>
					<input type="text" placeholder="${this.reportFilter.default_value}" value="${this.default_value || ''}">
				</label>

				<label>

					<span>&nbsp;</span>
					<button class="delete" title="Delete"><i class="far fa-trash-alt"></i></button>
				</label>
			</div>
		`;

		container.querySelector('.delete').on('click', () => {

			this.container.parentElement.removeChild(container);

			this.reportVisualizationFilters.delete(this.filter_id);
			this.reportVisualizationFilters.render();
		});

		return container;
	}

	get json() {

		return {
			default_value: this.container.querySelector('input').value,
			filter_id: this.filter_id
		};
	}
}