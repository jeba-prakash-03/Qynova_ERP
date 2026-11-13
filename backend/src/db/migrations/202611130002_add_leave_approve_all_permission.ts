import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const existingPerm = await knex('permissions').where({ name: 'leave.approve_all' }).first();
  let permId: number;

  if (!existingPerm) {
    const [insertedId] = await knex('permissions').insert({
      module: 'leave',
      action: 'approve_all',
      name: 'leave.approve_all',
      description: 'Approve or reject any company leave request',
    });
    permId = Number(insertedId);
  } else {
    permId = Number(existingPerm.id);
  }

  // Assign to Admin and HR roles
  const roles = await knex('roles')
    .whereIn('name', ['Admin', 'HR'])
    .select('id', 'name');

  for (const role of roles) {
    const roleId = Number(role.id);
    const hasRolePerm = await knex('role_permissions')
      .where({ role_id: roleId, permission_id: permId })
      .first();

    if (!hasRolePerm) {
      await knex('role_permissions').insert({
        role_id: roleId,
        permission_id: permId,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const perm = await knex('permissions').where({ name: 'leave.approve_all' }).first();
  if (perm) {
    await knex('role_permissions').where({ permission_id: perm.id }).delete();
    await knex('permissions').where({ id: perm.id }).delete();
  }
}
