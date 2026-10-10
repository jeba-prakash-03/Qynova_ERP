import db from '../../db/knex';
import { EmployeeDocument, DocumentType } from './documents.types';

export class DocumentsRepository {
  async findById(id: number): Promise<EmployeeDocument | null> {
    const row = await db('employee_documents as ed')
      .leftJoin('users as u', 'ed.uploaded_by', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('ed.id', id)
      .select(
        'ed.*',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as uploaded_by_name")
      )
      .first();

    return row ? this.formatDocument(row) : null;
  }

  async findByEmployeeId(employeeId: number): Promise<EmployeeDocument[]> {
    const rows = await db('employee_documents as ed')
      .leftJoin('users as u', 'ed.uploaded_by', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('ed.employee_id', employeeId)
      .select(
        'ed.*',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as uploaded_by_name")
      )
      .orderBy('ed.created_at', 'desc');

    return rows.map((r) => this.formatDocument(r));
  }

  async create(data: {
    employee_id: number;
    type: DocumentType;
    file_name: string;
    file_path: string;
    mime_type: string;
    size: number;
    uploaded_by: number;
  }): Promise<EmployeeDocument> {
    const [id] = await db('employee_documents').insert({
      employee_id: data.employee_id,
      type: data.type,
      file_name: data.file_name,
      file_path: data.file_path,
      mime_type: data.mime_type,
      size: data.size,
      uploaded_by: data.uploaded_by,
    });

    const doc = await this.findById(Number(id));
    return doc!;
  }

  async delete(id: number): Promise<boolean> {
    const count = await db('employee_documents').where({ id }).delete();
    return count > 0;
  }

  private formatDocument(row: any): EmployeeDocument {
    return {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      type: row.type as DocumentType,
      file_name: row.file_name,
      file_path: row.file_path,
      mime_type: row.mime_type,
      size: Number(row.size),
      uploaded_by: Number(row.uploaded_by),
      uploaded_by_name: row.uploaded_by_name,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }
}

export const documentsRepository = new DocumentsRepository();
