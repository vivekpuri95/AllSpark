"use strict";

const express = require('express');
const router = express.Router();
const compression = require('compression');
const config = require('config');

const checksum = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();

router.use(compression());

router.use(express.static('./client'));

router.get('/login', (req, res) => {

	const template = new Template;

	template.stylesheets.push('css/login.css');
	template.scripts.push('js/login.js');

	res.send(template.body(`

		<div class="logo hidden">
			<img src="" />
		</div>

		<form class="form">

			<label>
				<span>Email</span>
				<input type="text" name="email" required>
			</label>

			<label>
				<span>Password</span>
				<input type="password" name="password" required>
			</label>

			<div>
				<a href="/login/forgot">Forgot password?</a>
				<button class="submit">
					<i class="fa fa-paper-plane"></i>
					Sign In
				</button>
			</div>
		</form>

		<div id="message" class="hidden"></div>
	`));
});

router.get('/login/forgot', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/login.css');
	template.scripts.push('/js/forgotpassword.js');

	res.send(template.body(`

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
	`));
});

router.get('/login/reset', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/login.css');

	template.scripts.push('/js/resetpassword.js');

	res.send(template.body(`

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
	`));
});

router.get('/user/profile/edit', (req, res) => {
	const template = new Template;
	template.scripts.push('/js/user/profile/edit.js');

	res.send(template.body(`
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
	`));
});

router.get('/user/profile/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/profile.css');
	template.scripts.push('/js/profile.js');

	res.send(template.body(`
		<section id="profile">
			<h1>
				Profile details
				<a href="/user/profile/edit">
					<i class="fa fa-edit"></i>
					Edit
				</a>
			</h1>
			<div class="profile-details"></div>
			<div class="privileges">
				<label><span>Privileges:&nbsp;</span>
					<table>
						<thead>
							<tr>
								<th>Category</th>
								<th>Privileges</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</label>
			</div>
			<div class="roles">
				<label><span>Roles:&nbsp;</span>
					<table>
						<thead>
							<tr>
								<th>Category</th>
								<th>Roles</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</label>
			</div>
		</section>
	`))
});

