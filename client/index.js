"use strict";

const express = require('express');
const router = express.Router();
const config = require('config');
const {promisify} = require('util');
const fs = require('fs');
const API = require('../server/utils/api');
const authLogin = require('../server/www/authentication').login;

router.use(express.static('./client'));

class HTMLAPI extends API {

	constructor(request, response) {

		super();

		this.request = request;
		this.response = response;

		this.stylesheets = [
			'/css/main.css',
			'https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous" f="'
		];

		this.scripts = [
			'/js/main.js',
			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		];
	}

	async body() {

		if(this.account.settings.has('custom_css'))
			this.stylesheets.push('/css/custom.css');

		if(this.account.settings.has('custom_js'))
			this.scripts.push('/js/custom.js');

		let ga = '';

		if(config.has('ga_id')) {
			ga = `
				<script async src="https://www.googletagmanager.com/gtag/js?id=${config.get('ga_id')}"></script>
				<script>
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());

					gtag('config', '${config.get('ga_id')}');
				</script>
			`;
		}

		return `<!DOCTYPE html>
			<!--
				           _ _  _____                  _
				     /\\   | | |/ ____|                | |
				    /  \\  | | | (___  _ __   __ _ _ __| | __
				   / /\\ \\ | | |\\___ \\| '_ \\ / _\` | '__| |/ /
				  / ____ \\| | |____) | |_) | (_| | |  |   <
				 /_/    \\_\\_|_|_____/| .__/ \\__,_|_|  |_|\\_\\
				                     | |
				                     |_|
				   Welcome to the source, enjoy your stay.
		Find the entire code at https://github.com/Jungle-Works/AllSpark
			-->
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<meta name="theme-color" content="#3e7adc">
					<title></title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + this.checksum + '">\n\t\t\t\t\t').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + this.checksum + '"></script>\n\t\t\t\t\t').join('')}

					<link rel="manifest" href="/manifest.webmanifest">
					${ga}
				</head>
				<body>

					<div id="ajax-working"></div>

					<header>
						<a class="logo" href="/dashboard/first"><img></a>

						<div class="nav-container">

							<nav></nav>

							<span class="user-toggle"></span>

							<div class="user-popup hidden">
								<span class="name"></span>
								<span class="email"></span>
								<a href="#" class="logout">Logout</a>
							</div>
						</div>

						<div class="menu-toggle"><i class="fas fa-chevron-down"></i></div>
					</header>

					<main>
						${await this.main() || ''}
					</main>
				</body>
			</html>
		`;
	}
}

router.get('/service-worker.js', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'application/javascript');

		return [
			await (promisify(fs.readFile))('client/js/service-worker.js', {encoding: 'utf8'}),
			`'${this.checksum}'`
		].join('\n');
	}
}));

router.get('/css/custom.css', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'text/css');

		return this.account.settings.get('custom_css') || '';
	}
}));

router.get('/js/custom.js', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'text/javascript');

		return this.account.settings.get('custom_js') || '';
	}
}));

router.get('/account-signup', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/account-signup.css');
		this.scripts.push('/js/account-signup.js');
	}

	async main() {

		return `
			<section class="section" id="signup">
				<h1>Signup Page</h1>

				<div class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="signup-form"><i class="far fa-save"></i> Sign up</button>
					<span class="notice hidden"></span>
				</div>

				<form class="block form" id="signup-form">

					<h3>Account Details</h3>
					<label>
						<span>Account Name</span>
						<input type="text" name="name" required>
					</label>
					<label>
						<span>Url</span>
						<input type="text" name="url" required>
					</label>
					<label>
						<span>Icon</span>
						<input type="text" name="icon">
					</label>
					<label>
						<span>Logo</span>
						<input type="text" name="logo">
					</label>

					<h3>Admin Details</h3>

					<label>
						<span>First Name</span>
						<input type="text" name="first_name">
					</label>
					<label>
						<span>Middle Name</span>
						<input type="text" name="middle_name">
					</label>
					<label>
						<span>Last Name</span>
						<input type="text" name="last_name">
					</label>
					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>
					<label>
						<span>Password</span>
						<input type="password" name="password" required>
					</label>
					<label>
						<span>Phone</span>
						<input type="text" name="phone">
					</label>
				</form>
			</section>
		`;
	}
}));

