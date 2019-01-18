class Documentations extends Page {

	constructor() {

		super();

		this.list = new Map;

		this.setup();

		this.load();
	}

	setup() {

		this.container.appendChild(this.section);
	}

	async load() {

		this.list.clear();

		const response = await API.call('documentation/getEnitreDocumentation');

		for(const data of response) {
			this.list.set(data.id, new Documentation(data, this));
		}

		this.tree = this.constructTree(this.list);

		this.render();
	}

	render() {

		const list = this.section.querySelector('.container .list');

		for(const x of this.tree) {
			list.appendChild(this.constructMenu(x, [x.id]));
		}
	}

	constructMenu(arr, index) {

		if(!arr.childs.length) {
			arr.index = index.join('.');
			return arr.menuBar;
		}

		arr.childs.sort((a,b) => a.chapter - b.chapter);

		arr.index = index.join('.');

		const div = document.createElement('div');
		div.classList.add('children');

		for(const x of arr.childs) {

			index.push(x.chapter)

			arr.container.appendChild(x.container);

			div.appendChild(this.constructMenu(x, index));

			index.pop();
		}

		arr.menuBar.appendChild(div);

		return arr.menuBar;
	}

	constructTree(response) {

		const dataMap = new Map;

		for(const data of response.values()) {

			const parent = data.parent || 'root';

			if(!dataMap.has(parent)) {
				dataMap.set(parent, []);
			}

			dataMap.get(parent).push(data);
		}

		for(const [key, value] of dataMap) {

		    for(const _val of value) {
				_val.childs = dataMap.get(_val.id) || [];
			}
		}

		return dataMap.get('root');
	}

	get section() {

		if(this.sectionElement) {
			return this.sectionElement;
		}

		const container = this.sectionElement = document.createElement('section');

		container.innerHTML = `
			<h1>Kato Documentation</h1>
			<div class="container">
				<div class="list"></div>
				<div class="content"></div>
			</div>
		`;

		return container;
	}
}

Page.class = Documentations;

class Documentation {

	constructor(dox, page) {

		Object.assign(this, dox);

		this.page = page;
	}

	get menuBar() {

		if(this.menuBarElement) {
			return this.menuBarElement;
		}

		const container = this.menuBarElement = document.createElement('article');

		container.innerHTML = `
			<span class="index"></span>
		`;

		container.on('click', (e) => {

			e.stopPropagation();

			const content = this.page.container.querySelector('.container .content');
			content.textContent = null;

			content.appendChild(this.showValue(this.page.list.get(this.id)));
		});

		return container;
	}

	showValue(arr) {

		arr.container.querySelector('h3').innerHTML = `${arr.index}</span> <a>${arr.heading} </a>`;

		if(!arr.childs.length) {
			return arr.container
		}

		for(const x of arr.childs) {

			x.container.querySelector('h3').innerHTML = `${x.index}</span> <a>${x.heading} </a>`;

			arr.container.appendChild(x.container);
			this.showValue(x);
		}

		return arr.container;
	}

	set index(text) {

		this.menuBar.querySelector('.index').innerHTML = `<span class="id">${text}</span> <a>${this.heading}</a>`
	}

	get index() {

		return this.menuBar.querySelector('.index .id').textContent;
	}

	get container() {

		if(this.containerElement) {
			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('div');
		container.classList.add('documentation');

		container.innerHTML = `
			<h3></h3>
			<p>${this.body || '<span class="NA">No content added.</span>'}</p>
		`;

		return container;
	}
}
