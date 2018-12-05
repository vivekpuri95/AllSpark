const API = require('../../utils/api');
const Requests = require('./requests');
const Approvers = require('./approvers');

class Approvals extends API {

	async approve({merge_request_id, status} = {}) {

		this.account.features.needs('merge-requests-module');

		this.assert(['approved', 'rejected'].includes(status), 'Invalid merge request status.');

		const mergeRequest = await this.findMergeRequest(merge_request_id);

		await this.validateApprover(mergeRequest);

		let [existingRow] = await this.mysql.query(
			'SELECT * FROM tb_merge_requests_approvals WHERE merge_request_id = ? AND user_id = ?',
			[merge_request_id, this.user.user_id]
		);

		if(existingRow) {

			await this.mysql.query(
				'UPDATE tb_merge_requests_approvals SET status = ? WHERE id = ?',
				[status, existingRow.id]
			);
		}

		else {

			let response = await this.mysql.query(`
				INSERT INTO tb_merge_requests_approvals (merge_request_id, user_id, status) VALUES (?, ?, ?)`,
				[merge_request_id, this.user.user_id, status]
			);

			existingRow = {id: response.insertId};
		}

		return await this.mysql.query(`
			SELECT * FROM tb_merge_requests_approvals where id = ?`,
			[existingRow.id]
		);
	}

	async findMergeRequest(id) {

		const
			requests = new Requests.list(this),
			mergeRequests = await requests.list({status: 'Open'}),
			[mergeRequest] = mergeRequests.filter(request => request.id == id);

		this.assert(mergeRequest, 'Invalid merge request ID or you don\'t have access to it.');

		return mergeRequest;
	}

	async validateApprover(mergeRequest) {

		const
			approvers = new Approvers.list(this),
			mergeRequestApprovers = await approvers.list({source: mergeRequest.source}),
			[mergeRequestApprover] = mergeRequestApprovers.filter(approver => approver.user_id == this.user.user_id);

		this.assert(mergeRequestApprover, 'You\'re not an approver for this merge request.');
	}
}

exports.approve = Approvals;