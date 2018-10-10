const mysql = require('./mysql').MySQL;
const commonFun = require("./commonFunctions");
const config = require("config");
const getRole = require("../www/object_roles").get;
const constants = require("./constants");


class Authenticate {

	static async report(reportObject, userJWTObject, reportDashboardRoles,) {

		if(userJWTObject.privilege.has("superadmin")) {

			return {
				error: false,
				message: "superadmin user"
			}
		}

		if (config.has("role_ignore") && config.has("privilege_ignore")) {

			if (config.get("role_ignore") && config.get("privilege_ignore")) {

				return true;
			}
		}

		const objRole = new getRole();
		const accountId = userJWTObject.account_id;

		if (parseInt(reportObject) || !reportObject) {

			reportObject = await Promise.all([mysql.query(`
                SELECT
                  q.*,
                  IF(user_id IS NULL AND userDashboard.query_id IS NULL, 0, 1) AS flag,
                  c.type,
				  c.project_name
                FROM
				tb_query q
                JOIN
          			(
                		SELECT
                			query_id
                		FROM
                			tb_visualization_dashboard vd
                		JOIN
                			tb_object_roles r
                			ON vd.dashboard_id = r.owner_id
                		JOIN
                			tb_query_visualizations qv
                			USING(visualization_id)
                		WHERE
                			target_id = ? -- user_id
                			AND query_id = ?
                			AND OWNER = 'dashboard'
                			AND target = 'user'
                		UNION ALL
                		SELECT
                			NULL AS query_id
                		LIMIT 1
                	) userDashboard
                JOIN
				(
				    SELECT
				        owner_id AS user_id
				    FROM
				        tb_object_roles o
				    WHERE
				        owner_id = ? -- query
				        AND target_id = ? -- user
				        AND OWNER = 'query'
				        AND target = 'user'

				    UNION ALL

				    SELECT
				        NULL AS user_id

					LIMIT 1
				) AS queryUser

				JOIN
					tb_credentials c
				ON
					q.connection_name = c.id

                WHERE
					q.query_id = ?
					AND is_enabled = 1
					AND is_deleted = 0
					AND q.account_id = ?
					AND c.status = 1
                `,
				[userJWTObject.user_id, reportObject, reportObject, userJWTObject.user_id, reportObject, accountId, accountId]),

				objRole.get(userJWTObject.account_id, "query", "role", reportObject,),
			]);

			if (!reportObject.length && reportObject.length > 1) {

				return {
					error: true,
					message: "error in query details",
				}
			}
			const roles = reportObject[1].map(x => x.target_id);
			const categories = reportObject[1].map(x => x.category_id);
			reportObject = reportObject[0][0];
			reportObject.roles = roles;
			reportObject.category_id = categories;
		}

		if (reportObject.flag) {

			return {
				error: false,
				message: "individual access",
			}
		}

		if (reportObject.added_by === userJWTObject.user_id) {

			return {
				error: false,
				message: "Report created by the current user.",
			};
		}

		let connectionObj = reportObject.connectionObj || reportObject.connection_name;

		let connectionAuthResponse = await Authenticate.connection(connectionObj, userJWTObject)

		if (connectionAuthResponse.error) {

			return {
				error: true,
				message: 'Connection error'
			};
		}

		if (!reportDashboardRoles) {

			reportDashboardRoles = await mysql.query(`
					SELECT
						o.*
					FROM
						tb_query q
					JOIN
						tb_query_visualizations qv
						USING(query_id)
					JOIN
						tb_visualization_dashboard vd
						USING(visualization_id)
					JOIN
						tb_object_roles o
						on o.owner_id = vd.dashboard_id
					WHERE
						o.owner = "dashboard"
						AND o.target = "role"
						AND query_id = ?
				`,
				[reportObject.query_id ? reportObject.query_id : parseInt(reportObject) || 0]
			);

			const groupIdObject = {};

			for (const row of reportDashboardRoles) {

				if (!groupIdObject.hasOwnProperty(row.group_id)) {

					groupIdObject[row.group_id] = {...row, category_id: [row.category_id]};
				}

				else {

					groupIdObject[row.group_id].category_id.push(row.category_id);
				}
			}

			reportDashboardRoles = Object.values(groupIdObject)
		}

		const userPrivileges = [];

		userJWTObject.roles && userJWTObject.roles.map(x => {
			userPrivileges.push([accountId, x.category_id, x.role]);
		});

		if (!(reportObject.roles && reportObject.roles.length)) {

			reportObject.roles = [null];
		}


		for (const row of reportDashboardRoles) {

			const objectRoles = [];

			for(const categoryId of [...new Set(row.category_id)]) {

				objectRoles.push([row.account_id, categoryId, row.target_id]);
			}

			const authResponse = commonFun.authenticatePrivileges(userPrivileges, objectRoles);

			if (!authResponse.error) {

				return {...authResponse, message: authResponse.message + " : dashboard " + row.owner_id};
			}
		}

		if (!reportObject.roles.length && reportObject.added_by != userJWTObject.user_id) {

			return {
				error: true,
				message: "Report not shared with anyone and user did not create this report."
			}
		}

		let failedResponse = "";

		for (const categoryIds of reportObject.category_id) {

			let objectPrivileges = [[reportObject.account_id], Array.isArray(categoryIds) ? categoryIds : [categoryIds]];

			objectPrivileges[2] = reportObject.roles;

			objectPrivileges = commonFun.listOfArrayToMatrix(objectPrivileges);

			const authResponse = commonFun.authenticatePrivileges(userPrivileges, objectPrivileges);

			if (!authResponse.error) {

				return {...authResponse, message: authResponse.message + ` category_ids : ${categoryIds.join(", ")}}`};
			}

			failedResponse += `(${categoryIds.join(", ")}) : ${authResponse.message}\n`;
		}

		return {

			error: true,
			message: failedResponse,
		}

	}


