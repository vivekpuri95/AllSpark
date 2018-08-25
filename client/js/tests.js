Page.class = class Tests extends Page {

	constructor() {

		super();

		this.tests = new Set;

		this.container.querySelector('#list .toolbar #run').on('click', () => this.run());

		this.render(tests, this.container.querySelector('#list #tests'));

		Sections.show('list');
	}

	render(section, container, key = null) {

		if(section.prototype instanceof Test) {

			const test = new section(key);

			this.tests.add(test);
			container.appendChild(test.container);

			return;
		}

		const subContainer = document.createElement('section');

		for(const key in section) {

			if(!(section[key].prototype instanceof Test))
				subContainer.insertAdjacentHTML('beforeend', `<h2>${key}</h2>`);

			this.render(section[key], subContainer, key);
		}

		container.appendChild(subContainer);
	}

	async run() {

		for(const test of this.tests)
			await test.reset();

		for(const test of this.tests)
			await test.run();
	}
}

class Test {

	constructor(name) {

		this.name = name;
	}

	assert(condition) {

		if(!condition)
			throw new Test.exception();
	}

	get container() {

		if(this.containerElement)
			return this.containerElement;

		const container = this.containerElement = document.createElement('div');

		container.classList.add('test');

		container.on('dblclick', () => this.run());
		container.on('click', () => this.show());

		container.textContent = this.name;

		return container;
	}

	async run() {

		this.container.classList.remove('failed', 'passed');
		this.container.classList.add('running');

		this.failed = false;

		try {
			await this.execute();
		}
		catch(e) {
			this.failed = e;
		}

		this.container.classList.remove('running');
		this.container.classList.add(this.failed ? 'failed' : 'passed');
	}

	show() {

		if(!this.failed)
			return;

		if(!this.dialogBox)
			this.dialogBox = new DialogBox();

		this.dialogBox.heading = this.name;
		this.dialogBox.body.classList.add('test-description');
		this.dialogBox.body.innerHTML = `<code>${JSON.stringify(this.failed.message, 0, 1)}</code>`;

		this.dialogBox.show();
	}

	reset() {

		this.container.classList.remove('passed', 'failed', 'executing');
	}
}

Test.exception = class extends Page.exception {}

const tests = {

	Requests: {

		AJAX: class RequestsAJAX extends Test {

			async execute() {

				this.assert(await AJAX.call('data:text/plain;charset=utf-8;base64,YQ==') == 'a')
			}
		},

		API: class RequestsAJAX extends Test {

			async execute() {

				this.assert((await API.call('tests/test') == 'a'))
			}
		},
	},

	Storage: {

		Storage: {

			SetGet: class StorageStorageSetGet extends Test {

				async execute() {

					await Storage.delete('test');

					await Storage.set('test', 'a');

					this.assert(await Storage.get('test') == 'a');

					await Storage.delete('test');
				}
			},

			Delete: class StorageStorageDelete extends Test {

				async execute() {

					await Storage.set('test', 'a');

					await Storage.delete('test');

					this.assert(await Storage.get('test') != 'a')
				}
			},

			Has: class StorageStorageHas extends Test {

				async execute() {

					await Storage.delete('test');

					await Storage.set('test', 'a');

					this.assert(await Storage.has('test'));

					await Storage.delete('test');
				}
			},
		},

		IndexedDb: {

			SetGet: class StorageIndexedDbSetGet extends Test {

				async execute() {

					await IndexedDb.instance.delete('test');

					await IndexedDb.instance.set('test', 'a');

					this.assert(await IndexedDb.instance.get('test') == 'a');

					await IndexedDb.instance.delete('test');
				}
			},

			Delete: class StorageIndexedDbDelete extends Test {

				async execute() {

					await IndexedDb.instance.set('test', 'a');

					await IndexedDb.instance.delete('test');

					this.assert(await IndexedDb.instance.get('test') != 'a')
				}
			},

			Has: class StorageIndexedDbHas extends Test {

				async execute() {

					await IndexedDb.instance.delete('test');

					await IndexedDb.instance.set('test', 'a');

					this.assert(await IndexedDb.instance.has('test'));

					await IndexedDb.instance.delete('test');
				}
			},
		},

		Cookies: {

			SetGet: class StorageCookiesSetGet extends Test {

				async execute() {

					Cookies.set('test', 'a');

					this.assert(Cookies.get('test') == 'a');

					Cookies.set('test', '');
				}
			},

			Has: class StorageCookiesHas extends Test {

				async execute() {

					Cookies.set('test', 'a');

					this.assert(Cookies.has('test'));

					Cookies.set('test', '');
				}
			},
		},
	},

	CodeEditor: {

		Construction: class CodeEditorConstruction extends Test {

			async execute() {

				new CodeEditor();
			}
		},

		SetGetValue: class CodeEditorSetGetValue extends Test {

			async execute() {

				const editor = new CodeEditor();

				editor.container;

				editor.value = 'a';

				this.assert(editor.value == 'a')
			}
		},
	},

	DialogBox: {

		ShowHide: class DialogBoxShowHide extends Test {

			async execute() {

				DialogBox.container = document.createElement('div');

				const dialogBox = new DialogBox();

				dialogBox.show();
				dialogBox.hide();

				DialogBox.container = document.querySelector('main');
			}
		},

		SetHeadingBody: class DialogBoxSetHeadingBody extends Test {

			async execute() {

				DialogBox.container = document.createElement('div');

				const dialogBox = new DialogBox();

				dialogBox.heading = 'a';
				dialogBox.body.textContent = 'a';

				dialogBox.show();
				dialogBox.hide();

				DialogBox.container = document.querySelector('main');
			}
		},
	},

	SnackBar: {

		ShowHide: class SnackBarShowHide extends Test {

			async execute() {

				SnackBar.container['bottom-left'] = document.createElement('div');

				const snackbar = new SnackBar({message: 'a'});

				snackbar.show();
				snackbar.hide();

				SnackBar.container['bottom-left'] = document.querySelector('.snack-bar-container.bottom-left');
			}
		},
	},
};