import { Page, API, Sections, Storage } from '/js/main-modules.js';
import { Roles } from '/js/settings/roles.js';

Page.class = class Settings extends Page {

	constructor() {

		super();

		this.navigationBar = new NavigationBar(this);

		this.modules = new Set([
			new Roles(this),
		]);

		this.render();
	}

	render() {

		this.container.appendChild(this.navigationBar.container);
	}
}

class NavigationBar {

	constructor(page) {

		this.page = page;
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = document.createElement('nav');

		for(const module_ of this.page.modules) {

			const item = document.createElement('a');

			item.textContent = module_.name;

			item.on('click', () => {

				if(container.querySelector('a.selected'))
					container.querySelector('a.selected').classList.remove('selected');

				item.classList.add('selected');

				if(this.page.container.querySelector('.settings-module'))
					this.page.container.querySelector('.settings-module').remove();

				this.page.container.appendChild(module_.container);
			});

			container.appendChild(item);
		}

		return container;
	}
}