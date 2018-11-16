const API = require('../utils/api');
const auth = require("../utils/auth");
const report = require("./reports/report");

class MergeRequests extends API {

	async list() {

		const [mergeRequestList, mergeRequestApprovals] = await Promise.all([
			this.mysql.query(`
				select
					m.*
				from
					tb_merge_requests m 
				join 
					tb_query q
				on
					m.owner_id = q.query_id
				where 
					q.account_id = ?
					and m.account_id = ?
					and q.is_deleted = 0
					and m.owner = "query"
		`,
			[this.account.account_id, this.account.account_id]),

			this.mysql.query(`
				SELECT
					ma.*
				FROM
					tb_merge_requests m
				JOIN
					tb_merge_requests_approvals ma
				ON
					m.id = ma.merge_request_id
				JOIN 
					tb_query q
				ON
					m.owner_id = q.query_id
				WHERE 
					q.account_id = ?
					AND m.account_id = ?
					AND q.is_deleted = 0
					AND m.owner = "query"
			`,
				[this.account.account_id, this.account.account_id])

		]);

		const mergeRequestObj = {};

		mergeRequestList.forEach(x => mergeRequestObj[x.id] = {...x, approvals: []});

		mergeRequestApprovals.forEach(x => mergeRequestObj[row.merge_request_id].approvals.push(x));

		const reportObj = new report.list();
		Object.assign(reportObj, this);


		const visibleReports = new Set((await reportObj.list()).map(x => x.query_id));

		return Object.values(mergeRequestObj).filter(x => visibleReports.has(x.owner_id) && visibleReports.has(x.target_id));
	}

	async insert() {

		this.user.privilege.needs('report.insert', 'ignore');

		const columns = [
			"owner",
			"owner_id",
			"target_id",
		];

		this.assert(columns.every(x => x in this.request.body), columns.join(', ') + ' required');

		this.validateMergeRequestOwner({
			owner: this.request.body.owner,
			owner_id: this.request.body.owner_id,
			target_id: this.request.body.target_id,
		})

		return await this.mysql.query(`
			insert into 
				tb_merge_requests
				(
					owner,
					owner_id,
					target_id,
					account_id,
					added_by
				)
				values (?, ?, ?, ?, ?)
		`,
			columns.map(x => this.request.body[x]).concat(this.account.account_id, this.user.user_id)
		)
	}

	async update({id}) {

		this.assert(id, "No Id found to Update");

		const [mergeRequest] = await this.mysql.query(`select * from tb_merge_requests where id = ?`, [id]);

		this.assert(mergeRequest, "No data found for the given id");

		await this.validateMergeRequestOwner(mergeRequest);

		const columns = [
			'owner',
			'target_id',
			'status'
		];

		if(!columns.some(x => x in this.request.body)) {

			return "Nothing to update.";
		}

		const filteredRequest = columns.reduce((obj, key) => (this.request.body[key] ? {
			...obj,
			[key]: this.request.body[key]
		} : obj), {});

		await this.validateMergeRequestOwner(mergeRequest);

		return await this.mysql.query(`
			update tb_merge_requests
			set ? where id = ?
		`,
			[filteredRequest, id],
			"write");
	}

	async delete({id}) {

		this.assert(id, "No Id found to delete");

		const [mergeRequest] = await this.mysql.query(`select * from tb_merge_requests where id = ?`, [id]);

		this.assert(mergeRequest, "No data found for the given id");

		await this.validateMergeRequestOwner(mergeRequest);

		return await this.mysql.query(`update tb_merge_requests set status = 0 where id = ?`, [id], "write");
	}

	async validateMergeRequestOwner(row) {

		const ownerAuthMapping = {
			'query': auth.report,
		};

		const authResponse = await Promise.all([

			ownerAuthMapping[row.owner](row.owner_id, this.user),
			ownerAuthMapping[row.owner](row.target_id, this.user),
		]);

		this.assert(authResponse.every(x => !x.error), authResponse.filter(x => x.error).map(x => x.message).join(", "));

		const approvers = await this.mysql.query(`
			select 
				m.* 
			from 
				tb_merge_requests_approvers m
			join
				tb_users u 
				using(user_id)
			where
				u.status = 1
				and u.account_id = ? 
				and user_id = ?
		`,
			[this.account.account_id, this.user.user_id]
		);

		this.assert(
			approvers.length || this.user.privileges.has('superadmin') || row.added_by == this.user.user_id,
			"User is neither a superadmin, approver or created this pull request"
		);
	}
}

exports.list = MergeRequests;
exports.insert = MergeRequests;
exports.update = MergeRequests;
exports.delete = MergeRequests;