router.get('/:type(dashboard|report)/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push();

	template.stylesheets = template.stylesheets.concat([
		'/css/dashboard.css',
	]);

	template.scripts = template.scripts.concat([
		'/js/dashboard.js',

		// 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		// 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	res.send(template.body(`

		<nav>
			<div class="NA"><i class="fa fa-spinner fa-spin"></i></div>
		</nav>

		<section class="section" id="list">
			<h2>${req.params.type}</h2>

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

				<label>
					<button id="back">
						<i class="fa fa-arrow-left"></i>
						Back
					</button>
				</label>

				<label>
					<button id="edit-dashboard" class="hidden">
						<i class="fa fa-edit"></i>
						Edit
					</button>
				</label>

				<div class="datasets right"></div>
			</div>

			<div class="list"></div>
		</section>
	`));
});

router.get('/dashboards/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/dashboards.css');

	template.scripts.push('/js/dashboards.js');

	res.send(template.body(`

		<section class="section show" id="list">

			<h1>Dashboard Manager</h1>

			<form class="toolbar">
				<button type="button" id="add-dashboard">
					<i class="fa fa-plus"></i>
					Add New Dashboard
				</button>
			</form>

			<table class="block">
				<thead>
					<tr>
						<th class="thin">ID</th>
						<th>Name</th>
						<th>Parent</th>
						<th>Icon</th>
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

				<label id="format">
					<span>Format</span>
					<textarea id="dashboard-format"></textarea>
				</label>
			</form>
		</section>

	`));
});

router.get('/:type(reports|visualization)/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/reports.css');

	template.scripts = template.scripts.concat([
		'/js/reports.js',

		'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js',

		// 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		// 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	res.send(template.body(`

		<section class="section" id="list">

			<h1>Reports Manager</h1>
			<form class="toolbar filters">

				<button type="button" id="add-report">
					<i class="fa fa-plus"></i>
					Add New Report
				</button>

				<select name="column_search" class="right">
					<option value="">Search Everything</option>
					<option value="query_id">ID</option>
					<option value="name">Name</option>
					<option value="description">Description</option>
					<option value="source">Source</option>
					<option value="tags">Tags</option>
				</select>

				<input type="search" placeholder="Search&hellip;" name="search">
			</form>

			<div id="list-container">
				<table class="block">
					<thead>
						<tr>
							<th class="thin">ID</th>
							<th>Name</th>
							<th>Description</th>
							<th>Connection</th>
							<th>Tags</th>
							<th>Filters</th>
							<th>Visualizations</th>
							<th>Enabled</th>
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
				<button type="submit" form="report-form"><i class="fa fa-save"></i> Save</button>

				<button id="test" class="right"><i class="fas fa-sync"></i> Run</button>
				<button id="force-test"><i class="fas fa-sign-in-alt""></i> Force Run</button>
				<button id="view"><i class="fas fa-external-link-alt""></i> View</button>
			</header>

			<form class="form" id="report-form">

				<label>
					<span>Name</span>
					<input type="text" name="name">
				</label>

				<label>
					<span>Connection</span>
					<select name="connection_name" required></select>
				</label>

				<div id="query" class="hidden">
					<span>Query <span id="full-screen-editor"><i class="fas fa-expand"></i></span></span>
					<div id="schema"></div>
					<div id="editor"></div>

					<div id="test-container">
						<div id="test-executing" class="hidden notice"></div>
					</div>

					<div id="missing-filters" class="hidden"></div>
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
					<select required id="roles">
						<option value="5">Core</option>
						<option value="6">Core Ops</option>
						<option value="7">City Ops</option>
					</select>
				</label>

				<label>
					<span>Refresh Rate (Seconds)</span>
					<input type="number" name="refresh_rate" min="0" step="1">
				</label>

				<label>
					<span>Redis</span>
					<select name="is_redis" required>
						<option value="1">Enabled</option>
						<option value="0">Disabled</option>
					</select>
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

				<label>
					<span>Format</span>
					<textarea name="format"></textarea>
				</label>
			</form>

			<h3>Filters</h3>

			<div id="filters-list"></div>

			<form id="add-filter" class="form filter">

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
					<select name="type" required>
						<option value="0">Integer</option>
						<option value="1">String</option>
						<option value="2">Date</option>
						<option value="3">Month</option>
						<option value="4">city</option>
					</select>
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

				<label class="save">
					<span>&nbsp;</span>
					<button type="submit"><i class="fa fa-plus"></i> Add</button>
				</label>
			</form>

			<h3>Visualizations</h3>

			<div id="visualizations-list">
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Type</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>

				<form id="add-visualization" class="form visualization">

					<label>
						<span>Name</span>
						<input type="text" name="name" placeholder="Name" required>
					</label>

					<label>
						<span>Type</span>
						<select name="type" required></select>
					</label>

					<label class="save">
						<span>&nbsp;</span>
						<button type="submit"><i class="fa fa-plus"></i> Add</button>
					</label>
				</form>
			</div>
		</section>

		<section class="section" id="visualization-preview">

			<div class="toolbar">
				<button id="visualization-back"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit" form="visualization-form"><i class="fa fa-save"></i> Save</button>
			</div>

			<form class="form" id="visualization-form">

				<label>
					<span>Name</span>
					<input type="text" name="name" value="${this.name}" required>
				</label>

				<label>
					<span>Type</span>
					<select name="type" required></select>
				</label>

				<div class="options"></div>
			</form>

			<div class="preview"></div>
		</section>
	`));
});

router.get('/users/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/users.css');
	template.scripts.push('/js/users.js');

	res.send(template.body(`

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
	`));
});

router.get('/connections/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/connections.css');
	template.scripts.push('/js/connections.js');

	res.send(template.body(`
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
			</header>

			<form class="block form" id="connections-form">

				<label>
					<span>Name</span>
					<input type="text" name="connection_name">
				</label>

				<label id="connections">
					<span>Type</span>
					<select name="type"></select>
				</label>

				<div id="details"></div>
			</form>
		</section>
	`));
});

router.get('/settings/:tab?/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/settings.css');
	template.scripts.push('/js/settings.js');

	res.send(template.body(`

		<nav></nav>

		<div class="setting-page datasets-page hidden">
			<section class="section" id="datasets-list">

				<h1>Datasets Manage</h1>

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
				</form>
			</section>
		</div>

		<div class="setting-page privilege-page hidden">
			<section class="section" id="privileges-list">
				<h1>Privileges Manage</h1>
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

				<h1>Roles Manager</h1>

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
	`));
});


class Template {

	constructor() {

		this.stylesheets = [
			'/css/main.css',
		];

		this.scripts = [
			'/js/main.js',
			'https://use.fontawesome.com/releases/v5.0.8/js/all.js" async defer f="',
			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		];
	}

	body(main) {

		this.stylesheets.push('/css/dark.css');

		return `<!DOCTYPE html>
			<html>
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
					<title></title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="https://lbxoezeogn43sov13789n8p9-wpengine.netdna-ssl.com/img/favicon.png" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + checksum + '">').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + checksum + '"></script>').join('')}
				</head>
				<body>
					<div id="ajax-working"></div>
					<header>
						<a class="logo" href="/dashboards"><img></a>

						<nav></nav>

						<span class="user-name"></span>
						<span class="logout">
							<i class="fa fa-power-off"></i>&nbsp;
							Logout
						</span>
					</header>
					<main>
						${main || ''}
					</main>
				</body>
			</html>
		`;
	}
}

module.exports = router;