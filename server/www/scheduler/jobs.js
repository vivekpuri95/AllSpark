const API = require("../../utils/api");
const parser = require('cron-parser');
const Job = require("../../utils/jobs/job");
const Task = require("../../utils/jobs/task");


class Jobs extends API {

	async list() {

		await this.mysql.query(
			"select * from tb_jobs where is_enabled = 1 and is_deleted = 0 and account_id = ?",
			[this.account.account_id],
			"write"
		)
	}

	async insert({cron_interval_string, name} = {}) {

		this.assert(cron_interval_string, "Cron String is not supplied");

		const interval = parser.parseExpression(cron_interval_string);
		let nextInterval;

		try {
			nextInterval = interval.next()._date._d;
		}
		catch (e) {

			this.assert(false, e);
		}

		return await this.mysql.query(
			`insert into 
				tb_jobs 
				(   
					name,
					account_id,
					cron_interval_string,
					next_interval,
					is_enabled,
					is_deleted,
					added_by
				)
				values
				(?,?,?,?,?,?)
				`,
			[name, this.account.account_id, cron_interval_string, nextInterval, 1, 0, this.user.user_id],
			"write"
		);
	}

	async update({job_id} = {}) {

		this.assert(job_id, "job id not found");

		const columns = new Set([
			`name`,
			`cron_interval_string`,
			`is_enabled`,
			`is_deleted`
		]);

		const updateData = {};

		Object.keys(this.request.body).filter(x => columns.has(x)).map(x => updateData[x] = this.request.body[x]);

		this.assert(Object.keys(updateData).length, "Nothing to Update");

		return await this.mysql.query(
			"update tb_tasks set ? where id = ?",
			[updateData, job_id],
			"write"
		)
	}

	async execute({job_id} = {}) {

		this.assert(job_id, "no job found");

		const [job] = await this.mysql.query(
			"select * from tb_jobs where job_id = ? and account_id = ? and is_enabled = 1 and is_deleted = 0",
			[job_id, this.account.account_id]
		);

		this.assert(job, "job not found");

		const jobTasks = await this.mysql.query(`
			select
				*
			from 
				tb_tasks t 
			join 
				tb_jobs j 
				using(job_id) 
			where
				job_id = ?
				and j.account_id = ? 
				and t.account_id = ?
				and j.is_enabled = 1
				and j.is_deleted = 0
				and t.is_enabled = 1 
				and t.is_deleted = 0
			`,
			[job_id, this.account.account_id, this.account.account_id],
		);

		const
			taskObjects = [],
			taskClassMapping = {
				none: Task
			},
			jobClassMapping = {
				none: Job
			}
		;

		for (const task of jobTasks) {

			taskObjects.push(new taskClassMapping[job.type](task));
		}

		const jobObject = new jobClassMapping[job.type](job, taskObjects);

		const jobResponse = await jobObject.load();

		this.assert(!jobResponse.error, jobResponse.message);

		return jobResponse.message
	}

	async run() {

		const [jobsNow, jobTasks] = await Promise.all(
			[
				this.mysql.query(`
				select
					j.*
				from 
					tb_jobs j
				join 
					tb_tasks t 
					using(job_id)
				where
					next_interval <= now() 
					and j.is_enabled = 1 
					and j.is_deleted = 0
					and t.is_enabled = 1 
					and t.is_deleted = 0
				group by 
					job_id
			`
				),
				this.mysql.query(`
					select
						t.*,
						j.next_interval,
						j.type
					from
						tb_jobs j
					join
						tb_tasks t
						using(job_id)
					where
						next_interval <= now() 
						and j.is_enabled = 1 
						and j.is_deleted = 0
						and t.is_enabled = 1 
						and t.is_deleted = 0
				`
				)
			]);

		if (!jobsNow.length) {

			return "no jobs found";
		}

		const
			jobTasksMapping = {},
			taskClassMapping = {
				none: Task
			},
			jobClassMapping = {
				none: Job
			}
		;

		for (const row of jobsNow) {

			jobTasksMapping[row.job_id] = {
				job: row,
				tasks: []
			}
		}

		for (const row of jobTasks) {

			if (jobTasksMapping[row.job_id]) {

				jobTasksMapping[row.job_id].tasks.push(new taskClassMapping[row.type](row));
			}
		}

		const responses = [];

		for (const job of Object.values(jobTasksMapping)) {

			if (!job.tasks.length && job.job.type === "none") {

				continue;
			}

			if(!job.job.type) {

				continue;
			}

			const jobObject = new jobClassMapping[job.job.type](job.job, job.tasks);

			const response = await jobObject.load();

			responses.push(response);
		}

		const total = responses.length, failed = (responses.filter(x => x.error)).length;

		return {
			total,
			successful: total - failed,
			failed
		}
	}
}

exports.execute = Jobs;
exports.run = Jobs;
exports.insert = Jobs;
exports.list = Jobs;