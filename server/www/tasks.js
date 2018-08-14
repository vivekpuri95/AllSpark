const API = require('../utils/api');

class Tasks extends API {

	async list() {

		this.user.privilege.needs('tasks');

		const tasks = await this.mysql.query(
			'SELECT * FROM tb_tasks WHERE account_id = ? AND status = 1',
			[this.account.account_id]
		);

		for(const task of tasks) {

			try {
				task.details = JSON.parse(task.details);
			} catch(e) {
				task.details = {};
			}
		}

		return tasks;
	}

	async insert() {

		this.validateRequest();

		return await this.mysql.query(
			'INSERT INTO tb_tasks (account_id, name, type, details, created_by) VALUES (?, ?, ?, ?, ?)',
			[this.account.account_id, this.request.body.name, this.request.body.type, this.request.body.details || null, this.user.user_id]
		);
	}

	async update() {

		this.validateRequest();

		this.assert(this.request.body.id, 'Task id is required!');

		const [task] = await this.mysql.query(
			'SELECT id FROM tb_tasks WHERE account_id = ? AND id = ? AND status = 1',
			[this.account.account_id, this.request.body.id]
		);

		this.assert(task, 'Invalid task ID!')

		return await this.mysql.query(
			'UPDATE tb_tasks SET name = ?, type = ?, details = ? WHERE id = ?',
			[this.request.body.name, this.request.body.type, this.request.body.details || null, this.request.body.id]
		);
	}

	async delete() {

		this.user.privilege.needs('tasks');

		this.assert(this.request.body.id, 'Task ID is needed');

		const [task] = await this.mysql.query(
			'SELECT id FROM tb_tasks WHERE account_id = ? AND id = ? AND status = 1',
			[this.account.account_id, this.request.body.id]
		);

		this.assert(task, 'Invalid task ID!');

		return await this.mysql.query(
			'UPDATE tb_tasks SET status = 0 WHERE id = ?',
			[this.request.body.id]
		);
	}

	validateRequest() {

		this.user.privilege.needs('tasks');

		this.assert(this.request.body.name, 'Task name is required!');
		this.assert(this.request.body.type, 'Task type is required!');

		if(this.request.body.details) {
			try {
				JSON.parse(this.request.body.details);
			} catch(e) {
				this.assert(false, 'Task details is not a valid JSON!');
			}
		}
	}
}

exports.list = Tasks;
exports.insert = Tasks;
exports.update = Tasks;
exports.delete = Tasks;