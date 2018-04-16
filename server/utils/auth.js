const mysql = require('./mysql').MySQL;
const commonFun = require("./commonFunctions");
const config = require("config");

class Authenticate {

	static async report(reportObject, userJWTObject) {

		if(config.has("role_ignore") && config.has("privilege_ignore")) {

			if(config.get("role_ignore") && config.get("privilege_ignore")) {

				return true;
			}
		}

		const accountId = userJWTObject.account_id;

		if (parseInt(reportObject) || !reportObject) {

			reportObject = await mysql.query(`
                SELECT
                  q.*,
                  IF(user_id IS NULL, 0, 1) AS flag
                FROM
                    tb_query q
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
				[userJWTObject.user_id, reportObject, accountId]);

			if (!reportObject.length && reportObject.length > 1) {

				return {
					error: true,
					message: "error in query details",
				}
			}

			reportObject = reportObject[0];
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

		let objectPrivileges = [[reportObject.account_id], [reportObject.category_id]];

		objectPrivileges[2] = reportObject.roles ? reportObject.roles.split(',').map(x => parseInt(x)) : [null];

		objectPrivileges = commonFun.listOfArrayToMatrix(objectPrivileges);

		return commonFun.authenticatePrivileges(userPrivileges, objectPrivileges);
	}
}

module.exports = Authenticate;