	static async dashboard({userObj, dashboard = null, dashboardRoles, dashboardUserPrivileges, dashboardQueryList, visibleQueryList} = {}) {

		//dashboard = dashboard row.
		//dashboardRoles = object role owner dashboard, target dashboard row
		// query join query viz join dashboard viz
		//visibleQueryList = report/list

		//select * from tb_dashboards .
		// objectRoles dashboard user .
		//dashboard roles .
		//dashboard visualizations(query visualizations) .

		let userPrivileges = [];

		if (!(userObj.roles && userObj.roles.length)) {

			return {
				error: true,
				message: "User does not have any role.",
			}
		}

		for (const row of userObj.roles) {

			userPrivileges.push([userObj.account_id, row.category_id, row.role])
		}

		if (parseInt(dashboard) == dashboard) {

			[dashboard] = await mysql.query(`SELECT * FROM tb_dashboards WHERE id = ? `, [dashboard]);
		}

		if (!dashboard) {

			return {
				error: true,
				message: "Dashboard does not exist.",
			};
		}

		if (!dashboardUserPrivileges) {

			dashboardUserPrivileges = await mysql.query(`
				SELECT
					*
				FROM
					tb_dashboards d
				LEFT JOIN
					tb_object_roles r
					ON r.owner_id = d.id
					AND OWNER = 'dashboard'
					AND target = 'user'
					AND target_id = ?
					AND (category_id <= 0 OR category_id IS NULL)
				WHERE
					d.id = ?
					and owner_id = ?
				`,
				[userObj.user_id, dashboard.id, dashboard.id]
			)
		}

		const objRole = new getRole();

		if (!dashboardRoles) {

			dashboardRoles = await objRole.get(dashboard.account_id, "dashboard", "role", dashboard.id,)
			dashboardRoles = dashboardRoles.map(x => [x.account_id, x.category_id, x.target_id]);
		}

		dashboardUserPrivileges = dashboardUserPrivileges[0];

		if (dashboard.added_by === userObj.user_id) {

			return {
				error: false,
				message: "Dashboard created by the current user.",
			};
		}

		if (dashboardUserPrivileges && dashboardUserPrivileges.target_id) {

			return {
				error: false,
				message: "Shared Dashboard to the current user.",
			};
		}

		for (const row of dashboardRoles) {

			let objectPrivileges = [];

			for (const categoryId of row[1]) {

				objectPrivileges.push([row[0], categoryId, row[2]])
			}

			let authResponse = commonFun.authenticatePrivileges(userPrivileges, objectPrivileges);

			if (!authResponse.error) {

				return {
					error: false,
					message: `Dashboard shared with the category of current user. categories: ${row[1].join(", ")}`,
				}
			}
		}

		if (!dashboardQueryList) {

			dashboardQueryList = await mysql.query(`
				SELECT
					q.*
				FROM
					tb_visualization_dashboard vd
				JOIN
					tb_query_visualizations
					USING(visualization_id)
				JOIN
					tb_query q
					USING(query_id)
				WHERE
					vd.dashboard_id = ?
					AND q.is_enabled = 1
					AND q.is_deleted = 0
				`,
				[dashboard.id],);
		}

		const reportRoleMapping = {};

		if (!visibleQueryList) {

			let reportRoles = await objRole.get(userObj.account_id, "query", "role", dashboardQueryList.length ? dashboardQueryList.map(x => x.query_id) : 0,);

			for (const row of reportRoles) {

				if (!reportRoleMapping[row.owner_id]) {

					reportRoleMapping[row.owner_id] = {
						roles: [],
						category_id: [],
					};

					reportRoleMapping[row.owner_id].roles.push(row.target_id);
					reportRoleMapping[row.owner_id].category_id.push(row.category_id);
				}
			}

			for (const query of dashboardQueryList) {

				if (!reportRoleMapping[query.query_id]) {

					query.roles = constants.adminRole;
					query.category_id = constants.adminCategory;
				}

				query.roles = [...new Set((reportRoleMapping[query.query_id] || {}).roles || null)];
				query.category_id = [...new Set((reportRoleMapping[query.query_id] || {}).category_id || null)];
			}
		}

		for (const query of dashboardQueryList) {

			let authResponse;

			if (visibleQueryList) {

				authResponse = {
					error: !visibleQueryList.has(query.query_id || query)
				}
			}

			else {

				authResponse = await Authenticate.report(query, userObj);
			}

			if (!authResponse.error) {

				return {
					error: false,
					message: "authenticated for Report id:" + (query.query_id || query) + ".",
				}
			}
		}

		if (userObj.privilege.has("superadmin") || dashboard.added_by == userObj.user_id) {

			return {
				error: false,
				message: "superadmin user or dashboard added by current user"
			}
		}

		return {
			error: true,
			message: "not shared, superadmin or any added by current user",
		}
	}

