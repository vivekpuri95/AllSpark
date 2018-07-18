const mysql = require('./mysql').MySQL;
const commonFun = require("./commonFunctions");
const config = require("config");
const getRole = require("../www/object_roles").get;
const constants = require("./constants");


class Authenticate {

	static async report(reportObject, userJWTObject, reportDashboardRoles,) {

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
                  IF(user_id IS NULL AND d.query_id is null, 0, 1) AS flag
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
                			target_id = ?
                			AND query_id = ?
                			AND OWNER = 'dashboard'
                			AND target = 'user'
                		UNION ALL
                		SELECT
                			NULL AS query_id
                		LIMIT 1
                	) d
                LEFT JOIN
				 tb_user_query uq ON
				 uq.query_id = q.query_id
				 AND user_id = ?
                WHERE
				q.query_id = ?
				AND is_enabled = 1
				AND is_deleted = 0
				AND account_id = ?
                `,
				[userJWTObject.user_id, reportObject, userJWTObject.user_id, reportObject, accountId]),

				objRole.get(userJWTObject.account_id, "query", "role", reportObject,),
			]);

			if (!reportObject.length && reportObject.length > 1) {

				return {
					error: true,
					message: "error in query details",
				}
			}
			const roles = reportObject[1].map(x => x.target_id);
			reportObject = reportObject[0][0];
			reportObject.roles = roles;
		}

		if((await Authenticate.connection(reportObject.connection_name, userJWTObject)).error) {

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
		}

		if (reportObject.flag) {

			return {
				error: false,
				message: "individual access",
			}
		}

		const userPrivileges = [];

		userJWTObject.roles && userJWTObject.roles.map(x => {
			userPrivileges.push([accountId, x.category_id, x.role]);
		});

		if (!(reportObject.roles && reportObject.roles.length)) {

			reportObject.roles = [null];
		}


		for (const row of reportDashboardRoles) {

			const objectRoles = [[row.account_id, row.category_id, row.target_id]];

			const authResponse = commonFun.authenticatePrivileges(userPrivileges, objectRoles);

			if (!authResponse.error) {

				return authResponse
			}
		}


		let objectPrivileges = [[reportObject.account_id], Array.isArray(reportObject.category_id) ? reportObject.category_id : [reportObject.category_id]];

		objectPrivileges[2] = reportObject.roles;

		objectPrivileges = commonFun.listOfArrayToMatrix(objectPrivileges);

		return commonFun.authenticatePrivileges(userPrivileges, objectPrivileges);
	}

	static async dashboard(dashboard_id, userObj) {

		const objRole = new getRole();

		let dashboardUserPrivileges, dashboardRoles;

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

		const [dashboard] = await mysql.query(`SELECT * FROM tb_dashboards WHERE id = ? `, [dashboard_id]);

		if (!dashboard) {

			return {
				error: true,
				message: "Dashboard does not exist.",
			};
		}

		[dashboardUserPrivileges, dashboardRoles] = await Promise.all([mysql.query(`
				SELECT
					*
				FROM
					tb_dashboards d
				LEFT JOIN
					tb_object_roles r
					ON r.owner_id = d.id
					AND OWNER = 'dashboard'
					AND target = 'user'
					AND owner_id = ?
					AND (category_id <= 0 OR category_id IS NULL)
				WHERE 
					d.id = ?
				`,
			[userObj.user_id, dashboard.id,]
		),

			objRole.get(dashboard.account_id, "dashboard", "role", dashboard.id,),
		]);

		dashboardUserPrivileges = dashboardUserPrivileges[0];

		if (dashboardUserPrivileges.added_by === userObj.user_id) {

			return {
				error: false,
				message: "Dashboard created by the current user.",
			};
		}

		if (dashboardUserPrivileges.target_id) {

			return {
				error: false,
				message: "Shared Dashboard to the current user.",
			};
		}

		dashboardRoles = dashboardRoles.map(x => [x.account_id, x.category_id, x.target_id]);

		for (const row of dashboardRoles) {

			let authResponse = await commonFun.authenticatePrivileges(userPrivileges, [row]);

			if (!authResponse.error) {

				return {
					error: false,
					message: "Dashboard shared with the role and category of current user.",
				}
			}
		}

		let dashboardQueryList = await mysql.query(`
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
			[dashboard_id],);

		if (!dashboardQueryList.length) {

			return {
				error: false,
				message: "No reports in the dashboard found",
			}
		}

		let reportRoles = await objRole.get(userObj.account_id, "query", "role", dashboardQueryList.map(x => x.query_id),);

		const reportRoleMapping = {};

		for (const row of reportRoles) {

			if (!reportRoleMapping[row.query_id]) {

				reportRoleMapping[row.query_id] = {
					roles: [],
					category_id: [],
				};

				reportRoleMapping[row.query_id].roles.push(row.target_id);
				reportRoleMapping[row.query_id].category_id.push(row.category_id);
			}
		}

		for (const query of dashboardQueryList) {

			if (!reportRoleMapping[query.query_id]) {

				query.roles = constants.adminRole;
				query.category_id = constants.adminCategory;
			}

			query.roles = [...new Set((reportRoleMapping[query.query_id] || {}).roles || null)];
			query.category_id = [...new Set((reportRoleMapping[query.query_id] || {}).category_id || null)];

			const authResponse = await Authenticate.report(query, userObj);

			if (authResponse.error) {

				return {
					error: true,
					message: "Not authenticated for Report id:" + query.query_id + ".",
				}
			}
		}

		return {
			error: false,
			message: "Privileged user.",
		}
	}

	static async connection(connectionObj, user) {

		if (!(user.roles && user.roles.length)) {

			return {
				error: true,
				message: "User does not have any role.",
			}
		}

		const objRole = new getRole();

		let userPrivileges = [], connectionRoles, userConnections;

		if(parseInt(connectionObj)) {

			connectionObj = await mysql.query(`SELECT * FROM tb_credentials WHERE id = ? AND status = 1`, [connectionObj]);

			connectionObj = connectionObj[0];

			if(!connectionObj) {

				return {
					"error": true,
					"message": 'Connection does not exist'
				};
			}
		}

		user.roles && user.roles.map(x => {
			userPrivileges.push([x.account_id, x.category_id, x.role]);
		});

		if(connectionObj.added_by == user.user_id) {

			return {
				error: false,
				message: "Private connection created by the current user.",
			};
		}

		[userConnections, connectionRoles] = await Promise.all([
			objRole.get(connectionObj.account_id, 'connection', 'user', connectionObj.id, user.user_id),
			objRole.get(connectionObj.account_id, 'connection', 'role', connectionObj.id,)
		]);
		connectionRoles = connectionRoles.map(x => [x.account_id, x.category_id, x.target_id]);

		if(userConnections[0]) {

			return {
				error: false,
				message: "Connection shared with the current user.",
			}
		}

		for (const row of connectionRoles) {

			let authResponse = await commonFun.authenticatePrivileges(userPrivileges, [row]);

			if (!authResponse.error) {

				return {
					error: false,
					message: "Connection shared with the role and category of current user.",
				}
			}
		}

		return {
			error: true,
			message: 'User not authenticated!'
		}

	}
}

module.exports = Authenticate;