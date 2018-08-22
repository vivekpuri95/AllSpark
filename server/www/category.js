const API = require('../utils/api');

class Category extends API {

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
			[this.account.account_id]
		);
	}

	async insert({name, slug, parent, is_admin} = {}) {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(
			`INSERT INTO 
				tb_categories (account_id, name, slug, parent, is_admin)
			VALUES
				(?, ?, ?, ?, ?)`,
			[this.account.account_id, name, slug, parent || null, is_admin],
			'write'
		);
	}

	async update({name, slug, parent, is_admin, category_id} = {}) {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(
			`UPDATE 
				tb_categories 
			SET
			 	name = ?,
			 	slug = ?,
			 	parent = ?,
			 	is_admin = ?
			 WHERE 
			 	category_id = ? 
			 	AND account_id = ?`,
			[name, slug, parent || null, is_admin, category_id, this.account.account_id],
			'write'
		);
	}

	async delete({category_id} = {}) {

		this.user.privilege.needs("administrator");

		return await this.mysql.query(
			'DELETE FROM tb_categories WHERE category_id = ? AND account_id = ?',
			[category_id, this.account.account_id],
			'write'
		);
	}
}

exports.list = Category;
exports.insert = Category;
exports.update = Category;
exports.delete = Category;