	static async connection(connectionObj, user) {

		if(user.privilege.has("superadmin")) {

			return {
				error: false,
				message: "superadmin user"
			}
		}

		const objRole = new getRole();

		let userPrivileges = [], connectionRoles, userConnections;

		if (parseInt(connectionObj) == connectionObj) {

			connectionObj = await mysql.query(`
				SELECT
					*
				FROM
					tb_credentials c
				WHERE
					c.id = ?
					AND status = 1
				`, [connectionObj]);

			connectionObj = connectionObj[0];

			if (!connectionObj) {

				return {
					"error": true,
					"message": 'Connection does not exist'
				};
			}

			[connectionObj.users, connectionObj.role] = await Promise.all([
				objRole.get(connectionObj.account_id, 'connection', 'user', connectionObj.id, user.user_id),
				objRole.get(connectionObj.account_id, 'connection', 'role', connectionObj.id)
			]);
		}

		user.roles && user.roles.map(x => {
			userPrivileges.push([user.account_id, x.category_id, x.role]);
		});

		if (connectionObj.added_by == user.user_id) {

			return {
				error: false,
				message: "Private connection created by the current user.",
			};
		}

		userConnections = connectionObj.users;
		connectionRoles = connectionObj.role;

		connectionRoles = connectionRoles.map(x => [x.account_id, x.category_id, x.target_id]);

		if (userConnections[0]) {

			return {
				error: false,
				message: "Connection shared with the current user.",
			}
		}

		let failedResponse = "";

		for (const row of connectionRoles) {

			const objectPrivileges = [];

			for (const categoryId of row.category_id || row[1]) {

				objectPrivileges.push([row[0], categoryId, row[2]]);
			}

			let authResponse = commonFun.authenticatePrivileges(userPrivileges, objectPrivileges);

			if (authResponse.error) {

				failedResponse += `(${(row.category_id || row[1]).join(", ")}) : ${authResponse.message}\n`;
			}

			if (!authResponse.error) {

				return {
					error: false,
					message: `${authResponse.message} Categories: ${(row.category_id || row[1]).join(", ")}`
				}
			}
		}


		return {
			error: true,
			message: failedResponse
		}
	}

