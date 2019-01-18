const API = require('../utils/api');

class Documentation extends API {

	async list() {

		const result = await this.mysql.query(
			`SELECT
				d.*,
				CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as name
			FROM
				tb_documentation d
			JOIN
				tb_users u
			on d.added_by = u.user_id`,
		);

		return result;
	}

	async insert({slug, heading, body = null, parent, chapter, added_by} = {}) {

		this.user.privilege.needs('documentation');

		this.assert(chapter, "Chapter is required");

		parent = parent === '' ? null : parent;

		if(!parent) {

			const response = await this.mysql.query('SELECT id from tb_documentation WHERE parent is null and chapter = ?',
				[chapter]
			);

			this.assert(!response.length, 'Duplicate entry for chapter found.');
		}

		const parameters = {
			slug,
			heading,
			body,
			parent,
			chapter,
			added_by: this.user.user_id,
		};

		return await this.mysql.query(
			'INSERT INTO tb_documentation SET ?',
			[parameters],
			'write'
		);
	}

	async update({id} = {}) {

		this.user.privilege.needs('documentation');

		this.assert(id, "Id is required to update.");

		let parent = this.request.body.parent;

		parent = parent === '' ? null : parent;

		const [response] = await this.mysql.query('SELECT * FROM tb_documentation WHERE id = ?',[id]);

		const parameters = {};

		const keysToUpdate = ['slug', 'heading', 'body', 'parent', 'chapter'];

		for(const key in response) {

			if(keysToUpdate.includes(key) && key in this.request.body) {

				parameters[key] = key != 'parent' ? this.request.body[key] : parent;
			}
			else {
				parameters[key] = response[key];
			}
		}

		if(!parameters.parent) {

			const response = await this.mysql.query('SELECT id from tb_documentation WHERE parent is null and chapter = ? and id != ?',
				[parameters.chapter, id]
			);

			this.assert(!response.length, 'Duplicate entry for chapter found.');
		}

		return await this.mysql.query(
			'UPDATE tb_documentation SET ? WHERE id = ?',
			[parameters, id],
			'write'
		);
	}

	async delete({id} = {}) {

		this.user.privilege.needs('documentation');

		this.assert(id, 'Id is required to delete');

		return await this.mysql.query(
			`DELETE from tb_documentation WHERE id = ?`,
			[id],
			'write'
		);
	}

	async getEnitreDocumentation() {

		return await this.mysql.query('SELECT * FROM tb_documentation');
	}
}

exports.list = Documentation;
exports.getEnitreDocumentation = Documentation;
exports.insert = Documentation;
exports.update = Documentation;
exports.delete = Documentation;