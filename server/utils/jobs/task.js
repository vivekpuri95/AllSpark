const apiRequest = require("../../www/reports/engine").APIRequest;
const commonFun = require("../commonFunctions");
const mysql = require("../mysql").MySQL;
const fetch = require('node-fetch');
const dbConfig = require('config').get("sql_db");
const {performance} = require("perf_hooks");


class Task {

	constructor(task) {

		this.task = task;
	}

	async load(params) {

		if (params) {

			this.externalParams = params;
		}

		try {

			await this.fetchInfo();

			const taskStartTime = performance.now();

			let response = await this.execute();

			const status = response.status;

			response = await response.json();
			this.taskRunTime = performance.now() - taskStartTime;

			if (!(status == 200 || response.status)) {

				throw({message: response});
			}

			await this.log(JSON.stringify(response));

			return {

				error: false,
				message: response
			}
		}

		catch (e) {

			await this.log(JSON.stringify(e.message), true);

			return {
				error: true,
				message: e.message
			}
		}
	}

	async fetchInfo() {

		if (parseInt(this.task) == this.task) {

			const [task] = await mysql.query(`
				select
					t.*,
					j.next_interval
				from
					tb_tasks t
				join
					tb_jobs j
					using(job_id)
				where
					task_id = ?
					and t.is_enabled = 1 
					and t.is_deleted = 0
					and j.is_enabled = 1
					and j.is_deleted = 0
				`,
				[this.task]
			);

			this.task = task;
		}

		if (!this.task) {

			this.error = "task or task's job not found";

			throw({
				error: false,
				message: this.error
			})
		}

		if (!commonFun.isJson(this.task.definition)) {

			this.error = "task definition is not proper object";

			throw({
				error: false,
				message: this.error
			})
		}

		if (!commonFun.isJson(this.task.parameters)) {

			this.error = "task parameters is not proper object"
		}

		this.task.definition = JSON.parse(this.task.definition);
		this.task.parameters = JSON.parse(this.task.parameters);

		if (this.externalParams) {

			this.task.parameters.push(this.externalParams)
		}

		this.fetchParameters = new apiRequest({definition: JSON.stringify(this.task.definition)}, this.task.parameters);

		this.finalQuery = this.fetchParameters.finalQuery;

		this.taskRequest = () => fetch(...this.finalQuery.request);

		this.error = 0;
	}

	async log(response, error) {

		const db = dbConfig.write.database.concat('_logs');

		await mysql.query(
			"insert into ??.tb_jobs_history (owner, successful, timing, owner_id, response, runtime) values(?, ?, ?, ?, ?, ?)",
			[db, "task", !(error || this.error) ? 1 : 0, this.task.next_interval, this.task.task_id, this.error || response, (this.taskRunTime || 0).toFixed(4)],
			"write"
		)
	}

	async execute() {

		const promise = commonFun.promiseTimeout(
			this.taskRequest(),
			this.task.timeout || 60,
		);

		return commonFun.promiseTimeout(promise, this.task.timeout);
	}
}


module.exports = Task;