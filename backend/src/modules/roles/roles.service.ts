import { rolesRepository } from './roles.repository';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { RoleRecord, RoleDetailResponse } from './roles.types';
import { CreateRoleInput, UpdateRoleInput } from './roles.schema';

export class RolesService {
  public async getAllRoles(): Promise<RoleRecord[]> {
    return rolesRepository.findAll();
  }

  public async getRoleById(id: number): Promise<RoleDetailResponse> {
    const role = await rolesRepository.findDetailById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    return role;
  }

  public async createRole(
    input: CreateRoleInput,
    userId?: number,
    ip?: string
  ): Promise<RoleDetailResponse> {
    const existing = await rolesRepository.findByName(input.name);
    if (existing) {
      throw new ConflictError('A role with this name already exists', [
        { field: 'name', message: 'Role name already taken' },
      ]);
    }

    const id = await rolesRepository.create(input);

    await auditService.record({
      userId,
      action: 'roles.create',
      entity: 'roles',
      entityId: id,
      newValue: input,
      ip,
    });

    return this.getRoleById(id);
  }

  public async updateRole(
    id: number,
    input: UpdateRoleInput,
    userId?: number,
    ip?: string
  ): Promise<RoleDetailResponse> {
    const existing = await rolesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (existing.is_system && input.name && input.name !== existing.name) {
      throw new BadRequestError('Cannot rename system roles', [
        { field: 'name', message: 'System role name cannot be modified' },
      ]);
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await rolesRepository.findByName(input.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A role with this name already exists', [
          { field: 'name', message: 'Role name already taken' },
        ]);
      }
    }

    await rolesRepository.update(id, input);

    await auditService.record({
      userId,
      action: 'roles.edit',
      entity: 'roles',
      entityId: id,
      oldValue: existing,
      newValue: input,
      ip,
    });

    return this.getRoleById(id);
  }

  public async deleteRole(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await rolesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (existing.is_system) {
      throw new BadRequestError('System roles cannot be deleted', [
        { field: 'id', message: 'Cannot delete protected system role' },
      ]);
    }

    await rolesRepository.delete(id);

    await auditService.record({
      userId,
      action: 'roles.delete',
      entity: 'roles',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }

  public async updateRolePermissions(
    roleId: number,
    permissionIds: number[],
    userId?: number,
    ip?: string
  ): Promise<RoleDetailResponse> {
    const existing = await rolesRepository.findDetailById(roleId);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    await rolesRepository.updatePermissions(roleId, permissionIds);

    await auditService.record({
      userId,
      action: 'roles.edit_permissions',
      entity: 'roles',
      entityId: roleId,
      oldValue: { permissionIds: existing.permissionIds },
      newValue: { permissionIds },
      ip,
    });

    return this.getRoleById(roleId);
  }

  public async getAllPermissions(): Promise<any[]> {
    return rolesRepository.getAllPermissions();
  }
}

export const rolesService = new RolesService();
export default rolesService;
