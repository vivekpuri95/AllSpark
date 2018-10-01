const Mailer = require('../utils/mailer');
const config = require("config");
const mysql = require("../mysql").MySQL;


class Contact {

	constructor(jobId) {

		this.jobId = jobId;
		this.types = new Map(["email",])
	}

	async getUsers() {

		if(!this.jobId) {

			return {
				error: true,
				message: "job id not found"
			}
		}

		const contactUsers = await mysql.query(`
			select 
				u.* 
			from
				tb_job_contacts jc
			join
				tb_users u 
				using(user_id)
			join tb_jobs j 
				using(job_id) 
			where 
				job_id = ? 
				and u.status = 1 
				and j.account_id = u.account_id`,
			[this.jobId]
		);

	}

	async send() {


	}

}

class Email extends Contact {

	constructor(jobId) {

		super(jobId);
	}
}