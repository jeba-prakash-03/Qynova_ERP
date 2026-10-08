import db from '../../db/knex';
import { RoleRecord, RoleDetailResponse } from './roles.types';
import { CreateRoleInput, UpdateRoleInput } from './roles.schema';

export class RolesRepository {
  public async findAll(): Promise<RoleRecord[]> {
    const roles = await db('roles')
      .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
      .select('roles.*')
      .count('role_permissions.permission_id as permissions_count')
      .groupBy('roles.id')
      .orderBy('roles.id', 'asc');

    return roles.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      is_system: Boolean(r.is_system),
      created_at: r.created_at,
      updated_at: r.updated_at,
      permissions_count: Number(r.permissions_count || 0),
    }));
  }

  public async findById(id: number): Promise<RoleRecord | undefined> {
    const role = await db('roles').where({ id }).first();
    if (!role) return undefined;
    return {
      ...role,
      is_system: Boolean(role.is_system),
    };
  }

  public async findByName(name: string): Promise<RoleRecord | undefined> {
    return db('roles').where({ name: name.trim() }).first();
  }

  public async findDetailById(id: number): Promise<RoleDetailResponse | undefined> {
    const role = await this.findById(id);
    if (!role) return undefined;

    const perms = await db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('role_permissions.role_id', id)
      .select('permissions.id', 'permissions.module', 'permissions.action', 'permissions.name', 'permissions.description');

    return {
      ...role,
      permissionIds: perms.map((p) => Number(p.id)),
      permissions: perms.map((p) => ({
        id: Number(p.id),
        module: p.module,
        action: p.action,
        name: p.name,
        description: p.description,
      })),
    };
  }

  public async create(input: CreateRoleInput): Promise<number> {
    const [id] = await db('roles').insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_system: false,
    });
    return Number(id);
  }

  public async update(id: number, input: UpdateRoleInput): Promise<void> {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();

    await db('roles').where({ id }).update(updateData);
  }

  public async delete(id: number): Promise<void> {
    await db('roles').where({ id }).del();
  }

  public async updatePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await db.transaction(async (trx) => {
      await trx('role_permissions').where({ role_id: roleId }).del();

      if (permissionIds.length > 0) {
        const rows = permissionIds.map((pid) => ({
          role_id: roleId,
          permission_id: pid,
        }));
        await trx('role_permissions').insert(rows);
      }
    });
  }

  public async getAllPermissions(): Promise<any[]> {
    return db('permissions').select('*').orderBy(['module', 'action']);
  }
}

export const rolesRepository = new RolesRepository();
export default rolesRepository;
