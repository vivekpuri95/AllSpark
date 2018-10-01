const API = require("../../utils/api");

class  JobContacts extends API {

	async list({job_id} = {}) {

		return await this.mysql.query(`
			select 
				* 
			from 
				tb_job_contacts jc
			join
				tb_jobs
				using(job_id) 
			where
				(job_id = ? or ? = 0) 
				and account_id = ?
			`,
			[job_id || 0, job_id || 0, this.account.account_id]
		)
	}

	async insert({job_id, user_id, job_status, contact_type,}) {

		const [job] = await this.mysql.query(`select * from tb_jobs where job_id = ? and account_id = ?`, [job_id, this.account.account_id]);

		this.assert(job, "job not found");

		this.assert(job_id && user_id && contact_type, "Some parameters are missing");

		return await this.mysql.query(`
			insert into 
				tb_job_contacts
			(
				job_id,
				user_id,
				job_status,
				contact_type
			)
			values(?,?,?,?)
			`,
			[job_id, user_id, job_status, contact_type],
			"write"
		);
	}

	async update({id} = {}) {

		this.assert(id, "id not found");

		const fields = [
			"user_id",
			"job_status",
			"contact_type",
			"is_enabled",
			"is_deleted",
		];

		const [rowDetails] = await this.mysql.query(
			"select * from tb_job_contacts jc join tb_jobs using(job_id) where id = ? and account_id = ?",
			[id, this.account.account_id]
		);

		this.assert(rowDetails, "Details not found");

		this.assert(fields.some(x => this.request.body.hasOwnProperty(x)), "Nothing to update");

		const updateFields = {};

		for(const column of fields) {

			if(this.request.body.hasOwnProperty(column)) {

				updateFields[column] = this.request.body[column];
			}
		}

		await this.mysql.query(
			"update tb_job_contacts set ? where id = ?",
			[updateFields, id]
		)
	}
}

exports.list = JobContacts;
exports.insert = JobContacts;