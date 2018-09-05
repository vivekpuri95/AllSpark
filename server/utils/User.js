const constants = require("./constants");
const config = require("config");

class User {

	constructor(userObj) {

		Object.assign(this, userObj);

		this.privilege = privilege(userObj);
		this.role = roles(userObj);
	}
}


function privilege(userObj) {

	return {

		has: function (privilegeName, categoryId = 0) {

			if (config.has('privilege_ignore') && config.get('privilege_ignore')) {
				return true;
			}


			if (privilegeName === "superadmin") {

				return userObj.privileges.filter(x => x.privilege_name == privilegeName).length;
			}

			if (userObj.error) {

				throw(userObj.message);
			}

			const ignoreCategoryFlag = constants.privilege.ignore_category.includes(privilegeName) || categoryId == 'ignore';
			const ignorePrivilegeFlag = constants.privilege.ignore_privilege.includes(privilegeName);

			for (const userPrivilege of userObj.privileges) {

				if ((ignorePrivilegeFlag || userPrivilege.privilege_name === constants.privilege[privilegeName] || constants.adminRole.includes(userPrivilege.privilege_id)) && (categoryId === userPrivilege.category_id || constants.adminCategory.includes(userPrivilege.category_id) || ignoreCategoryFlag)) {

					return true;
				}
			}

			return !userObj.privileges.length && ignorePrivilegeFlag && ignoreCategoryFlag;
		},

		needs: function (privilegeName, categoryId = 0) {

			if (this.has(...arguments)) {

				return 1
			}

			throw("The user does not have enough privileges for this action.");
		}
	}
}


function roles(userObj) {

	return {

		has: function (roleId, categoryId) {

			if (config.has('role_ignore') && config.get('role_ignore')) {
				return true;
			}

			if (userObj.error) {

				throw(userObj.message);
			}

			for (const role of userObj.roles) {

				if ((role.category_id === categoryId || constants.adminCategory.includes(role.category_id)) && (roleId === role.role || constants.adminRole.includes(role.role))) {

					return true;
				}
			}

			return false;

		},

		needs: function (roleId, categoryId) {

			if (this.has(...arguments)) {

				return 1
			}

			throw("The user does not have enough roles for this action.");
		}
	}
}

module.exports = User;