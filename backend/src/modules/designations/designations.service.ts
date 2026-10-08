import { designationsRepository } from './designations.repository';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { DesignationRecord } from './designations.types';
import { CreateDesignationInput, UpdateDesignationInput } from './designations.schema';

export class DesignationsService {
  public async getAllDesignations(): Promise<DesignationRecord[]> {
    return designationsRepository.findAll();
  }

  public async getDesignationById(id: number): Promise<DesignationRecord> {
    const item = await designationsRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Designation not found');
    }
    return item;
  }

  public async createDesignation(
    input: CreateDesignationInput,
    userId?: number,
    ip?: string
  ): Promise<DesignationRecord> {
    const existing = await designationsRepository.findByCode(input.code);
    if (existing) {
      throw new ConflictError('A designation with this code already exists', [
        { field: 'code', message: 'Designation code must be unique' },
      ]);
    }

    const id = await designationsRepository.create(input);

    await auditService.record({
      userId,
      action: 'designations.create',
      entity: 'designations',
      entityId: id,
      newValue: input,
      ip,
    });

    return this.getDesignationById(id);
  }

  public async updateDesignation(
    id: number,
    input: UpdateDesignationInput,
    userId?: number,
    ip?: string
  ): Promise<DesignationRecord> {
    const existing = await designationsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Designation not found');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await designationsRepository.findByCode(input.code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A designation with this code already exists', [
          { field: 'code', message: 'Designation code must be unique' },
        ]);
      }
    }

    await designationsRepository.update(id, input);

    await auditService.record({
      userId,
      action: 'designations.edit',
      entity: 'designations',
      entityId: id,
      oldValue: existing,
      newValue: input,
      ip,
    });

    return this.getDesignationById(id);
  }

  public async deleteDesignation(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await designationsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Designation not found');
    }

    const empCount = await designationsRepository.countEmployeesInDesignation(id);
    if (empCount > 0) {
      throw new BadRequestError('Cannot delete designation assigned to active employees', [
        { field: 'id', message: 'Reassign employees to another designation first' },
      ]);
    }

    await designationsRepository.softDelete(id);

    await auditService.record({
      userId,
      action: 'designations.delete',
      entity: 'designations',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }
}

export const designationsService = new DesignationsService();
export default designationsService;
