const Mailer = require("../mailer");
const config = require("config");
const mysql = require("../mysql").MySQL;

class Contact {

	constructor(jobId) {

		this.jobId = jobId;
		this.types = new Map([["email", Email]]);
	}

	async getUsers() {

		if (!this.jobId) {

			return {
				error: true,
				message: "job id not found"
			}
		}

		if (this.jobId == parseInt(this.jobId)) {

			const [job] = await mysql.query("select * from tb_jobs where job_id = ?", [this.jobId]);
			this.job = job;
		}

		else {

			this.job = this.jobId;
			this.jobId = this.job.job_id;
		}

		this.users = await mysql.query(`
			select 
				u.*,
				jc.job_status,
				jc.contact_type
			from
				tb_job_contacts jc
			join
				tb_users u 
				using(user_id)
			join 
				tb_jobs j 
				using(job_id) 
			where 
				job_id = ? 
				and u.status = 1 
				and j.account_id = u.account_id
				and j.is_enabled = 1
				and j.is_deleted = 0
			`,
			[this.jobId]
		);

		this.account = await mysql.query("select * from tb_accounts where account_id = ? and status = 1", [this.job.account_id]);
	}

	async send(status, reason) {

		for (const user of this.users) {

			if (!this.types.has(user.contact_type)) {

				continue;
			}

			if (user.job_status == status) {

				const contact = new (this.types.get(user.contact_type))(user, this);
				await contact.send(reason);
			}
		}
	}
}

class Email {

	constructor(user, ctx) {

		this.user = user;
		Object.assign(this, ctx)
	}

	async send(reason) {

		const mailer = new Mailer();

		mailer.from_email = 'no-reply@' + config.get("mailer").get("domain");
		mailer.from_name = this.account.name;
		mailer.to.add(this.user.email);
		mailer.subject = `Job ${this.user.job_status ? "Completion" : "Failure"} alert`;
		mailer.html = `
			<strong>Job Name:</strong> ${this.job.name}.
			<br>
			<strong>Status:</strong> ${this.user.job_status ? "Ran Successfully" : "Failed because: " + reason}.
			<br>
			<strong>Start Time:</strong> ${this.job.next_interval.toString()}.
			<br>
		`;

		try {

			const [response] = await mailer.send();

			if (response.status === "rejected") {

				return response.reject_reason;
			}

			return "done"

		}
		catch (e) {

			return e.message;
		}
	}
}

module.exports = Contact;