	static async visualization(visualization, user, report, visualizationRolesFromQuery = false) {

		if(user.privilege.has("superadmin")) {

			return {
				error: false,
				message: "superadmin user"
			}
		}

		if (parseInt(visualization) == visualization) {

			[visualization] = await mysql.query(`
				select
					qv.*,
					q.account_id
				from
					tb_query_visualizations qv
				join
					tb_query q
					using(query_id)
				where
					visualization_id = ?
					and q.is_enabled = 1
					and q.is_deleted = 0
			`, [visualization]);

			if (!visualization) {

				return {
					error: true,
					message: "invalid visualization",
				}
			}
		}

		if (user.user_id == visualization.added_by && user.user_id > 0) {

			return {
				error: false,
				message: "visualization added by the user."
			}
		}

		let reportAuth;

		if (report == parseInt(report)) {

			reportAuth = await Authenticate.report(report, user);
		}

		if (!report.skip) {

			if (report) {

				if (!Array.isArray(report)) {

					reportAuth = await Authenticate.report(report, user)
				}

				else {

					reportAuth = await Authenticate.report(...report, user)
				}
			}

			else {

				reportAuth = await Authenticate.report(visualization.query_id, user);
			}

			if (reportAuth.error) {

				return {
					error: true,
					message: "report error: " + reportAuth.message,
				}
			}

			else if(visualizationRolesFromQuery) {

				return {
					error: false,
					message: "visualizationRolesFromQuery"
				}
			}
		}

		if (!visualization.roles) {

			const objRole = new getRole();
			visualization.roles = await objRole.get(visualization.account_id, visualizationRolesFromQuery ? "report" : "visualization", "role", visualization.visualization_id);
		}

		if (!visualization.users) {

			const objRole = new getRole();
			visualization.users = await objRole.get(visualization.account_id, visualizationRolesFromQuery ? "report" : "visualization", "user", visualization.visualization_id);
		}

		if (visualization.users.some(x => x.target_id == user.user_id)) {

			return {
				error: false,
				message: "shared with user",
			}
		}

		let userPrivileges = [];

		if (!(user.roles && user.roles.length)) {

			return {
				error: true,
				message: "User does not have any role.",
			}
		}

		for (const row of user.roles) {

			userPrivileges.push([user.account_id, row.category_id, row.role]);
		}

		for (const row of visualization.roles.map(x => [x.account_id, x.category_id, x.target_id])) {

			const objectRoles = [];

			for (const categoryId of row[1]) {

				objectRoles.push([row[0], categoryId, row[2]]);
			}

			const authResponse = commonFun.authenticatePrivileges(userPrivileges, objectRoles);

			if (!authResponse.error) {

				return {
					error: false,
					message: `Visualization shared with the role and category of current user category_ids: ${row[1].join(", ")}`,
				}
			}
		}

		if (user.privilege.has('administrator')) {

			return {
				error: false,
				message: "user is admin",
			}
		}

		return {
			error: true,
			message: "Visualization not shared with the user of user's role, and its not created by the user",
		}
	}
}

module.exports = Authenticate;