"use strict";

const express = require('express');
const router = express.Router();
const config = require('config');
const {promisify} = require('util');
const fs = require('fs');
const API = require('../server/utils/api');

router.use(express.static('./client'));

class HTMLAPI extends API {

	constructor(request, response) {

		super();

		this.request = request;
		this.response = response;

		this.stylesheets = [
			'/css/main.css',
		];

		this.scripts = [
			'/js/main.js',
			'https://use.fontawesome.com/releases/v5.0.8/js/all.js" async defer f="',
			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		];
	}

	async body() {

		if(this.account.settings.has('custom_css'))
			this.stylesheets.push('/css/custom.css');

		if(this.account.settings.has('custom_js'))
			this.scripts.push('/js/custom.js');

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<meta name="theme-color" content="#fff">
					<title></title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + this.checksum + '">').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + this.checksum + '"></script>').join('')}

					<link rel="manifest" href="/manifest.webmanifest">
				</head>
				<body>
					<div id="ajax-working"></div>
					<header class="${this.account.settings.get('top_nav_position') == 'hidden' ? 'hidden' : ''}">
						<div class="logo-container">

							<div class="left-menu-toggle hidden">
								<i class="fas fa-bars"></i>
							</div>

							<a class="logo" href="/dashboard/first"><img></a>
						</div>

						<nav class="hidden"></nav>
					</header>
					<div class="nav-blanket"></div>
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

		this.stylesheets.push('/css/accountSignup.css');
		this.scripts.push('/js/accountSignup.js');
	}

	async main() {

		return `
			<section class="section" id="signup">
				<h1>Signup Page</h1>

				<div class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="signup-form"><i class="fa fa-save"></i> Sign up</button>
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

			<div id="signup">
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

			<form class="form">

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

			<form class="form">

				<label>
					<span>New Password</span>
					<input type="password" name="password" required>
				</label>

				<div>
					<a href='/login'><i class="fa fa-arrow-left"></i> &nbsp;Login</a>
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
							<i class="fa fa-save"></i>
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

			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {
		return `
			<nav>
				<div class="NA"><i class="fa fa-spinner fa-spin"></i></div>
			</nav>

			<section class="section" id="list">
				<h2>${this.request.params.type}</h2>

				<form class="form toolbar">

					<label class="right">
						<select name="category">
							<option value="">All Categories</option>
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

				<div class="toolbar form">

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
				<div class="datasets form"></div>

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
			<section class="section show" id="list">

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
							<th>Parent</th>
							<th>Icon</th>
							<th>Visibility</th>
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
					<button type="submit" form="dashboard-form"><i class="fa fa-save"></i> Save</button>
				</div>

				<form class="block form" id="dashboard-form">

					<label>
						<span>Name</span>
						<input type="text" name="name" required>
					</label>

					<label>
						<span>Parent</span>
						<input type="number" name="parent">
					</label>

					<label>
						<span>Icon</span>
						<input type="text" name="icon">
					</label>

					<label>
						<span>Type</span>
						<select name="visibility">
							<option value="private">Private</option>
							<option value="public">Public</option>
						</select>
					</label>
				</form>

				<h2 class="share-heading">Share dashboards</h2>

				<form class="block form" id="dashboard_share">
					<button type="submit" class="add_user"><i class="fa fa-plus"></i> Add Users</button>
				</form>

				<table class="block user-dashboard">
					<thead>
						<tr>
							<th class="thin">User Id</th>
							<th>Name</th>
							<th class="action">Action</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
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

			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

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
						<button type="submit" form="configure-report-form"><i class="fa fa-save"></i> Save</button>
					</header>

					<form class="form" id="configure-report-form">

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
							<span>Category</span>
							<select name="category_id"></select>
						</label>

						<label>
							<span>Description</span>
							<textarea name="description"></textarea>
						</label>

						<label>
							<span>Tags (Comma Separated)</span>
							<input type="text" name="tags">
						</label>

						<label>
							<span>Requested By</span>
							<input type="text" name="requested_by">
						</label>

						<label>
							<span>Roles</span>
							<select name="roles" required id="roles"></select>
						</label>

						<label>
							<span>Refresh Rate (Seconds)</span>
							<input type="number" name="refresh_rate" min="0" step="1">
						</label>

						<label>
							<span>Redis</span>

							<select id="redis">
								<option value="0">Disabled</option>
								<option value="EOD">EOD</option>
								<option value="custom">Custom<custom>
							</select>

							<input name="is_redis" class="hidden" value="0" min="1">
						</label>

						<label>
							<span>Status</span>
							<select name="is_enabled" required>
								<option value="1">Enabled</option>
								<option value="0">Disabled</option>
							</select>
						</label>

						<label style="max-width: 300px">
							<span>Added By</span>
							<span class="NA" id="added-by"></span>
						</label>
					</form>
				</section>

				<section class="section" id="stage-define-report">

					<header class="toolbar">
						<button type="submit" form="define-report-form"><i class="fa fa-save"></i> Save</button>
						<button id="schema-toggle"><i class="fas fa-database"></i> Schema</button>
						<button id="filters-toggle"><i class="fas fa-filter"></i> Filters</button>
						<button id="preview-toggle"><i class="fas fa-eye"></i> Preview</button>
						<button id="run"><i class="fas fa-sync"></i> Run</button>
					</header>

					<div id="define-report-parts">
						<div id="schema" class="hidden"></div>

						<form id="define-report-form">

							<div id="query" class="hidden">
								<div id="editor"></div>
							</div>

							<div id="api" class="hidden">

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
						</form>

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
									<button type="submit" form="filter-form-f"><i class="fa fa-save"></i> Save</button>
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
										<span>Default Value</span>
										<input type="text" name="default_value">
									</label>

									<label>
										<span>Offset</span>
										<input type="text" name="offset">
									</label>

									<label>
										<span>Dataset</span>
										<select name="dataset">
											<option value="">None</option>
										</select>
									</label>

									<label>
										<span>Multiple</span>
										<select name="multiple" required>
											<option value="0" ${!this.multiple ? 'selected' : ''}">No</option>
											<option value="1" ${this.multiple ? 'selected' : ''}">Yes</option>
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
							<button type="submit" form="add-visualization-form"><i class="fas fa-save"></i> Save</button>
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

							<div class="form body">
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

						<div class="options"></div>

					</form>

					<div class="configuration-section">

						<h3>
							<i class="fas fa-angle-right"></i>
							Transformations
							<button id="transformations-preview" title="preview"><i class="fas fa-eye"></i></button>
						</h3>

						<div class="body" id="transformations"></div>
					</div>

					<div class="configuration-section">

						<h3><i class="fas fa-angle-right"></i> Dashboards</h3>

						<div class="body" id="dashboards"></div>
					</div>

				</section>
			</div>

			<div id="preview" class="hidden"></div>
		`;
	}
}));

router.get('/users/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/users.css');
		this.scripts.push('/js/users.js');
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Manage Users</h1>

				<header class="toolbar">
					<button id="add-user"><i class="fa fa-plus"></i> Add New User</button>
				</header>

				<table class="block">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Email</th>
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
					<button type="submit" form="user-form"><i class="fa fa-save"></i> Save</button>
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

router.get('/connections/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/connections.css');
		this.scripts.push('/js/connections.js');
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Connection Manager</h1>

				<form class="toolbar filters">
					<button type="button" id="add-connection">
						<i class="fa fa-plus"></i>
						Add New Connection
					</button>
				</form>

				<div class="block overflow">
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

			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="connections-form"><i class="fa fa-save"></i> Save</button>
					<button type="button" id="test-connection"><i class="fas fa-cogs"></i>Test</button>
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
			</section>
		`;
	}
}));

