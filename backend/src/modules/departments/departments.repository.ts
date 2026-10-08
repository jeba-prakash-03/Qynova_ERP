import db from '../../db/knex';
import { DepartmentRecord } from './departments.types';
import { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export class DepartmentsRepository {
  public async findAll(): Promise<DepartmentRecord[]> {
    const list = await db('departments as d')
      .leftJoin('departments as p', 'd.parent_id', 'p.id')
      .whereNull('d.deleted_at')
      .select('d.*', 'p.name as parent_name')
      .orderBy('d.name', 'asc');
    return list;
  }

  public async findById(id: number): Promise<DepartmentRecord | undefined> {
    return db('departments as d')
      .leftJoin('departments as p', 'd.parent_id', 'p.id')
      .where('d.id', id)
      .whereNull('d.deleted_at')
      .select('d.*', 'p.name as parent_name')
      .first();
  }

  public async findByCode(code: string): Promise<DepartmentRecord | undefined> {
    return db('departments')
      .where({ code: code.toUpperCase().trim() })
      .whereNull('deleted_at')
      .first();
  }

  public async create(input: CreateDepartmentInput): Promise<number> {
    const [id] = await db('departments').insert({
      name: input.name.trim(),
      code: input.code.toUpperCase().trim(),
      parent_id: input.parent_id || null,
      description: input.description?.trim() || null,
    });
    return Number(id);
  }

  public async update(id: number, input: UpdateDepartmentInput): Promise<void> {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code.toUpperCase().trim();
    if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;

    await db('departments').where({ id }).update(updateData);
  }

  public async softDelete(id: number): Promise<void> {
    await db('departments').where({ id }).update({
      deleted_at: db.fn.now(),
    });
  }

  public async countEmployeesInDepartment(id: number): Promise<number> {
    const result = await db('employees')
      .where({ department_id: id })
      .whereNull('deleted_at')
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  public async countChildDepartments(id: number): Promise<number> {
    const result = await db('departments')
      .where({ parent_id: id })
      .whereNull('deleted_at')
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }
}

export const departmentsRepository = new DepartmentsRepository();
export default departmentsRepository;