router.get('/login', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/login.js');
	}

	async main() {

		if(Array.isArray(this.account.settings.get('external_parameters')) && this.request.query.external_parameters) {

			const external_parameters = {};

			for(const key of this.account.settings.get('external_parameters')) {

				if(key in this.request.query)
					this.request.body['ext_' + key] = this.request.query[key];

				external_parameters[key] = this.request.query[key];
			}

			this.request.body.account_id = this.account.account_id;

			const loginObj = new authLogin();

			loginObj.request = this.request;

			const response = await loginObj.login();

			if(!response.jwt && response.length)
				throw new Error("User not found!!!");

			this.response.setHeader('Set-Cookie', [`refresh_token=${response.jwt}`, `external_parameters=${JSON.stringify(external_parameters)}`]);

			this.response.redirect('/dashboard/first');
			throw({"pass": true});
		}

		return `
			<div class="logo hidden">
				<img src="" />
			</div>

			<section id="loading" class="section form">
				<i class="fa fa-spinner fa-spin"></i>
			</section>

			<section id="accept-email" class="section">
				<form class="form">

					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>

					<div>
						<button class="submit">
							<i class="fas fa-arrow-right"></i>
							Next
						</button>
					</div>
				</form>
			</section>

			<section id="accept-account" class="section"></section>

			<section id="accept-password" class="section">
				<form class="form">

					<label>
						<span>Email</span>
						<input type="email" name="email" disabled required>
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password" required>
					</label>

					<div>
						<a id="password-back"><i class="fas fa-arrow-left"></i> &nbsp;Back</a>
						<button class="submit">
							<i class="fas fa-sign-in-alt"></i>
							Sign In
						</button>
					</div>
				</form>
			</section>

			<section id="message"></section>

			<div id="signup" class="hidden">
				<a href="/login/forgot">Forgot Password?</a>
				${this.account.settings.get('enable_account_signup') ? 'Or Create a <a href="/account-signup">new account</a>' : ''}
			</div>
		`;
	}
}));

router.get('/login/forgot', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/forgotpassword.js');
	}

	async main() {
		return `
			<div class="logo hidden">
				<img src="" />
			</div>

			<form class="form forgot">

				<label>
					<span>Email</span>
					<input type="email" name="email" required>
				</label>

				<div>
					<a href='/login'><i class="fa fa-arrow-left"></i> &nbsp;Login</a>
					<button class="submit">
						<i class="fa fa-paper-plane"></i>
						Send Link
					</button>
				</div>
			</form>

			<div id="message" class="hidden"></div>
		`;
	}
}));

router.get('/login/reset', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/resetpassword.js');
	}

	async main() {
		return `
			<div class="logo hidden">
				<img src="" />
			</div>

			<form class="form reset">

				<label>
					<span>New Password</span>
					<input type="password" name="password" required>
				</label>

				<div>
					<button class="submit">
						<i class="fa fa-paper-plane"></i>
						Change Password
					</button>
				</div>
			</form>

			<div id="message" class="hidden"></div>
		`;
	}
}));

router.get('/user/profile/edit', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.scripts.push('/js/user/profile/edit.js');
	}

	async main() {
		return `
			<section class="section" id="form">
				<form class="block form">

					<label>
						<span>Old Password</span>
						<input type="password" name="old_password" required>
					</label>

					<label>
						<span>New Password</span>
						<input type="password" name="new_password" required>
					</label>

					<label>
						<span></span>
						<button class="submit">
							<i class="far fa-save"></i>
							Change
						</button>
					</label>

					<label>
						<div class="notice hidden" id="message"></div>
					</label>
				</form>
			</section>
		`;
	}
}));

router.get('/user/profile/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/profile.css');
		this.scripts.push('/js/profile.js');
	}

	async main() {
		return `
			<h1>
				<span></span>
				<a href="/user/profile/edit" class="edit"><i class="fa fa-edit"></i> Edit</a>
			</h1>

			<div class="profile-details"></div>

			<h2>Privileges</h2>
			<p>
				Privileges define what <strong>actions</strong> the user can perform.<br>
				<span class="NA">For Example: Manage Reports, Users, Connections, Dashboards, etc</span>
			</p>
			<table class="privileges">
				<thead>
					<tr>
						<th>Category</th>
						<th>Privilege</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>

			<h2>Roles</h2>
			<p>
				Roles define what <strong>data</strong> the user can view.<br>
				<span class="NA">For Example: <em>Merchant Dashboard</em>, <em>Production MySQL</em> (Connection), <em>Delivery Analysys Report</em> etc</span>
			</p>
			<table class="roles">
				<thead>
					<tr>
						<th>Category</th>
						<th>Role</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`;
	}
}));

