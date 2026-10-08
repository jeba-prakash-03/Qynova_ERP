import db from '../../db/knex';
import { DesignationRecord } from './designations.types';
import { CreateDesignationInput, UpdateDesignationInput } from './designations.schema';

export class DesignationsRepository {
  public async findAll(): Promise<DesignationRecord[]> {
    const list = await db('designations as d')
      .leftJoin('employees as e', function () {
        this.on('e.designation_id', '=', 'd.id').andOnNull('e.deleted_at');
      })
      .whereNull('d.deleted_at')
      .select('d.*')
      .count('e.id as employee_count')
      .groupBy('d.id')
      .orderBy('d.name', 'asc');

    return list.map((item: any) => ({
      id: Number(item.id),
      name: item.name,
      code: item.code,
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
      deleted_at: item.deleted_at,
      employee_count: Number(item.employee_count || 0),
    }));
  }

  public async findById(id: number): Promise<DesignationRecord | undefined> {
    return db('designations').where({ id }).whereNull('deleted_at').first();
  }

  public async findByCode(code: string): Promise<DesignationRecord | undefined> {
    return db('designations')
      .where({ code: code.toUpperCase().trim() })
      .whereNull('deleted_at')
      .first();
  }

  public async create(input: CreateDesignationInput): Promise<number> {
    const [id] = await db('designations').insert({
      name: input.name.trim(),
      code: input.code.toUpperCase().trim(),
      description: input.description?.trim() || null,
    });
    return Number(id);
  }

  public async update(id: number, input: UpdateDesignationInput): Promise<void> {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code.toUpperCase().trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;

    await db('designations').where({ id }).update(updateData);
  }

  public async softDelete(id: number): Promise<void> {
    await db('designations').where({ id }).update({
      deleted_at: db.fn.now(),
    });
  }

  public async countEmployeesInDesignation(id: number): Promise<number> {
    const result = await db('employees')
      .where({ designation_id: id })
      .whereNull('deleted_at')
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }
}

export const designationsRepository = new DesignationsRepository();
export default designationsRepository;
