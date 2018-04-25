const API = require('../../utils/api');
const commonFun = require('../../utils/commonFunctions');
const auth = require('../../utils/auth');

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("dashboard");

		const mandatoryData = ["dashboard_id", "visualization_id"];

		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = auth.dashboard(this.request.body.dashboard_id, this.user);

		this.assert(!authResponse.error, authResponse.message);


		return await this.mysql.query(
			"INSERT INTO tb_visualization_dashboard (dashboard_id, visualization_id, format) VALUES (?, ?, ?)",
			[this.request.body.dashboard_id, this.request.body.query_id],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("dashboard");

		const mandatoryData = ["dashboard_id", "visualization_id"];
		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = auth.dashboard(this.request.body.dashboard_id, this.user);

		this.assert(!authResponse.error, authResponse.message);

		return await this.mysql.query(
			"DELETE FROM tb_visualization_dashboard WHERE visualization_id = ? AND dashboard_id = ?",
			[this.request.body.query_id, this.request.body.dashboard_id],
			"write"
		);
	}
};


exports.updateFormat = class extends API {

	async updateFormat() {

		this.user.privilege.needs('dashboard');

		const authResponse = auth.dashboard(this.request.body.dashboard_id, this.user);

		this.assert(!authResponse.error, authResponse.message);

		// Make sure the format is valid JSON
		this.assert(commonFun.isJson(this.request.body.format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_dashboard SET format = ? WHERE dashboard_id = ? and account_id = (select account_id from tb_dashboard where id = ?)',
			[this.request.body.format, this.request.body.id, this.account.account_id],
			'write'
		);
	}
};


exports.update = class extends API {

	async update() {

		this.user.privilege.needs('dashboard');

		const
			values = {},
			columns = ['dashboard_id', 'visualization_id', 'visibility'];

		for(const key in this.request.body) {

			if (columns.includes(key)) {

				values[key] = this.request.body[key] || null;
			}
		}

		const authResponse = auth.dashboard(this.request.body.dashboard_id, this.user);

		this.assert(!authResponse.error, authResponse.message);

		// Make sure the format is valid JSON
		this.assert(commonFun.isJson(this.request.body.format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_dashboard SET ? WHERE dashboard_id = ? and account_id = (select account_id from tb_dashboard where id = ?)',
			[this.request.body.format, this.request.body.id, this.account.account_id],
			'write'
		);
	}
};