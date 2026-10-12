import { Knex } from 'knex';
import { ALL_SYSTEM_PERMISSIONS } from '../../shared/constants/permissions';

export async function up(knex: Knex): Promise<void> {
  // 1. Insert missing permissions
  for (const perm of ALL_SYSTEM_PERMISSIONS) {
    const exists = await knex('permissions').where({ name: perm.name }).first();
    if (!exists) {
      await knex('permissions').insert({
        module: perm.module,
        action: perm.action,
        name: perm.name,
        description: perm.description,
      });
    }
  }

  // 2. Grant all permissions to Admin
  const adminRole = await knex('roles').where({ name: 'Admin' }).first();
  if (adminRole) {
    const allPerms = await knex('permissions').select('id');
    for (const p of allPerms) {
      const hasPerm = await knex('role_permissions')
        .where({ role_id: adminRole.id, permission_id: p.id })
        .first();
      if (!hasPerm) {
        await knex('role_permissions').insert({
          role_id: adminRole.id,
          permission_id: p.id,
        });
      }
    }
  }

  // 3. Grant settings.view and offer letter permissions to HR
  const hrRole = await knex('roles').where({ name: 'HR' }).first();
  if (hrRole) {
    const hrPermNames = [
      'settings.view',
      'offer_letters.view',
      'offer_letters.create',
      'offer_letters.edit',
      'offer_letters.send',
      'offer_letter_templates.manage',
    ];
    for (const name of hrPermNames) {
      const permRow = await knex('permissions').where({ name }).first();
      if (permRow) {
        const hasPerm = await knex('role_permissions')
          .where({ role_id: hrRole.id, permission_id: permRow.id })
          .first();
        if (!hasPerm) {
          await knex('role_permissions').insert({
            role_id: hrRole.id,
            permission_id: permRow.id,
          });
        }
      }
    }
  }

  // 4. Grant offer_letters.view_own to Manager, Employee, Intern
  const ownRoles = ['Manager', 'Employee', 'Intern'];
  const ownPerm = await knex('permissions').where({ name: 'offer_letters.view_own' }).first();
  if (ownPerm) {
    for (const roleName of ownRoles) {
      const roleRow = await knex('roles').where({ name: roleName }).first();
      if (roleRow) {
        const hasPerm = await knex('role_permissions')
          .where({ role_id: roleRow.id, permission_id: ownPerm.id })
          .first();
        if (!hasPerm) {
          await knex('role_permissions').insert({
            role_id: roleRow.id,
            permission_id: ownPerm.id,
          });
        }
      }
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Keep permissions intact
}
