import db from '../../db/knex';
import { Knex } from 'knex';
import {
  OfferLetterRecord,
  OfferLetterTemplateRecord,
  OfferLetterStatus,
} from './offer-letters.types';

export class OfferLettersRepository {
  // ==========================================
  // TEMPLATES
  // ==========================================
  async listTemplates(): Promise<OfferLetterTemplateRecord[]> {
    return db('offer_letter_templates').orderBy('is_default', 'desc').orderBy('id', 'asc');
  }

  async findTemplateById(id: number): Promise<OfferLetterTemplateRecord | null> {
    const row = await db('offer_letter_templates').where({ id }).first();
    return row || null;
  }

  async findDefaultTemplate(): Promise<OfferLetterTemplateRecord | null> {
    const row = await db('offer_letter_templates').where({ is_default: true }).first();
    if (row) return row;
    const fallback = await db('offer_letter_templates').orderBy('id', 'asc').first();
    return fallback || null;
  }

  async createTemplate(
    data: {
      name: string;
      subject: string;
      body_html: string;
      is_default?: boolean;
      created_by?: number | null;
    },
    trx?: Knex.Transaction
  ): Promise<number> {
    const q = trx ? trx('offer_letter_templates') : db('offer_letter_templates');
    const [id] = await q.insert(data);
    return Number(id);
  }

  async updateTemplate(
    id: number,
    data: Partial<OfferLetterTemplateRecord>,
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx ? trx('offer_letter_templates') : db('offer_letter_templates');
    await q.where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
  }

  async clearOtherDefaults(excludeId?: number, trx?: Knex.Transaction): Promise<void> {
    const q = trx ? trx('offer_letter_templates') : db('offer_letter_templates');
    let builder = q.where({ is_default: true });
    if (excludeId) {
      builder = builder.whereNot({ id: excludeId });
    }
    await builder.update({ is_default: false });
  }

  async deleteTemplate(id: number): Promise<void> {
    await db('offer_letter_templates').where({ id }).delete();
  }

  // ==========================================
  // OFFER LETTERS
  // ==========================================
  async getNextReferenceNo(trx?: Knex.Transaction): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OFR-${year}-`;
    const q = trx ? trx('offer_letters') : db('offer_letters');
    
    // Count existing rows for the year or get max
    const lastRow = await q
      .where('reference_no', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastRow && lastRow.reference_no) {
      const parts = lastRow.reference_no.split('-');
      const numPart = parseInt(parts[2], 10);
      if (!isNaN(numPart)) {
        seq = numPart + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async findOfferLetterById(id: number): Promise<OfferLetterRecord | null> {
    const row = await db('offer_letters as o')
      .leftJoin('employees as e', 'o.employee_id', 'e.id')
      .leftJoin('offer_letter_templates as t', 'o.template_id', 't.id')
      .leftJoin('users as u', 'o.generated_by', 'u.id')
      .select(
        'o.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code',
        'e.email as employee_email',
        't.name as template_name',
        'u.email as generated_by_name'
      )
      .where('o.id', id)
      .first();

    if (!row) return null;
    return this.parseRow(row);
  }

  async findLatestByEmployeeId(employeeId: number): Promise<OfferLetterRecord | null> {
    const row = await db('offer_letters as o')
      .leftJoin('employees as e', 'o.employee_id', 'e.id')
      .leftJoin('offer_letter_templates as t', 'o.template_id', 't.id')
      .select(
        'o.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code',
        'e.email as employee_email',
        't.name as template_name'
      )
      .where('o.employee_id', employeeId)
      .whereNot('o.status', 'superseded')
      .orderBy('o.version', 'desc')
      .orderBy('o.id', 'desc')
      .first();

    if (!row) return null;
    return this.parseRow(row);
  }

  async findHistoryByEmployeeId(employeeId: number): Promise<OfferLetterRecord[]> {
    const rows = await db('offer_letters as o')
      .leftJoin('offer_letter_templates as t', 'o.template_id', 't.id')
      .select('o.*', 't.name as template_name')
      .where('o.employee_id', employeeId)
      .orderBy('o.version', 'desc')
      .orderBy('o.id', 'desc');

    return rows.map((r) => this.parseRow(r));
  }

  async listOfferLetters(filters: {
    employee_id?: number;
    status?: string;
    search?: string;
  }): Promise<OfferLetterRecord[]> {
    let query = db('offer_letters as o')
      .leftJoin('employees as e', 'o.employee_id', 'e.id')
      .leftJoin('offer_letter_templates as t', 'o.template_id', 't.id')
      .select(
        'o.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code',
        'e.email as employee_email',
        't.name as template_name'
      )
      .orderBy('o.id', 'desc');

    if (filters.employee_id) {
      query = query.where('o.employee_id', filters.employee_id);
    }
    if (filters.status) {
      query = query.where('o.status', filters.status);
    }
    if (filters.search) {
      const s = `%${filters.search}%`;
      query = query.where((builder) => {
        builder
          .where('o.reference_no', 'like', s)
          .orWhere('e.first_name', 'like', s)
          .orWhere('e.last_name', 'like', s)
          .orWhere('e.employee_code', 'like', s);
      });
    }

    const rows = await query;
    return rows.map((r) => this.parseRow(r));
  }

  async createOfferLetter(data: any, trx?: Knex.Transaction): Promise<number> {
    const q = trx ? trx('offer_letters') : db('offer_letters');
    const toInsert = { ...data };
    if (toInsert.snapshot && typeof toInsert.snapshot === 'object') {
      toInsert.snapshot = JSON.stringify(toInsert.snapshot);
    }
    const [id] = await q.insert(toInsert);
    return Number(id);
  }

  async updateOfferLetter(id: number, data: any, trx?: Knex.Transaction): Promise<void> {
    const q = trx ? trx('offer_letters') : db('offer_letters');
    const toUpdate = { ...data, updated_at: db.fn.now() };
    if (toUpdate.snapshot && typeof toUpdate.snapshot === 'object') {
      toUpdate.snapshot = JSON.stringify(toUpdate.snapshot);
    }
    await q.where({ id }).update(toUpdate);
  }

  async markSuperseded(employeeId: number, trx?: Knex.Transaction): Promise<void> {
    const q = trx ? trx('offer_letters') : db('offer_letters');
    await q
      .where({ employee_id: employeeId })
      .whereNotIn('status', ['superseded', 'declined', 'expired'])
      .update({
        status: 'superseded',
        updated_at: db.fn.now(),
      });
  }

  private parseRow(row: any): OfferLetterRecord {
    if (row.snapshot && typeof row.snapshot === 'string') {
      try {
        row.snapshot = JSON.parse(row.snapshot);
      } catch {
        // Keep as is
      }
    }
    return row as OfferLetterRecord;
  }
}

export const offerLettersRepository = new OfferLettersRepository();
