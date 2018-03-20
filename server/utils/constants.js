exports.saltrounds = 10;

exports.adminAccount = [0];

exports.adminCategory = [0];

exports.adminRole = [0];

exports.privilege = {
    administrator: "admin",
    user: "user",
    connection: "connection",
    dashboard: "dashboard",

    ignore_category: ['connection', 'dashboard']
};

exports.publicEndpoints = [
	'/v2/accounts/get',
	'/v2/authentication/login',
	'/v2/authentication/refresh',
	'/v2/authentication/reset',
	'/v2/authentication/resetLink',
    '/v2/authentication/tookan',
];
