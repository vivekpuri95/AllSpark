const API = require('../../utils/api');
const commonFun = require('../../utils/commonFunctions');
const auth = require('../../utils/auth');

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("visualization.insert", "ignore");

		const mandatoryData = ["dashboard_id", "visualization_id"];

		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = await auth.dashboard({dashboard: this.request.body.dashboard_id, userObj: this.user});

		this.assert(!authResponse.error, authResponse.message);

		this.assert(commonFun.isJson(this.request.body.format), "format is invalid");

		return await this.mysql.query(
			"INSERT INTO tb_visualization_dashboard (dashboard_id, visualization_id, format) VALUES (?, ?, ?)",
			[this.request.body.dashboard_id, this.request.body.visualization_id, this.request.body.format],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("visualization.delete", "ignore");

		const mandatoryData = ["id"];
		mandatoryData.map(x => this.assert(this.request.body[x], x + " is missing"));

		const authResponse = await auth.dashboard({dashboard: this.request.body.dashboard_id, user:this.user});

		this.assert(!authResponse.error, authResponse.message);

		return await this.mysql.query(
			"DELETE FROM tb_visualization_dashboard WHERE id = ?",
			[this.request.body.id],
			"write"
		);
	}
};


exports.updateFormat = class extends API {

	async updateFormat() {

		this.user.privilege.needs('visualization.update', 'ignore');

		const authResponse = await auth.dashboard({dashboard: this.request.body.dashboard_id, userObj: this.user});

		this.assert(!authResponse.error, authResponse.message);

		// Make sure the format is valid JSON
		this.assert(commonFun.isJson(this.request.body.format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_dashboard SET format = ? WHERE id = ? and (select true from tb_dashboards where id = ? and account_id = ?)',
			[this.request.body.format, this.request.body.id, this.request.body.dashboard_id, this.account.account_id],
			'write'
		);
	}
};


exports.update = class extends API {

	async update() {

		this.user.privilege.needs('visualization.update', 'ignore');

		const [dashboard] = await this.mysql.query(
			`SELECT * FROM tb_visualization_dashboard WHERE id = ?`,
			[this.request.body.id]
		);

		this.assert(dashboard, 'Invalid id');

		const
			values = {},
			columns = ['format', 'visualization_id'];

		for(const key in this.request.body) {

			if (columns.includes(key)) {

				values[key] = this.request.body[key] || null;
			}
		}

		const authResponse = await auth.dashboard({dashboard: dashboard.dashboard_id, userObj: this.user});

		this.assert(!authResponse.error, authResponse.message);

		// Make sure the format is valid JSON
		this.assert(commonFun.isJson(this.request.body.format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_dashboard SET ? WHERE id = ?',
			[values, this.request.body.id],
			'write'
		);
	}
};