import * as AllSpark from '/js/main-modules.js';
import { Roles } from '/js/settings/roles.js';

AllSpark.Page.class = class Settings extends AllSpark.Page {

	constructor() {

		super();

		this.navigationBar = new NavigationBar(this);

		this.modules = new Map([
			['roles', new Roles(this)],
		]);

		this.render();

		window.on('popstate', e => this.popstate());
	}

	render() {

		this.container.appendChild(this.navigationBar.container);

		this.popstate();
	}

	popstate() {

		let what = window.location.pathname.split('/')[2];

		if(!this.modules.has(what)) 
			what = Array.from(this.modules.keys())[0];

		this.page.container.appendChild(this.modules.get(what).container);

		AllSpark.Sections.show(module_.container.querySelector('section.section').id);
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

		for(const [name, module_] of this.page.modules) {

			const item = document.createElement('a');

			item.textContent = module_.name;

			item.on('click', () => {

				const selected = container.querySelector('a.selected');

				if(selected)
					selected.classList.remove('selected');

				item.classList.add('selected');

				if(this.page.container.querySelector('.settings-module'))
					this.page.container.querySelector('.settings-module').remove();

				this.page.container.appendChild(module_.container);

				AllSpark.Sections.show(module_.container.querySelector('section.section').id);

				if(selected && selected != item)
					window.history.pushState(null, '', '/settings-new/' + name);

				else 
					window.history.replaceState(null, '', '/settings-new/' + name);
			});

			container.appendChild(item);
		}

		return container;
	}
}