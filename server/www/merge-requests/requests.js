const API = require('../../utils/api');
const auth = require("../../utils/auth");
const report = require("./../reports/report");

class Requests extends API {

	async list({status = 'open'} = {}) {

		this.account.features.needs('merge-requests-module');

		const [mergeRequestList, mergeRequestApprovals] = await Promise.all([
			this.mysql.query(`
				select
					m.*,
					CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) user_name
				from
					tb_merge_requests m
				join
					tb_query q
				on
					m.source_id = q.query_id
				join
					tb_users u
				on
					m.added_by = u.user_id AND m.account_id
				where
					q.account_id = ?
					and m.account_id = ?
					and q.is_deleted = 0
					and (m.status = ? or ? = '')
		`,
				[this.account.account_id, this.account.account_id, status, status]),

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
					m.source_id = q.query_id
				WHERE
					q.account_id = ?
					AND m.account_id = ?
					AND q.is_deleted = 0
					and (m.status = ? or ? = '')
			`,
				[this.account.account_id, this.account.account_id, status, status])

		]);

		const mergeRequestObj = {};

		mergeRequestList.forEach(x => mergeRequestObj[x.id] = {...x, approvals: []});

		mergeRequestApprovals.forEach(x => mergeRequestObj[row.merge_request_id].approvals.push(x));

		const reportObj = new report.list();
		Object.assign(reportObj, this);

		const visibleReports = new Set((await reportObj.list()).map(x => x.query_id));

		return Object.values(mergeRequestObj).filter(x => visibleReports.has(x.source_id) && visibleReports.has(x.destination_id));
	}

	async insert() {

		this.account.features.needs('merge-requests-module');

		this.user.privilege.needs('report.insert', 'ignore');

		const columns = [
			"title",
			"source",
			"source_id",
			"destination_id",
		];

		this.assert(columns.every(x => x in this.request.body), columns.join(', ') + ' required');

		this.assert(this.request.body.source_id != this.request.body.destination_id, 'Source cannot be the same as Destination');

		this.validateMergeRequestOwner({
			source: this.request.body.source,
			source_id: this.request.body.source_id,
			destination_id: this.request.body.destination_id,
		})

		return await this.mysql.query(`
			insert into
				tb_merge_requests
				(
					source,
					source_id,
					destination_id,
					account_id,
					added_by
				)
				values (?, ?, ?, ?, ?)
		`,
			columns.map(x => this.request.body[x]).concat(this.account.account_id, this.user.user_id)
		)
	}

	async update({id}) {

		this.account.features.needs('merge-requests-module');

		this.assert(id, "No Id found to Update");

		const [mergeRequest] = await this.mysql.query(`select * from tb_merge_requests where id = ?`, [id]);

		this.assert(mergeRequest, "No data found for the given id");

		await this.validateMergeRequestOwner(mergeRequest);

		const columns = [
			'title',
			'source',
			'source_id',
			'destination_id',
			'status'
		];

		if(!columns.some(x => x in this.request.body)) {

			return "Nothing to update.";
		}

		const filteredRequest = columns.reduce((obj, key) => (this.request.body[key] ? {
			...obj,
			[key]: this.request.body[key]
		} : obj), {});

		console.log('-------', filteredRequest);

		await this.validateMergeRequestOwner(mergeRequest);

		return await this.mysql.query(`
			update tb_merge_requests
			set ? where id = ?`,
			[filteredRequest, id],
			"write"
		);
	}

	async delete({id}) {

		this.account.features.needs('merge-requests-module');

		this.assert(id, "No Id found to delete");

		const [mergeRequest] = await this.mysql.query(`select * from tb_merge_requests where id = ?`, [id]);

		this.assert(mergeRequest, "No data found for the given id");

		await this.validateMergeRequestOwner(mergeRequest);

		return await this.mysql.query(`update tb_merge_requests set status = 0 where id = ?`, [id], "write");
	}

	async validateMergeRequestOwner(row) {

		const ownerAuthMapping = {
			'report': auth.report,
		};

		const authResponse = await Promise.all([

			ownerAuthMapping[row.source](row.source_id, this.user),
			ownerAuthMapping[row.source](row.destination_id, this.user),
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
				and source = ?
		`,
			[this.account.account_id, this.user.user_id, row.source]
		);

		this.assert(
			approvers.length || this.user.privilege.has('superadmin') || row.added_by == this.user.user_id,
			"User is neither a superadmin, approver or created this pull request"
		);
	}
}

exports.list = Requests;
exports.insert = Requests;
exports.update = Requests;
exports.delete = Requests;