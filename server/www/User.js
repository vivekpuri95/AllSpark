const constants = require("./constants");

class User {

    constructor(userObj) {
        this.privilege = privilege(userObj);
        this.role = roles(userObj);
    }
}


function privilege(userObj) {

    return {

        has: function(categoryId, privilegeName) {

            if (userObj.error) {

                throw(userObj.message);
            }

            for(const userPrivilege of userObj.privileges) {

                if((userPrivilege.name === constants.privilege[privilegeName] || constants.adminRole.includes(userPrivilege.privilege_id)) && categoryId === userPrivilege.category_id || constants.adminCategory.includes(userPrivilege.category_id)) {

                    return true;
                }
            }

            return false;
        },

        needs: function(categoryId, type) {

            if(this.has(...arguments)) {

                return 1
            }

            throw("The user does not have enough privileges for this action.");
        }
    }
}


function roles(userObj) {

    return {

        has: function(roleId, categoryId) {

            if (userObj.error) {

                throw(userObj.message);
            }

            for(const role of userObj.roles) {

                if((role.category_id === categoryId || constants.adminCategory.includes(role.category_id)) && roleId === role.role || constants.adminRole.includes(role.role)) {

                    return true;
                }
            }

            return false;

        },

        needs: function(categoryId, type) {

            if(this.has(...arguments)) {

                return 1
            }

            throw("The user does not have enough roles for this action.");
        }
    }
}

module.exports = User;