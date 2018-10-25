const API = require('../../utils/api');
const commonFun = require('../../utils/commonFunctions');
const auth = require('../../utils/auth');

exports.insert = class extends API {

	async insert({owner, owner_id, visualization_id, format = null} = {}) {

		this.user.privilege.needs("visualization.insert", "ignore");

		const mandatoryData = [owner, owner_id, visualization_id];

		mandatoryData.map(x => this.assert(x, 'Owner, Owner Id and Visualization Id required'));

		if(owner == 'dashboard') {

			const authResponse = await auth.dashboard({dashboard: owner_id, userObj: this.user});
			this.assert(!authResponse.error, authResponse.message);
		}

		this.assert(commonFun.isJson(format), "format is invalid");

		return await this.mysql.query(
			"INSERT INTO tb_visualization_canvas (owner, owner_id, visualization_id, format) VALUES (?, ?, ?, ?)",
			[owner, owner_id, visualization_id, format],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete({id} = {}) {

		this.user.privilege.needs("visualization.delete", "ignore");

		this.assert(id, 'Id is missing')

		const [canvasRow] = await this.mysql.query("select * from tb_visualization_canvas where id = ?", [id]);

		this.assert(canvasRow, "Visualization row not found, incorrect id");

		if(canvasRow.owner == 'dashboard') {

			const authResponse = await auth.dashboard({dashboard: canvasRow.owner_id, userObj: this.user});
			this.assert(!authResponse.error, authResponse.message);
		}

		return await this.mysql.query(
			"DELETE FROM tb_visualization_canvas WHERE id = ?",
			[id],
			"write"
		);
	}
};


exports.updateFormat = class extends API {

	async updateFormat({id, owner, owner_id, format}) {

		this.user.privilege.needs('visualization.update', 'ignore');

        if(owner != 'dashboard') {

        	return;
        }

        const authResponse = await auth.dashboard({dashboard: owner_id, userObj: this.user});

        this.assert(!authResponse.error, authResponse.message);

        // Make sure the format is valid JSON
		this.assert(commonFun.isJson(format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_canvas SET format = ? WHERE id = ? and (select true from tb_dashboards where id = ? and account_id = ?)',
			[format, id, owner_id, this.account.account_id],
			'write'
		);
	}
};


exports.update = class extends API {

	async update({id, owner, owner_id, visualization_id, format} = {}) {

		this.user.privilege.needs('visualization.update', 'ignore');

		const [canvasRow] = await this.mysql.query(
			`SELECT * FROM tb_visualization_canvas WHERE id = ?`,
			[id]
		);

		this.assert(canvasRow, 'Invalid id');

		let values =  {
			visualization_id: visualization_id || canvasRow.visualization_id,
			format: format
		};

		if(canvasRow.owner == 'dashboard') {

			const authResponse = await auth.dashboard({dashboard: canvasRow.owner_id, userObj: this.user});
			this.assert(!authResponse.error, authResponse.message);
		}

		// Make sure the format is valid JSON
		this.assert(commonFun.isJson(format), "format is invalid");

		return await this.mysql.query(
			'UPDATE tb_visualization_canvas SET ? WHERE id = ?',
			[values, id],
			'write'
		);
	}
};