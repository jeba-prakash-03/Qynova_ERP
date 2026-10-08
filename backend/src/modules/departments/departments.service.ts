import { departmentsRepository } from './departments.repository';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { DepartmentRecord } from './departments.types';
import { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export class DepartmentsService {
  public async getAllDepartments(tree = false): Promise<DepartmentRecord[]> {
    const flatList = await departmentsRepository.findAll();

    if (!tree) {
      return flatList;
    }

    // Build hierarchy tree
    const map = new Map<number, DepartmentRecord>();
    const roots: DepartmentRecord[] = [];

    flatList.forEach((dept) => {
      map.set(dept.id, { ...dept, children: [] });
    });

    map.forEach((dept) => {
      if (dept.parent_id && map.has(dept.parent_id)) {
        map.get(dept.parent_id)!.children!.push(dept);
      } else {
        roots.push(dept);
      }
    });

    return roots;
  }

  public async getDepartmentById(id: number): Promise<DepartmentRecord> {
    const dept = await departmentsRepository.findById(id);
    if (!dept) {
      throw new NotFoundError('Department not found');
    }
    return dept;
  }

  public async createDepartment(
    input: CreateDepartmentInput,
    userId?: number,
    ip?: string
  ): Promise<DepartmentRecord> {
    const existing = await departmentsRepository.findByCode(input.code);
    if (existing) {
      throw new ConflictError('A department with this code already exists', [
        { field: 'code', message: 'Department code must be unique' },
      ]);
    }

    if (input.parent_id) {
      const parent = await departmentsRepository.findById(input.parent_id);
      if (!parent) {
        throw new BadRequestError('Parent department not found', [
          { field: 'parent_id', message: 'Specified parent department does not exist' },
        ]);
      }
    }

    const id = await departmentsRepository.create(input);

    await auditService.record({
      userId,
      action: 'departments.create',
      entity: 'departments',
      entityId: id,
      newValue: input,
      ip,
    });

    return this.getDepartmentById(id);
  }

  public async updateDepartment(
    id: number,
    input: UpdateDepartmentInput,
    userId?: number,
    ip?: string
  ): Promise<DepartmentRecord> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await departmentsRepository.findByCode(input.code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A department with this code already exists', [
          { field: 'code', message: 'Department code must be unique' },
        ]);
      }
    }

    if (input.parent_id !== undefined && input.parent_id !== null) {
      if (input.parent_id === id) {
        throw new BadRequestError('A department cannot be its own parent', [
          { field: 'parent_id', message: 'Circular parent reference' },
        ]);
      }
      const parent = await departmentsRepository.findById(input.parent_id);
      if (!parent) {
        throw new BadRequestError('Parent department not found', [
          { field: 'parent_id', message: 'Specified parent department does not exist' },
        ]);
      }
    }

    await departmentsRepository.update(id, input);

    await auditService.record({
      userId,
      action: 'departments.edit',
      entity: 'departments',
      entityId: id,
      oldValue: existing,
      newValue: input,
      ip,
    });

    return this.getDepartmentById(id);
  }

  public async deleteDepartment(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    const childCount = await departmentsRepository.countChildDepartments(id);
    if (childCount > 0) {
      throw new BadRequestError('Cannot delete department with active sub-departments', [
        { field: 'id', message: 'Reassign or remove sub-departments first' },
      ]);
    }

    const empCount = await departmentsRepository.countEmployeesInDepartment(id);
    if (empCount > 0) {
      throw new BadRequestError('Cannot delete department with assigned employees', [
        { field: 'id', message: 'Reassign employees to another department first' },
      ]);
    }

    await departmentsRepository.softDelete(id);

    await auditService.record({
      userId,
      action: 'departments.delete',
      entity: 'departments',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }
}

export const departmentsService = new DepartmentsService();
export default departmentsService;
