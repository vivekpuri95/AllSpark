const API = require('../utils/api');

class Category extends API {

	async list() {

		this.user.privilege.needs("category.list", "ignore");

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

	async insert({name, slug, parent = null, is_admin = 0} = {}) {

		this.user.privilege.needs("category.insert", "ignore");

		this.assert(name && slug, "Category name or slug is missing");

		parent = isNaN(parseInt(parent)) ? null : parseInt(parent);
		is_admin = isNaN(parseInt(is_admin)) ? 0 : parseInt(is_admin);

		return await this.mysql.query(
			`INSERT INTO
				tb_categories (account_id, name, slug, parent, is_admin)
			VALUES
				(?, ?, ?, ?, ?)`,
			[this.account.account_id, name, slug, parent, is_admin],
			'write'
		);
	}

	async update({category_id, name, slug, parent = null, is_admin = 0} = {}) {

		this.user.privilege.needs("category.update", "ignore");

        this.assert(category_id, "Category Id is required");
		this.assert(name && slug, "Name or Slug cannot be null or empty");

		parent = isNaN(parseInt(parent)) ? null : parseInt(parent);
		is_admin = isNaN(parseInt(is_admin)) ? 0 : parseInt(is_admin);

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
			[name, slug, parent, is_admin, category_id, this.account.account_id],
			'write'
		);
	}

	async delete({category_id} = {}) {

		this.user.privilege.needs("category.delete", "ignore");

		this.assert(category_id, "Category Id is required");

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