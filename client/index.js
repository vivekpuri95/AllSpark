"use strict";

const express = require('express');
const router = express.Router();
const compression = require('compression');
const config = require('config');
const {promisify} = require('util');
const fs = require('fs');

const checksum = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();

router.use(compression());

router.use(express.static('./client'));

router.get('/service-worker.js', async (request, response) => {

	response.setHeader('Content-Type', 'application/javascript');
	response.send([
		await (promisify(fs.readFile))('client/js/service-worker.js', {encoding: 'utf8'}),
		`'${checksum}'`
	].join('\n'));
});

router.get('/login', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/login.css');
	template.scripts.push('/js/login.js');

	response.send(template.body(`

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

router.get('/login/forgot', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/login.css');
	template.scripts.push('/js/forgotpassword.js');

	response.send(template.body(`

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

router.get('/login/reset', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/login.css');

	template.scripts.push('/js/resetpassword.js');

	response.send(template.body(`

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

router.get('/user/profile/edit', (request, response) => {
	const template = new Template(request, response);
	template.scripts.push('/js/user/profile/edit.js');

	response.send(template.body(`
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

router.get('/user/profile/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/profile.css');
	template.scripts.push('/js/profile.js');

	response.send(template.body(`
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

router.get('/:type(dashboard|report)/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push();

	template.stylesheets = template.stylesheets.concat([
		'/css/dashboard.css',
	]);

	template.scripts = template.scripts.concat([
		'/js/dashboard.js',

		'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	response.send(template.body(`

		<nav>
			<div class="NA"><i class="fa fa-spinner fa-spin"></i></div>
		</nav>

		<section class="section" id="list">
			<h2>${request.params.type}</h2>

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
					<i class="fas fa-share-alt"></i>
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
				<span class="left-arrow"><i class="fas fa-angle-double-left"></i></span>
			</button>
		</section>
	`));
});

router.get('/dashboards/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/dashboards.css');

	template.scripts.push('/js/dashboards.js');

	response.send(template.body(`

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
						<option value="public">Public</option>
						<option value="private">Private</option>
					</select>
				</label>
			</form>

			<h2 class="share-heading">Share dashboards</h2>

			<form class="block form" id="dashboard_share">
				<select name="user_list" multiple></select>
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
				<tbody>
				</tbody>
			</table>
		</section>
	`));
});

router.get('/reports-new/:stage?/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/reports-new.css');

	template.scripts = template.scripts.concat([
		'/js/reports-new.js',

		'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js',

		// 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		// 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	response.send(template.body(`

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

					<label>
						<span>Format</span>
						<textarea name="format"></textarea>
					</label>
				</form>
			</section>

			<section class="section" id="stage-define-report">

				<header class="toolbar">
					<button type="submit" form="define-report-form"><i class="fa fa-save"></i> Save</button>
					<button id="schema-toggle"><i class="fas fa-database"></i> Schema</button>
					<button id="filters-toggle"><i class="fas fa-filter"></i> Filters</button>
					<button id="preview-toggle"><i class="fas fa-eye"></i> Preview</button>
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
									<select name="type" required>
										<option value="0">Integer</option>
										<option value="1">String</option>
										<option value="2">Date</option>
										<option value="3">Month</option>
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
							</form>
						</div>
					</div>
				</div>
			</section>

			<section class="section" id="stage-configure-visualization">

				<div class="toolbar">
					<button type="submit" form="configure-visualization-form"><i class="fa fa-save"></i> Save</button>
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
								<span>Type</span>
								<select name="type" required></select>
							</label>
						</div>
					</div>

					<div class="configuration-section">
						<h3><i class="fas fa-angle-right"></i> Options</h3>
						<div class="options form body"></div>
					</div>
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

			<section class="section" id="add-visualization-picker">

				<div class="toolbar">
					<button id="visualization-picker-back"><i class="fas fa-arrow-left"></i> Back</button>
					<button type="submit" form="add-visualization-form"><i class="fas fa-save"></i> Save</button>
				</div>

				<form id="add-visualization-form"></form>

			</section>
		</div>

		<div id="preview" class="hidden"></div>
	`));
});

router.get('/:type(reports|visualization)/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/reports.css');

	template.scripts = template.scripts.concat([
		'/js/reports.js',

		'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js',

		'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	response.send(template.body(`

		<div class="notice">Try out the <a href="/reports-new">new reports editor</a>!</div>

		<section class="section" id="list">

			<h1>Reports Manager</h1>
			<form class="toolbar filters">

				<button type="button" id="add-report">
					<i class="fa fa-plus"></i>
					Add New Report
				</button>
			</form>

			<div id="list-container">
				<table class="block">
					<thead>
						<tr class="table-search"></tr>
						<tr class="table-head">
							<th class="sort" title="query_id" >ID<i class="fa fa-sort"></th>
							<th class="sort" title="name" >Name<i class="fa fa-sort"></th>
							<th class="sort" title="description" >Description<i class="fa fa-sort"></th>
							<th title="connection">Connection</th>
							<th title="tags">Tags</th>
							<th class="sort" title="filters" >Filters<i class="fa fa-sort"></th>
							<th class="sort" title="visualizations" >Visualizations<i class="fa fa-sort"></th>
							<th title="is_enabled">Enabled</th>
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
				<button id="import"><i class="fa fa-upload"></i> Import</button>

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
					<span>Query <span id="full-screen-editor" title="Full Screen Editor"><i class="fas fa-expand"></i></span></span>
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

				<div id="transformations-container">
					<span>Transformations</span>
					<div id="transformations"></div>
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

					<select id=redis>
						<option value="0">Disabled</option>
						<option value="EOD">EOD</option>
						<option value="custom">Custom<custom>
					</select>

					<input name="is_redis" class= "hidden" value="0" min="1">
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
					<input type="text" name="name" required>
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

router.get('/users/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/users.css');
	template.scripts.push('/js/users.js');

	response.send(template.body(`

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

router.get('/connections/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/connections.css');
	template.scripts.push('/js/connections.js');

	response.send(template.body(`
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
	`));
});

router.get('/settings/:tab?/:id?', (request, response) => {

	const template = new Template(request, response);

	template.stylesheets.push('/css/settings.css');
	template.scripts.push('/js/settings.js');

	response.send(template.body(`

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
                        <img src="" alt="icon" id="icon" height="30">
                        <input type="text" name="icon">
                    </label>
                    <label>
                        <span>Logo</span>
                        <img src="" alt="logo" id="logo" height="30">
                        <input type="text" name="logo">
                    </label>

					<label id="format">
						<span>Settings</span>
						<textarea id="settings-format" name="settings"></textarea>
					</label>

                </form>
            </section>
		</div>
	`));
});

class Template {

	constructor(request, response) {

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

	body(main) {

		this.stylesheets.push('/css/dark.css');

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<meta name="theme-color" content="#fff">
					<title></title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="https://lbxoezeogn43sov13789n8p9-wpengine.netdna-ssl.com/img/favicon.png" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + checksum + '">').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + checksum + '"></script>').join('')}

					<link rel="manifest" href="/manifest.webmanifest">
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