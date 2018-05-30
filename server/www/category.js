const API = require('../utils/api');

exports.list = class extends API {

	async list() {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(`
			SELECT
				category_id,
				name,
				slug,
				parent,
				is_admin
			FROM
				tb_categories
			WHERE
				account_id = ?`,
			[this.account.account_id]);
	}
}

exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs("administrator");

		let
			values = {}, category_cols = ['name', 'slug', 'parent','is_admin'];

		for(const key in this.request.body) {
			if(category_cols.includes(key))
				values[key] = this.request.body[key] || null;
		}

		values.account_id = this.account.account_id;

		return await this.mysql.query('INSERT INTO tb_categories SET  ?', [values], 'write');
	}
};

exports.update = class extends API {

	async update() {

		this.user.privilege.needs("administrator");

		let
			values = {}, category_cols = ['name', 'slug', 'parent','is_admin'];

		for(const key in this.request.body) {
			if(category_cols.includes(key))
				values[key] = this.request.body[key] || null;
		}

		return await this.mysql.query(
			'UPDATE tb_categories SET ? WHERE category_id = ? AND account_id = ?',
			[values, this.request.body.category_id, this.account.account_id],
			'write'
		);
	}
};

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(
			'DELETE FROM tb_categories WHERE category_id = ? AND account_id = ?',
			[this.request.body.category_id, this.account.account_id],
			'write'
		);
	}
};