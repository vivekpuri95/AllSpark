exports.saltrounds = 10;

exports.adminAccount = [0];

exports.adminCategory = [0];

exports.adminRole = [0];

exports.privilege = {
	administrator: "admin",
	user: "user",
	connection: "connection",
	dashboard: "dashboard",
	report: "report",
	superadmin: "superadmin",
	ignore_category: ['connection', 'dashboard']
};

exports.publicEndpoints = [
	'/v2/accounts/get',
	'/v2/authentication/login',
	'/v2/authentication/refresh',
	'/v2/authentication/reset',
	'/v2/authentication/resetLink',
	'/v2/scope/scopeAuth',
	'/v2/accounts/signup',
	'/v2/oauth/connections/redirect_uri',
	'/v2/session-logs/insert',
];

exports.filterPrefix = "param_";

exports.external_parameter_prefix = "ext_";

exports.saveQueryResultDb = "save_history";

exports.saveQueryResultTable = "tb_save_history";

exports.filterTypes = [
	{
		name: 'Number',
		input_type: 'number',
	},
	{
		name: 'Text',
		input_type: 'text',
	},
	{
		name: 'Date',
		input_type: 'date',
	},
	{
		name: 'Month',
		input_type: 'month',
	},
	{
		name: 'DateTime',
		input_type: 'datetime-local',
	},
	{
		name: 'Hidden',
		input_type: 'hidden',
	},
	{
		name: 'Column',
		input_type: 'text',
	},
	{
		name: 'DateRange',
		input_type: '',
	},
];