router.get('/streams', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.scripts = this.scripts.concat([
			'/js/streams.js',
			'/js/streams-test.js',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {
		return ''
	}
}));

router.get('/:type(dashboard|report)/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/dashboard.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/dashboard.js',

			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',
			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU&libraries=visualization" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {

		return `
			<nav>
				<label class="dashboard-search hidden">
					<input type="search" name="search" placeholder="Search..." >
				</label>

				<div class="dashboard-hierarchy"></div>

				<footer>

					<div class="collapse-panel">
						<span class="left"><i class="fa fa-angle-double-left"></i></span>
					</div>

					<span class="powered-by ${this.account.settings.get('disable_powered_by') ? 'hidden' : ''}">
						Powered by&nbsp;${config.has('footer_powered_by') ? config.get('footer_powered_by') : ''}
						<a class="strong" href="https://github.com/Jungle-Works/AllSpark" target="_blank">AllSpark</a>
					</span>
				</footer>
			</nav>
			<div class="nav-blanket hidden"></div>
			<section class="section" id="list">
				<h2>${this.request.params.type}</h2>

				<form class="form toolbar">

					<label class="right">
						<select name="subtitle">
							<option value="">Everything</option>
						</select>
					</label>

					<label>
						<input type="search" name="search" placeholder="Search...">
					</label>
				</form>

				<table class="block">
					<thead></thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="reports">

				<h1 class="dashboard-name"></h1>

				<div class="toolbar form hidden">

					<button id="back">
						<i class="fa fa-arrow-left"></i>
						Back
					</button>

					<button id="edit-dashboard" class="hidden">
						<i class="fa fa-edit"></i>
						Edit
					</button>

					<button id="export-dashboard" class="hidden">
						<i class="fa fa-download"></i>
						Export
					</button>

					<button id="mailto" class="hidden">
						<i class="fas fa-envelope"></i>
						Email
					</button>
					<button id="configure" class="hidden">
						<i class="fas fa-cog"></i>
						Configure
					</button>
				</div>

				<form class="form mailto-content hidden">
					<label>
						<span>Send to</span>
						<input type="email" name="email">
					</label>
					<label>
						<span>Subject</span>
						<input type="text" name="subject">
					</label>
					<label>
						<span>Body</span>
						<input type="text" name="body">
					</label>
					<button type="submit"><i class="fa fa-paper-plane"></i> Send</button>
				</form>
				<div class="global-filters form"></div>

				<div class="list"></div>
				<div id="blanket" class="hidden"></div>
				<button type="button" class="side">
					<i class="fas fa-filter"></i>
				</button>
			</section>
		`;
	}
}));

