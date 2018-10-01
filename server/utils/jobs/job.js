const commonFun = require("../commonFunctions");
const parser = require('cron-parser');
const mysql = require("../mysql").MySQL;
const dbConfig = require('config').get("sql_db");
const Task = require("./task");
const {performance} = require("perf_hooks");
const Contact = require("./contact");

class Job {

	constructor(job, tasks) {

		this.job = job;
		this.tasks = tasks;
	}

	async load() {

		await this.fetchInfo();
		await this.contact.getUsers();

		if (!this.tasks.length) {

			await this.log("no tasks in the job", false);
			await this.contact.send(0, "no tasks in the job");

			return {
				error: false,
				message: "no tasks in the job"
			}
		}

		try {

			const startTime = performance.now();

			await this.execute();
			this.jobRunTime = performance.now() - startTime;

			await this.log("Successful");
			await this.contact.send(1);
		}

		catch (e) {

			await this.log(e.message, true);
			await this.contact.send(0, e.message);

			return {
				error: true,
				message: e.message
			}
		}

		return {
			error: false,
			message: "Successful"
		}
	}

	async fetchInfo() {

		if (this.job == parseInt(this.job)) {

			const [job] = await mysql.query(
				"select * from tb_jobs where job_id = ? and is_enabled = 1 and is_deleted = 0",
				[this.job]
			);

			this.job = job;
		}

		if (!this.job || this.tasks) {

			this.error = "job or job tasks not found";
		}

		this.contact = new Contact(this.job.job_id);

		for (let taskIndex = 0; taskIndex < this.tasks.length; taskIndex++) {

			if (!(this.tasks[taskIndex] instanceof Task)) {

				this.tasks[taskIndex] = new Task(this.tasks[taskIndex]);
			}
		}

		this.error = 0;
	}

	async log(response, error) {

		const db = dbConfig.write.database.concat('_logs');

		await mysql.query(
			"insert into ??.tb_jobs_history (owner, successful, timing, owner_id, response, runtime) values(?, ?, ?, ?, ?, ?)",
			[db, "job", !(error || this.error) ? 1 : 0, this.job.next_interval, this.job.job_id, this.error || response, (this.jobRunTime|| 0).toFixed(4) ],
			"write"
		)
	}

	async execute() {

		const taskOrderMapping = {};

		for (const task of this.tasks) {

			if (!taskOrderMapping.hasOwnProperty(task.sequence)) {

				taskOrderMapping[task.sequence] = [];
			}

			taskOrderMapping[task.sequence].push(task);
		}

		let lastOrder, erred = false;

		for (const order of Object.keys(taskOrderMapping).sort()) {

			const promiseArr = taskOrderMapping[order].map(task => task.load());

			const tasksExecuteResponse = await commonFun.promiseParallelLimit(10, promiseArr);

			erred = tasksExecuteResponse.some(x => x.error);
			const fatal = taskOrderMapping[order].some(task => task.fatal);

			if (erred && fatal) {

				this.error = `Could not continue because some task erred out, tasks up to order ${lastOrder} finished.`;

				throw({
					error: true,
					message: this.error
				})
			}

			lastOrder = order;
		}

		let nextInterval = null;

		try {

			const interval = parser.parseExpression(this.job.cron_interval_string);
			nextInterval = interval.next()._date._d;
		}
		catch (e) {

			this.error = "All tasks in this job finished, but next next job time could not be updated, some issue in cron string";

			await mysql.query("update tb_jobs set next_interval = ? where job_id = ?", [nextInterval, this.job.job_id], "write");

			throw({
				error: true,
				message: this.error
			});
		}

		await mysql.query("update tb_jobs set next_interval = ? where job_id = ?", [nextInterval, this.job.job_id], "write");

		return {
			error: false,
			message: "Successful"
		}
	}
}

module.exports = Job;