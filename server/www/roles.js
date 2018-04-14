const API = require('../utils/api');

exports.list = class extends API {
	async list() {
		this.user.privilege.needs('administrator');
		return await this.mysql.query('SELECT * FROM tb_roles WHERE account_id = ? ', [this.account.account_id]);
	}
}

exports.insert = class extends API {
	async insert() {
		this.user.privilege.needs('administrator');

		if (!('name' in this.request.body) || !('is_admin' in this.request.body))
			return false;

		const params = {
			account_id: this.account.account_id,
			name: this.request.body.name,
			is_admin: this.request.body.is_admin
		};

		return await this.mysql.query('INSERT INTO tb_roles SET ?', [params], 'write');
	}
}

exports.update = class extends API {
	async update() {
		this.user.privilege.needs('administrator');

		const params = {
			name: this.request.body.name,
			is_admin: this.request.body.is_admin
		};

		return await this.mysql.query(
			'UPDATE tb_roles SET ? WHERE role_id = ? AND account_id = ?',
			[params, this.request.body.role_id, this.account.account_id],
			'write'
		);
	}
}

exports.delete = class extends API {
	async delete() {
		this.user.privilege.needs('administrator');

		return await this.mysql.query(
			'DELETE FROM tb_roles WHERE role_id = ? AND account_id = ?',
			[this.request.body.role_id, this.account.account_id],
			'write'
		);
	}
}

exports.test = class extends API {

	async test() {
		//__proto__.constructor.name
		let q = "select * from public.tb_add_on_type where idd in ({{addons}})";
		const values = [3,4, 1, 2 ,5];
		const Postgres = require("./reports/engine").Postgres;

		const pg = new Postgres({query: q, connection_name: 3}, [{placeholder: "addons", value: values}]);

		const engine = new (require("./reports/engine").ReportEngine)(pg.finalQuery);

		return engine.execute()
	}
}