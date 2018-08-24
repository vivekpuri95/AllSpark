const API = require('../utils/api');


class cycleDetection extends API {

	cycleDetection() {

		let simplifiedTreeMapping = new Map;

		for (const node of this.accountPrivileges) {

			if (!simplifiedTreeMapping.has(node.privilege_id)) {

				simplifiedTreeMapping.set(node.privilege_id, new Set);
			}

			simplifiedTreeMapping.get(node.privilege_id).add(node.parent)
		}

		for (const [key, value] of simplifiedTreeMapping.entries()) {

			let flag = true;
			let rootParents = new Set([...value]);

			for (const parentNode of value.values()) {

				flag = flag && (parentNode === 0 || simplifiedTreeMapping.has(parentNode));

				if (simplifiedTreeMapping.has(parentNode)
					&& JSON.stringify([...simplifiedTreeMapping.get(parentNode).values()]) != JSON.stringify([0])) {

					rootParents = new Set([...simplifiedTreeMapping.get(parentNode), ...rootParents]);
					rootParents.delete(parentNode);
					rootParents.delete(0);
				}
			}

			simplifiedTreeMapping.set(key, new Set(rootParents));

			flag = flag && !simplifiedTreeMapping.get(key).has(key);

			this.assert(flag, "Validity of privilege tree failed");
		}

		this.simplifiedTreeMapping = simplifiedTreeMapping;
	}
}

exports.insert = class extends cycleDetection {

	async fetch() {

		this.accountPrivileges = await this.mysql.query(
			"select pt.*, p.account_id as prv_account from tb_privileges p join tb_privileges_tree pt where (account_id = ? or account_id = 0) and p.status = 1",
			[this.account.account_id],
		);

		this.adminPrivileges = new Set;

		for (const privilege of this.accountPrivileges) {

			if (privilege.is_admin) {

				this.adminPrivileges.add(privilege.privilege_id);
			}
		}

		let parents = this.request.body.parent;

		if (parents.__proto__.constructor.name !== "Array") {

			parents = [parents]
		}

		let requestPrivilege = this.accountPrivileges.filter(x => x.privilege_id = parseInt(this.request.body.privilege_id));

		this.assert(requestPrivilege.prv_account, "Can't modify root privileges");

		for (const parent of parents) {

			this.accountPrivileges.push({
				privilege_id: this.request.body.privilege_id,
				parent: parseInt(parent),
			});
		}
	}

	async insert() {

		await this.fetch();
		this.cycleDetection();

		if (this.request.body.is_admin) {

			const rootParents = this.simplifiedTreeMapping.get(-1);

			for (const entry of rootParents.values() || [0]) {

				if (!(this.adminPrivileges.has(entry) || entry === 0)) {

					return `Privilege cannot be an admin because its root parent ${entry} is not an admin privilege`;
				}
			}
		}
		const insertObj = [];

		for (const parent of this.request.body.parent || [0]) {

			insertObj.push([this.request.body.privilege_id, parent])
		}

		return await this.mysql.query(
			"insert into tb_privileges_tree (privilege_id, parent) values ?",
			[insertObj],
			"write"
		);
	}
};


exports.sever = class extends API {

	async sever() {

		const id = this.request.body.id;

		const [parentCount] = await this.mysql.query(`
			SELECT
				count(*) AS parentCount
			FROM
				tb_privileges_tree
			WHERE
				privilege_id =
			(
				SELECT
			 		privilege_id AS target_id
			 	FROM
			 		tb_privileges_tree
			 	JOIN
			 		tb_privileges p
			 		USING(privilege_id)
				WHERE
					account_id = ?
			 		AND id = ?
			 		AND p.status = 1
			);
		`,
			[this.account.account_id, id],
		);
		this.assert(parentCount.parentCount != 0, "parents not found for this privilege");

		this.assert(parentCount.parentCount > 1, `Removing this hierarchy would lead to a dangling privilege, Please add another parent before removing this relation`);

		await this.mysql.query("delete from tb_privileges_tree where id = ?", [id], "write");

		return "Done";
	}
};


exports.add_parent = class extends cycleDetection {

	async add_parent() {

		const privilegeId = parseInt(this.request.body.privilege_id);
		const parentId = parseInt(this.request.body.parent_id);

		this.assert(privilegeId, "Privilege Id not found");
		this.assert(parentId, "Parent id not found");


		this.accountPrivileges = await this.mysql.query(
			"select pt.* from tb_privileges p join tb_privileges_tree pt where (account_id = ? or account_id = 0) and p.status = 1",
			[this.account.account_id],
		);

		this.assert(this.accountPrivileges.some(x => x.privilege_id == privilegeId), "Privilege not found");
		this.assert(this.accountPrivileges.some(x => x.privilege_id == parentId), "Parent id not found");

		this.accountPrivileges.push({
			privilege_id: privilegeId,
			parent: parentId,
		});

		this.cycleDetection();

		return await this.mysql.query(`
			insert ignore into
				tb_privileges_tree
				(
					privilege_id,
					parent
				)
				select
					? as privilege_id,
					? as parent
				from
					tb_privileges
				where
					privilege_id = ?
				limit 1
		`,
			[privilegeId, parentId, privilegeId],
			"write"
		)
	}
};

exports.list = class extends API {

	async list() {

		const privilegesList = await this.mysql.query(
			`SELECT * from tb_privileges_tree join tb_privileges using(privilege_id) where parent = ? and status = 1 and account_id in (0, ?)`,[this.request.body.id, this.account.account_id]
			);

		return privilegesList;
	}
}

exports.delete = class extends API {

	async delete() {

		this.accountPrivileges = await this.mysql.query(
			"select pt.* from tb_privileges p join tb_privileges_tree pt where (account_id = ? or account_id = 0) and p.status = 1",
			[this.account.account_id],
		);

		const toDelete = parseInt(this.request.body.privilege_id);

		this.assert(toDelete, "id to delete not found");

		let simplifiedTreeMapping = new Map;

		for (const node of this.accountPrivileges) {

			if (!simplifiedTreeMapping.has(node.privilege_id)) {

				simplifiedTreeMapping.set(node.privilege_id, new Set);
			}

			simplifiedTreeMapping.get(node.privilege_id).add(node.parent);
		}

		let toDeleteSet = new Set([toDelete]);

		let newFoundChildren = new Set;
		let currentFoundChildren = new Set([toDelete]);

		do {

			newFoundChildren.clear();

			for (const [key, values] of simplifiedTreeMapping.entries()) {

				for (const entry of currentFoundChildren.values()) {

					if (values.has(entry)) {

						newFoundChildren.add(key);
					}
				}
			}

			currentFoundChildren = new Set([...newFoundChildren]);
			toDeleteSet = new Set([...toDeleteSet, ...newFoundChildren, ...currentFoundChildren]);

		} while (newFoundChildren.size);


		this.mysql.query(
			"delete from tb_privileges_tree where privilege_id in (?)",
			[[...toDeleteSet]],
			"write"
		);

		return [...toDeleteSet];
	}
};


exports.cycleDetection = cycleDetection;