router.get('/dashboards-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/dashboards-manager.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/dashboards-manager.js'
		]);
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Dashboard Manager</h1>

				<form class="toolbar">
					<button type="button" id="add-dashboard">
						<i class="fa fa-plus"></i>
						Add New Dashboard
					</button>

					<button type="button" id="import-dashboard">
						<i class="fa fa-upload"></i>
						Import
					</button>
				</form>

				<table class="block">
					<thead>
						<tr>
							<th class="thin">ID</th>
							<th>Name</th>
							<th>Parents</th>
							<th>Icon</th>
							<th>Order</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>

					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="form">
				<h1></h1>

				<div class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="dashboard-form"><i class="far fa-save"></i> Save</button>
				</div>

				<form class="block form" id="dashboard-form">

					<label>
						<span>Name</span>
						<input type="text" name="name" required>
					</label>

					<label class="parent-dashboard">
						<span>Parent</span>
					</label>

					<label>
						<span>Icon</span>
						<input type="text" name="icon">
					</label>

					<label>
						<span>Order</span>
						<input type="number" min="0" step="1" name="order">
					</label>

					<label id="format">
						<span>Format</span>
					</label>
				</form>

				<h2 class="share-heading">Share dashboards</h2>
				<div id="share-dashboards"></div>
			</section>
		`;
	}
}));

router.get('/reports/:stage?/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/reports-manager.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/reports-manager.js',

			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js',

			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',
			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU&libraries=visualization" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {
		return `
			<div id="stage-switcher"></div>

			<div id="stages">
				<section class="section" id="stage-pick-report">

					<form class="toolbar filters">

						<button type="button" id="add-report">
							<i class="fa fa-plus"></i>
							Add New Report
						</button>
					</form>

					<div id="list-container">
						<table>
							<thead>
								<tr class="search"></tr>
								<tr>
									<th class="sort search" data-key="query_id">ID</th>
									<th class="sort search" data-key="name" >Name</th>
									<th class="sort search" data-key="description">Description</th>
									<th class="sort search" data-key="connection">Connection </th>
									<th class="sort search" data-key="tags">Tags</th>
									<th class="sort search" data-key="filters">Filters</th>
									<th class="sort search" data-key="visualizations">Visualizations</th>
									<th class="sort search" data-key="is_enabled">Enabled</th>
									<th class="action">Configue</th>
									<th class="action">Define</th>
									<th class="action">Delete</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>
				</section>

				<section class="section" id="stage-configure-report">

					<header class="toolbar">
						<button type="submit" form="configure-report-form"><i class="far fa-save"></i> Save</button>
						<small id="added-by"></small>
					</header>

					<form id="configure-report-form">

						<div class="form">
							<label>
								<span>Name</span>
								<input type="text" name="name">
							</label>

							<label>
								<span>Connection</span>
								<select name="connection_name" required></select>
							</label>

							<div id="query" class="hidden">
								<span>Query <span id="full-screen-editor" title="Full Screen Editor"><i class="fas fa-expand"></i></span></span>
								<div id="schema"></div>
								<div id="editor"></div>

								<div id="test-container">
									<div id="test-executing" class="hidden notice"></div>
								</div>

								<div id="missing-filters" class="hidden"></div>
							</div>

							<div id="api" class="hidden form">

								<label>
									<span>URL</span>
									<input type="url" name="url">
								</label>

								<label>
									<span>Method</span>
									<select name="method">
										<option>GET</option>
										<option>POST</option>
									</select>
								</label>
							</div>

							<label>
								<span>Description</span>
								<textarea name="description"></textarea>
							</label>

							<label>
								<span>Tags (Comma Separated)</span>
								<input type="text" name="tags">
							</label>

							<label>
								<span>Category</span>
								<select name="subtitle"></select>
							</label>
						</div>

						<div class="form">

							<label>
								<span>Refresh Rate (Seconds)</span>
								<input type="number" name="refresh_rate" min="0" step="1">
							</label>

							<label>
								<span>Store Result</span>
								<select name="load_saved">
									<option value="1">Enabled</option>
									<option value="0" selected>Disabled</option>
								</select>
							</label>

							<label>
								<span>Redis</span>

								<select id="redis">
									<option value="0">Disabled</option>
									<option value="EOD">EOD</option>
									<option value="custom">Custom<custom>
								</select>

								<input name="is_redis" class="hidden">
							</label>

							<label>
								<span>Status</span>
								<select name="is_enabled" required>
									<option value="1">Enabled</option>
									<option value="0">Disabled</option>
								</select>
							</label>
						</div>
					</form>

					<h2>Share Report</h2>
					<div id="share-report"></div>
				</section>

				<section class="section" id="stage-define-report">

					<header class="toolbar">
						<button type="submit" form="define-report-form"><i class="far fa-save"></i> Save</button>
						<button id="schema-toggle"><i class="fas fa-database"></i> Schema</button>
						<button id="filters-toggle"><i class="fas fa-filter"></i> Filters</button>
						<button id="preview-toggle"><i class="fas fa-eye"></i> Preview</button>
						<button id="edit-data-toggle"><i class="fas fa-edit"></i> Edit Data</button>
						<button id="run"><i class="fas fa-sync"></i> Run</button>
						<button id="history-toggle"><i class="fa fa-history"></i> Query History</button>
					</header>

					<div id="define-report-parts">
						<div id="schema" class="hidden"></div>

						<form id="define-report-form"></form>

						<div id="filters" class="hidden">

							<div id="filter-list">

								<div class="toolbar">
									<button id="add-filter"><i class="fas fa-plus"></i> Add New Filter</button>
								</div>

								<div id="missing-filters" class="hidden"></div>

								<table>
									<thead>
										<tr>
											<th>Name</th>
											<th>Placeholder</th>
											<th>Type</th>
											<th>Dataset</th>
											<th class="action">Edit</th>
											<th class="action">Delete</th>
										</tr>
									</thead>
									<tbody></tbody>
								</table>
							</div>

							<div id="filter-form" class="hidden">

								<div class="toolbar">
									<button id="filter-back"><i class="fa fa-arrow-left"></i> Back</button>
									<button type="submit" form="filter-form-f"><i class="far fa-save"></i> Save</button>
								</div>

								<form id="filter-form-f" class="form">

									<label>
										<span>Name</span>
										<input type="text" name="name" required>
									</label>

									<label>
										<span>Placeholder</span>
										<input type="text" name="placeholder" required>
									</label>

									<label>
										<span>Type</span>
										<select name="type" required></select>
									</label>

									<label>
										<span>Description</span>
										<input type="text" name="description">
									</label>

									<label>
										<span>Order</span>
										<input type="number" name="order">
									</label>

									<label>
										<span>Default Value</span>
										<input type="text" name="default_value">
									</label>

									<label>
										<span>Offset</span>
										<input type="text" name="offset">
									</label>

									<label class="dataset">
										<span>Dataset</span>
									</label>

									<label>
										<span>Multiple</span>
										<select name="multiple" required>
											<option value="0">No</option>
											<option value="1">Yes</option>
										</select>
									</label>
								</form>
							</div>
						</div>
					</div>
				</section>

				<section class="section" id="stage-pick-visualization">

					<div id="visualization-list">

						<div class="toolbar">
							<button id="add-visualization"><i class="fas fa-plus"></i> Add New Visualization</button></button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Description</th>
									<th>Type</th>
									<th>Preview</th>
									<th>Edit</th>
									<th>Delete</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>

					<div class="hidden" id="add-visualization-picker">

						<div class="toolbar">
							<button id="visualization-picker-back"><i class="fas fa-arrow-left"></i> Back</button>
						</div>

						<form id="add-visualization-form"></form>
					</div>

				</section>

				<section class="section" id="stage-configure-visualization">

					<div class="toolbar">
						<button type="button" id="configure-visualization-back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="configure-visualization-form" class="right"><i class="far fa-save"></i> Save</button>
						<button type="button" id="preview-configure-visualization"><i class="fa fa-eye"></i> Preview</button>
					</div>

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

					<div class="configuration-section">

						<h3>
							<i class="fas fa-angle-right"></i>
							Transformations
							<button id="transformations-preview" title="preview"><i class="fas fa-eye"></i></button>
							<span class="count transformation"></span>
						</h3>

						<div class="body" id="transformations"></div>
					</div>

					<div class="configuration-section">

						<h3><i class="fas fa-angle-right"></i> Dashboards <span class="count"></span></h3>

						<div class="body" id="dashboards"></div>
					</div>

					<div class="configuration-section">

						<h3><i class="fas fa-angle-right"></i> Filters <span class="count"></span></h3>

						<div class="body" id="filters"></div>

					</div>

				</section>
			</div>

			<div id="preview" class="hidden"></div>
		`;
	}
}));

router.get('/users-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/users-manager.css');
		this.scripts.push('/js/users-manager.js');
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Manage Users</h1>

				<header class="toolbar">
					<button id="add-user"><i class="fa fa-plus"></i> Add New User</button>
				</header>

                <form class="user-search block form">

                    <label>
                        <span>Id</span>
                        <input type="number" name="user_id" step="1" min="0">
                    </label>

                    <label>
                        <span>Name</span>
                        <input type="text" name="name">
                    </label>

                    <label>
                        <span>Email</span>
                        <input type="text" name="email">
                    </label>

                    <label>
                        <span>Search by</span>
                        <select name="search_by" value="category">
                            <option value="category">Category</option>
                            <option value="role">Role</option>
                            <option value="privilege">Privilege</option>
                        </select>
                    </label>

                    <label class="category">
                        <span>Category</span>
                    </label>

                    <label class="hidden role">
                        <span>Role</span>
                    </label>

                    <label class="hidden privilege">
                        <span>Privilege</span>
                    </label>

                    <label>
                        <span></span>
                        <button type="submit">Apply</button>
                    </label>
                </form>

				<table class="block">
					<thead>
						<tr class="search-bar"></tr>
						<tr class="thead-bar">
							<th data-key="id" class="thin">ID</th>
							<th data-key="name">Name</th>
							<th data-key="email">Email</th>
							<th data-key="lastLogin">Last Login</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="user-form"><i class="far fa-save"></i> Save</button>
				</header>

				<form class="block form" id="user-form">

					<label>
						<span>Fist Name</span>
						<input type="text" name="first_name" required>
					</label>

					<label>
						<span>Middle Name</span>
						<input type="text" name="middle_name">
					</label>

					<label>
						<span>Last Name</span>
						<input type="text" name="last_name">
					</label>

					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password">
					</label>
				</form>

				<h3>Privileges</h3>
				<div class="privileges form-container">
					<form class="filter">
						<label><span>Category</span></label>
						<label><span>Privileges</span></label>
						<label class="edit"><span></span></label>
						<label class="save"><span></span></label>
					</form>

					<div id="filters-list"></div>

					<form id="add-filter" class="filter">

						<label>
							<select name="category_id"></select>
						</label>

						<label>
							<select name="privilege_id"></select>
						</label>

						<label class="save">
							<button type="submit" title="Add"><i class="fa fa-paper-plane"></i></button>
						</label>
					</form>
				</div>

				<h3>Roles</h3>
				<div class="roles form-container">
					<form class="filter">
						<label><span>Category</span></label>
						<label><span>Roles</span></label>
						<label class="edit"><span></span></label>
						<label class="save"><span></span></label>
					</form>

					<div id="roles-list"></div>

					<form id="add-roles" class="filter">

						<label>
							<select name="category_id" required></select>
						</label>

						<label>
							<select name="role_id" required></select>
						</label>

						<label class="save">
							<button type="submit" title="Add"><i class="fa fa-paper-plane"></i></button>
						</label>
					</form>
				</div>


			</section>
		`;
	}
}));