router.get('/settings/:tab?/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/settings.css');
		this.scripts.push('/js/settings.js');
		this.scripts.push('/js/settings-manager.js');
	}

	async main() {
		return `
			<nav></nav>

			<div class="setting-page datasets-page hidden">
				<section class="section" id="datasets-list">

					<h1>Manage Datasets</h1>

					<header class="toolbar">
						<button id="add-datset"><i class="fa fa-plus"></i> Add New Dataset</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Category</th>
								<th>Query id</th>
								<th>Order</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="datasets-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="user-form"><i class="fa fa-save"></i> Save</button>
					</header>

					<form class="block form" id="user-form">

						<label>
							<span>Name</span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Category</span>
							<select name="category_id"></select>
						</label>

						<label>
							<span>Query Id</span>
							<input type="number" name="query_id">
						</label>

						<label>
							<span>Order</span>
							<input type="number" name="order">
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
						<button type="submit" form="user-form2"><i class="fa fa-save"></i> Save</button>
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
						<button type="submit" form="role-form"><i class="fa fa-save"></i> Save</button>
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

			<div class="setting-page accounts-page hidden">
				<section class="section" id="accounts-list">
					<h1>Manage Accounts</h1>
					<header class="toolbar">
						<button id="add-account"><i class="fa fa-plus"></i> Add New Account</button>
					</header>

					<table class="block">
						<thead>
							<th>Account Id</th>
							<th>Name</th>
							<th>URL</th>
							<th>Icon</th>
							<th>Logo</th>
							<th>Authentication API</th>
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
	                    <button type="submit" form="account-form"><i class="fa fa-save"></i> Save</button>
	                </header>
	                <form class="block form" id="account-form">
	                    <label>
	                        <span>Name</span>
	                        <input type="text" name="name">
	                    </label>
	                    <label>
	                        <span>URL</span>
	                        <input type="text" name="url">
	                    </label>
	                    <label>
	                        <span>Icon</span>
	                        <input type="text" name="icon">
	                        <img src="" alt="icon" id="icon" height="30">
	                    </label>
	                    <label>
	                        <span>Logo</span>
	                        <input type="text" name="logo">
	                        <img src="" alt="logo" id="logo" height="30">
	                    </label>
						<label>
	                        <span>Authentication API</span>
	                        <input type="text" name="auth_api">
	                    </label>
						<label id="format">
							<span>Settings</span>
							<textarea id="settings-format" name="settings"></textarea>
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
	                    <button type="submit" form="category-form"><i class="fa fa-save"></i> Save</button>
	                </header>

	                <form class="block form" id="category-form">
	                    <label>
	                        <span>Name</span>
	                        <input type="text" name="name">
	                    </label>
	                    <label>
	                        <span>Slug</span>
	                        <input type="text" name="slug">
	                    </label>
	                    <label>
	                        <span>Parent</span>
	                        <input type="text" name="parent">
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

module.exports = router;