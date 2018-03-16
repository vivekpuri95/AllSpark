"use strict";
const express = require('express')
const app = express();

app.use(express.static('./'));

app.get('/login', (req, res) => {

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
				<input id="submit" type="submit" value="Sign In">
			</div>
		</form>
		<div id="message" class="hidden"></div>
	`));
});

app.get('/login/forgot', (req, res) => {
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
				<a href='/login'><i class="fa fa-arrow-left" aria-hidden="true"></i> &nbsp;Login</a>
				<input id="submit" type="submit" value="Send Link">
			</div>
		</form>
		<div id="message" class="hidden"></div>
	`));
});

app.get('/login/reset', (req,res) => {
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

			<label>
				<input id="submit" type="submit" value="Change Password">
			</label>
		</form>
		<div id="message" class="hidden"></div>
	`));

});

app.get('/:type(dashboard|report)/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push();

	template.stylesheets = template.stylesheets.concat([
		'/css/dashboard.css',

		'//cdn.jsdelivr.net/bootstrap/3/css/bootstrap.css',
		'//cdn.jsdelivr.net/bootstrap.daterangepicker/2/daterangepicker.css',
	]);

	template.scripts = template.scripts.concat([
		'/js/dashboard.js',

		'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'//cdn.jsdelivr.net/jquery/1/jquery.min.js" defer f="',
		'//cdn.jsdelivr.net/momentjs/latest/moment.min.js" defer f="',
		'//cdn.jsdelivr.net/bootstrap.daterangepicker/2/daterangepicker.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	res.send(template.body(`

		<nav></nav>

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

			<div class="toolbar">

				<label>
					<button id="back">
						<i class="fa fa-arrow-left"></i>&nbsp;
						Back
					</button>
				</label>

				<label class="right">
					<input type="text" name="date-range">
				</label>
			</div>

			<div class="list"></div>
		</section>
	`));
});

app.get('/dashboards', (req, res) => {

	const template = new Template;

	template.stylesheets.push('css/dashboards.css');
	template.scripts.push('js/dashboards.js');

	res.send(template.body(`

		<section class="section show" id="list">
			<h1>Dashboard Manager</h1>
			<form class="toolbar">
				<input type="button" value="Add New" id="add-dashboard">
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
				<input type="button" value="Back" id="back">
				<input type="submit" value="Submit" form="dashboard-form">
			</div>

			<form class="block form" id="dashboard-form">
				<label>
					<span>Name</span>
					<input type="text" name="name">
				</label>
				<label>
					<span>Parent</span>
					<input type="number" name="parent">
				</label>
				<label>
					<span>Icon</span>
					<input type="text" name="icon">
				</label>
			</form>

			<h3>Reports</h3>
			<div class="form-container">
				<form class="report">
					<label><span>Report ID</span></label>
					<label><span>Position</span></label>
					<label><span>Span</span></label>
					<label class="save"><span></span></label>
					<label class="delete"><span></span></label>
				</form>

				<div id="reports-list"></div>

				<form id="add-report" class="report">

					<label>
						<input type="number" name="query_id" placeholder="Report ID" required>
					</label>

					<label>
						<input type="number" name="position" placeholder="Position" required>
					</label>

					<label>
						<input type="number" name="span" placeholder="Span" min="1" max="4" required>
					</label>

					<label class="save">
						<input type="submit" value="Add">
					</label>

					<label class="delete"></label>
				</form>
			</div>
		</section>

	`));
});

app.get('/reports/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/reports.css');
	template.scripts.push('/js/reports.js');
	template.scripts.push('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.9/ace.js');
	template.scripts.push('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.9/ext-language_tools.js');

	res.send(template.body(`

		<section class="section" id="list">

			<h1>Reports Manager</h1>
			<form class="toolbar filters filled">

				<input type="button" value="Add New" id="add-report">

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
							<th>Source</th>
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

			<header class="toolbar filled">
				<input type="button" value="Back" id="back">
				<input type="submit" value="Submit" form="report-form">

				<input type="button" class="right" value="Run" id="test">
				<input type="button" value="Force Run" id="force-test">
			</header>

			<div class="hidden" id="test-container">
				<h3>Execution Response
					<span id="row-count"></span>
					<span id="json" class="tab">JSON</span>
					<span id="table" class="tab">Table</span>
					<span id="query" class="tab">Query</span>
					<span title="Close" class="close">&times;</span>
				</h3>

				<div id="test-body">
					<div id="json-content"></div>
					<div id="table-content"></div>
					<div id="query-content"></div>
				</div>
			</div>

			<form class="form" id="report-form">

				<label>
					<span>Name</span>
					<input type="text" name="name">
				</label>

				<label id="source">
					<span>Type</span>
					<select name="source">
						<option value="query">Query</option>
						<option value="api">API</option>
					</select>
				</label>

				<label id="query" class="hidden">
					<span>Query</span>
					<div id="schema"></div>
					<div id="editor"></div>
				</label>

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
					<span>Description</span>
					<textarea name="description" required></textarea>
				</label>

				<label>
					<span>Tags (Comma Separated)</span>
					<input type="text" name="tags">
				</label>

				<label>
					<span>Requested By</span>
					<input type="text" name="requested_by">
				</label>
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

				<label>
					<span>Connection</span>
					<select name="connection_name" required></select>
				</label>

				<label style="max-width: 300px">
					<span>Added By</span>
					<span class="NA" id="added-by"></span>
				</label>
			</form>
			<h3>Filters</h3>

			<div id="missing-filters" class="hidden"></div>

			<div class="form-container">
				<form class="filter">
					<label><span>Name</span></label>
					<label><span>Placeholder</span></label>
					<label><span>Type</span></label>
					<label><span>Description</span></label>
					<label><span>Default Value</span></label>
					<label><span>Offset</span></label>
					<label><span>Dataset</span></label>
					<label><span>Status</span></label>
					<label class="save"><span></span></label>
					<label class="delete"><span></span></label>
				</form>

				<div id="filters-list"></div>

				<form id="add-filter" class="filter">

					<label>
						<input type="text" name="name" placeholder="Name" required>
					</label>

					<label>
						<input type="text" name="placeholder" placeholder="Placeholder" required>
					</label>

					<label>
						<select name="type" required>
							<option value="0">Integer</option>
							<option value="1">String</option>
							<option value="2">Date</option>
							<option value="3">Month</option>
							<option value="4">city</option>
						</select>
					</label>

					<label>
						<input type="text" name="description" placeholder="Description">
					</label>

					<label>
						<input type="text" name="default_value" placeholder="Default Value">
					</label>

					<label>
						<input type="text" name="offset" placeholder="Offset">
					</label>

					<label>
						<select name="dataset">
							<option value="">None</option>
						</select>
					</label>

					<label>
						<select name="is_enabled" required>
							<option value="1">Enabled</option>
							<option value="0">Disabled</option>
						</select>
					</label>

					<label class="save">
						<input type="submit" value="Add">
					</label>

					<label class="delete"></label>
				</form>
			</div>

			<h3>Visualizations</h3>
			<div class="form-container">
				<form class="visualization">
					<label><span>Name</span></label>
					<label><span>Type</span></label>
					<label><span>Status</span></label>
					<label class="save"><span></span></label>
					<label class="delete"><span></span></label>
				</form>

				<div id="visualizations-list"></div>

				<form id="add-visualization" class="visualization">

					<label>
						<input type="text" name="name" placeholder="Name" required>
					</label>

					<label>
						<select name="type" required>
							<option value="table">Table</option>
							<option value="spatialmap">Spatial Maps</option>
							<option value="funnel">Funnel</option>
							<option value="cohort">Cohort</option>
							<option value="line">Line</option>
							<option value="bar">Bar</option>
							<option value="area">Area</option>
							<option value="stacked">Stacked</option>
						</select>
					</label>

					<label>
						<select name="is_enabled" required>
							<option value="1">Enabled</option>
							<option value="0">Disabled</option>
						</select>
					</label>

					<label class="save">
						<input type="submit" value="Add">
					</label>

					<label class="delete"></label>
				</form>
			</div>
		</section>
	`));
});

app.get('/users/:id?', (req, res) => {

	const template = new Template;

	template.scripts.push('/js/users.js');

	res.send(template.body(`

		<section class="section" id="list">

			<h1>Manage Users</h1>

			<header class="toolbar">
				<input type="button" value="Add User" id="add-user">
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
				<input type="button" value="Cancel" id="cancel-form">
				<input type="submit" form="user-form" value="Submit">
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

				<label>
					<span>privileges</span>
					<select name="privileges" multiple>
						<option value="administrator">Administrator</option>
						<option value="user">Users</option>
						<option value="dashboards">Dashboards</option>
						<option value="queries">Queries</option>
						<option value="datasources">Data Sources</option>
					</select>
				</label>
			</form>
		</section>
	`));
});

app.get('/connections/:id?', (req, res) => {

	const template = new Template;

	template.scripts.push('/js/credentials.js');

	res.send(template.body(`
		<section class="section" id="list">

			<h1>Connection Manager</h1>

			<form class="toolbar filters">
				<input type="button" value="Add New" id="add-credentials">
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
				<input type="button" value="Back" id="back">
				<input type="submit" value="Submit" form="credentials-form">

				<input type="button" class="right" value="Test" id="test">
			</header>

			<form class="block form" id="credentials-form">

				<label>
					<span>Name</span>
					<input type="text" name="connection_name">
				</label>

				<label id="credentials">
					<span>Type</span>
					<select name="type"></select>
				</label>

				<div id="details"></div>
			</form>
		</section>
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
		];
	}

	body(main) {

		return `<!DOCTYPE html>
			<html>
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
					<title>Tookan Analytics</title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="https://lbxoezeogn43sov13789n8p9-wpengine.netdna-ssl.com/img/favicon.png" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="'+s+'">').join('')}
					${this.scripts.map(s => '<script src="'+s+'"></script>').join('')}
				</head>
				<body>
					<div id="ajax-working"></div>
					<header>
						<a class="logo" href="/"><img></a>

						<nav></nav>

						<span class="user-name"></span>
						<span class="logout">
							<i class="fa fa-power-off"></i>
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

if(!process.env.PORT)
	return console.error('Port not provided!');

app.listen(process.env.PORT, () => console.log(`Client listening on port ${process.env.PORT}!`));