router.get('/connections-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/connections-manager.css');
		this.scripts.push('/js/connections-manager.js');
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Data Connections</h1>

				<div class="toolbar filters">
					<button type="button" id="add-data-connection">
						<i class="fa fa-plus"></i>
						Add New Connection
					</button>
				</div>

				<div class="block data-connections">
					<table>
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Type</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</div>

				<h1>OAuth Connections</h1>

				<div class="oauth-connections">

					<div class="test-result hidden"></div>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Type</th>
								<th class="action">Authenticate</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>

					<form id="add-oauth-connection" class="form">
						<select name="provider"></select>
						<button type="submit">
							<i class="fas fa-plus"></i> Add New Connection
						</button>
					</form>
				</div>

			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="connections-form"><i class="far fa-save"></i> Save</button>
					<button type="button" id="test-connection"><i class="fas fa-flask"></i>Test</button>
				</header>

				<div class="test-result hidden"></div>

				<form class="block form" id="connections-form">

					<label>
						<span>Name</span>
						<input type="text" name="connection_name" required>
					</label>

					<label id="connections">
						<span>Type</span>
						<select name="type"></select>
					</label>

					<div id="details"></div>
				</form>

				<h2 class="share-heading">Share connections</h2>
				<div id="share-connections"></div>
			</section>
		`;
	}
}));

router.get('/settings/:tab?/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/settings.css');
		this.scripts.push('/js/reports.js');
		this.scripts.push('/js/settings.js');
		this.scripts.push('/js/settings-manager.js');
	}

	async main() {
		return `
			<nav></nav>

			<div class="setting-page accounts-page hidden">

				<section class="section" id="accounts-list">

					<h1>Manage Accounts</h1>

					<header class="toolbar">
						<button id="add-account"><i class="fa fa-plus"></i> Add New Account</button>
					</header>

					<table class="block">
						<thead>
							<th>Id</th>
							<th>Name</th>
							<th>URL</th>
							<th>Icon</th>
							<th>Logo</th>
							<th>Edit</th>
							<th>Delete</th>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="accounts-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="account-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="account-form">

						<label>
							<span>Name</span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>URL</span>
							<input type="text" name="url" required>
						</label>

						<label>
							<span>Icon</span>
							<input type="url" name="icon">
							<img src="" alt="icon" id="icon" height="30">
						</label>

						<label>
							<span>Logo</span>
							<input type="url" name="logo">
							<img src="" alt="logo" id="logo" height="30">
						</label>

						<label>
							<span>Authentication API</span>
							<input type="url" name="auth_api">
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page global-filters-page hidden">
				<section class="section" id="global-filters-list">

					<h1>Manage Global Filters</h1>

					<header class="toolbar">
						<button id="add-global-filter"><i class="fa fa-plus"></i> Add New Global Filter</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Placeholder</th>
								<th>Default Value</th>
								<th>Type</th>
								<th>Multiple</th>
								<th>Offset</th>
								<th>Dataset</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="global-filters-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="user-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="user-form">

						<label>
							<span>Name</span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Placeholder</span>
							<input type="text" name="placeholder" required>
						</label>

						<label>
							<span>Default Value</span>
							<input type="text" name="default_value">
						</label>

						<label>
							<span>Type</span>
							<select name="type"></select>
						</label>

						<label>
							<span>Multiple</span>
							<select name="multiple">
								<option value="0">No</option>
								<option value="1">Yes</option>
							</select>
						</label>

						<label>
							<span>Offset</span>
							<input type="number" name="offset" placeholder="Offset">
						</label>

						<label class="datasets">
							<span>Dataset</span>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page privilege-page hidden">

				<section class="section" id="privileges-list">

					<h1>Manage Privileges</h1>

					<header class="toolbar">
						<button id="add-privilege"><i class="fa fa-plus"></i> Add New Privilege</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Is Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="privileges-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="user-form2"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="user-form2">

						<label>
							<span>Name</span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Is Admin</span>
							<select name="is_admin">
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page roles-page hidden">

				<section class="section" id="roles-list">

					<h1>Manage Roles</h1>

					<header class="toolbar">
						<button id="add-role"><i class="fa fa-plus"></i> Add New Role</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="roles-form">

					<h1></h1>

					<header class="toolbar">
						<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="role-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="role-form">

						<label>
							<span>Name</span>
							<input type="text" name="name">
						</label>

						<label>
							<span>Admin</span>
							<select  name="is_admin">
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page category-page hidden">

				<section class="section" id="category-list">

					<h1>Manage Categories</h1>

					<header class="toolbar">
						<button id="add-category"><i class="fa fa-plus"></i> Add New Category</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Slug</th>
								<th>Parent</th>
								<th>Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="category-edit">

					<h1></h1>

					<header class="toolbar">
						<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="category-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="category-form">

						<label>
							<span>Name</span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Slug</span>
							<input type="text" name="slug" required>
						</label>

						<label>
							<span>Parent</span>
							<input type="number" name="parent">
						</label>

						<label>
							<span>Admin</span>
							<select name="is_admin">
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>
		`;
	}
}));

router.get('/tasks/:id?/:define?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/tasks.css');
		this.scripts.push('/js/tasks.js');
	}

	main() {

		return `
			<section class="section" id="list">
				<h1>Tasks</h1>

				<header class="toolbar">
					<button id="add-task"><i class="fas fa-plus"></i> Add New Task</button>
				</header>

				<table class="block">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Type</th>
							<th class="action">Define</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="form-back"><i class="fas fa-arrow-left"></i> Back</button>
					<button type="submit" form="task-form"><i class="far fa-save"></i> Save</button>
				</header>

				<form class="form block" id="task-form">

					<label>
						<span>Task Name</span>
						<input type="text" name="name" required>
					</label>

					<label>
						<span>Task Type</span>
						<select name="type" required>
							<option value="google-analytics">Google Analytics</option>
						</select>
					</label>
				</form>
			</section>

			<section class="section" id="define">

				<header class="toolbar">
					<button id="define-back"><i class="fas fa-arrow-left"></i> Back</button>
					<button type="submit" form="task-define"><i class="far fa-save"></i> Save</button>
				</header>
			</section>
		`;
	}
}));

module.exports = router;