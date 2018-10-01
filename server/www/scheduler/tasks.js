const API = require("../../utils/api");
const commonFun = require("../../utils/commonFunctions");

class Tasks extends API {

	async list() {

		//this.user.privilege.needs("tasks", "ignore");

		return await this.mysql.query(
			"select * from tb_tasks t where is_enabled = 1 and is_deleted = 0 and account_id = ?",
			[this.account.account_id]
		);
	}

	async insert() {

		//this.user.privilege.needs("tasks", "ignore");

		const columns = [
			`name`,
			`job_id`,
			`definition`,
			`parameters`,
			`timeout`,
			`order_id`,
		];

		this.assert(columns.every(x => Object.keys(this.request.body).includes(x)), "not all required fields available");

		this.assert(commonFun.isJson(this.request.body.definition), "Definition is not a json");
		this.assert(commonFun.isJson(this.request.body.parameters), "parameters is not a json");

		const
			definition = JSON.parse(this.request.body.definition),
			parameters = JSON.parse(this.request.body.parameters);

		return await this.mysql.query(
			`insert into 
				tb_tasks 
				(
					job_id,
					account_id,
					definition,
					parameters,
					timeout,
					order_id,
					fatal,
					added_by
				)
			values
				(?,?,?,?,?,?,?,?)
			`,
			[
				this.request.body.job_id, this.account.account_id, JSON.stringify(definition, 0, 1),
				JSON.stringify(parameters, 0, 1), this.request.body.timeout || 0, this.request.body.order_id,
				this.request.body.fatal || 0, 1
			]
		)
	}

	async update({id} = {}) {

		//this.user.privilege.needs("tasks", "ignore");

		this.assert(id, "Task Id not found");

		const columns = new Set([
			`name`,
			`job_id`,
			`definition`,
			`parameters`,
			`timeout`,
			`order_id`,
			`fatal`,
			`is_enabled`,
			`is_deleted`
		]);

		const updateData = {};

		Object.keys(this.request.body).filter(x => columns.has(x)).map(x => updateData[x] = this.request.body[x]);

		this.assert(Object.keys(updateData).length, "Nothing to Update");

		return await this.mysql.query(
			"update tb_tasks set ? where id = ?",
			[updateData, id],
			"write"
		)
	}
}

exports.list = Tasks;
exports.insert = Tasks;
exports.update = Tasks;