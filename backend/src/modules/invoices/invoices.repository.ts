import { Knex } from 'knex';
import db from '../../db/knex';
import {
  Invoice,
  InvoiceItem,
  Payment,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryParams,
  RecordPaymentInput,
} from './invoices.types';

export class InvoicesRepository {
  private formatInvoice(row: any): Invoice {
    const total = Number(row.total || 0);
    const amountPaid = Number(row.amount_paid || 0);
    return {
      id: Number(row.id),
      invoice_number: row.invoice_number,
      client_id: Number(row.client_id),
      client_name: row.client_company || row.client_name || null,
      client_company: row.client_company || null,
      client_email: row.client_email || null,
      client_gstin: row.client_gstin || null,
      project_id: row.project_id ? Number(row.project_id) : null,
      project_name: row.project_name || null,
      project_code: row.project_code || null,
      milestone_id: row.milestone_id ? Number(row.milestone_id) : null,
      milestone_title: row.milestone_title || null,
      issue_date: row.issue_date instanceof Date ? row.issue_date.toISOString().split('T')[0] : String(row.issue_date),
      due_date: row.due_date instanceof Date ? row.due_date.toISOString().split('T')[0] : String(row.due_date),
      subtotal: Number(row.subtotal || 0),
      tax_percent: Number(row.tax_percent || 0),
      tax_amount: Number(row.tax_amount || 0),
      total,
      amount_paid: amountPaid,
      balance_due: Math.max(0, Number((total - amountPaid).toFixed(2))),
      status: row.status,
      notes: row.notes || null,
      terms: row.terms || null,
      created_by: row.created_by ? Number(row.created_by) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async generateInvoiceNumber(trx?: Knex.Transaction): Promise<string> {
    const q = trx ? trx('invoices') : db('invoices');
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await q
      .where('invoice_number', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    if (!last) {
      return `${prefix}0001`;
    }

    const lastSeq = parseInt(last.invoice_number.replace(prefix, ''), 10);
    const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  public async generatePaymentNumber(trx?: Knex.Transaction): Promise<string> {
    const q = trx ? trx('payments') : db('payments');
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    const last = await q
      .where('payment_number', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    if (!last) {
      return `${prefix}0001`;
    }

    const lastSeq = parseInt(last.payment_number.replace(prefix, ''), 10);
    const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  public async findAll(params: InvoiceQueryParams): Promise<{ data: Invoice[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const baseQuery = db('invoices as inv')
      .join('clients as c', 'inv.client_id', 'c.id')
      .leftJoin('projects as p', 'inv.project_id', 'p.id')
      .leftJoin('project_milestones as m', 'inv.milestone_id', 'm.id')
      .whereNull('c.deleted_at');

    if (params.client_id) {
      baseQuery.where('inv.client_id', params.client_id);
    }
    if (params.project_id) {
      baseQuery.where('inv.project_id', params.project_id);
    }
    if (params.status) {
      baseQuery.where('inv.status', params.status);
    }
    if (params.due_before) {
      baseQuery.where('inv.due_date', '<=', params.due_before);
    }
    if (params.due_after) {
      baseQuery.where('inv.due_date', '>=', params.due_after);
    }
    if (params.search) {
      const term = `%${params.search}%`;
      baseQuery.where((b) => {
        b.where('inv.invoice_number', 'like', term)
          .orWhere('c.company_name', 'like', term)
          .orWhere('p.name', 'like', term);
      });
    }

    const countRes = await baseQuery.clone().count<{ total: number }>('inv.id as total').first();
    const total = Number(countRes?.total || 0);

    const rows = await baseQuery
      .select(
        'inv.*',
        'c.company_name as client_company',
        'c.company_name as client_name',
        'c.gstin as client_gstin',
        'p.name as project_name',
        'p.project_code',
        'm.title as milestone_title'
      )
      .orderBy('inv.id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(this.formatInvoice),
      total,
    };
  }

  public async findById(id: number): Promise<Invoice | null> {
    const row = await db('invoices as inv')
      .join('clients as c', 'inv.client_id', 'c.id')
      .leftJoin('projects as p', 'inv.project_id', 'p.id')
      .leftJoin('project_milestones as m', 'inv.milestone_id', 'm.id')
      .where('inv.id', id)
      .select(
        'inv.*',
        'c.company_name as client_company',
        'c.company_name as client_name',
        'c.gstin as client_gstin',
        'p.name as project_name',
        'p.project_code',
        'm.title as milestone_title'
      )
      .first();

    if (!row) return null;

    const [items, payments] = await Promise.all([
      this.findItemsByInvoiceId(id),
      this.findPaymentsByInvoiceId(id),
    ]);

    return {
      ...this.formatInvoice(row),
      items,
      payments,
    };
  }

  public async findRawById(id: number, trx?: Knex.Transaction): Promise<any | null> {
    const q = trx ? trx('invoices') : db('invoices');
    return q.where({ id }).first();
  }

  public async findItemsByInvoiceId(invoiceId: number, trx?: Knex.Transaction): Promise<InvoiceItem[]> {
    const q = trx ? trx('invoice_items') : db('invoice_items');
    const rows = await q.where({ invoice_id: invoiceId }).orderBy('id', 'asc');
    return rows.map((r: any) => ({
      id: Number(r.id),
      invoice_id: Number(r.invoice_id),
      description: r.description,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      amount: Number(r.amount),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async findPaymentsByInvoiceId(invoiceId: number, trx?: Knex.Transaction): Promise<Payment[]> {
    const q = trx ? trx('payments as p') : db('payments as p');
    const rows = await q
      .leftJoin('users as u', 'p.recorded_by', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('p.invoice_id', invoiceId)
      .select(
        'p.*',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email, 'Admin') as recorded_by_name")
      )
      .orderBy('p.payment_date', 'desc');

    return rows.map((r: any) => ({
      id: Number(r.id),
      payment_number: r.payment_number,
      invoice_id: Number(r.invoice_id),
      amount: Number(r.amount),
      payment_date: r.payment_date instanceof Date ? r.payment_date.toISOString().split('T')[0] : String(r.payment_date),
      method: r.method,
      reference: r.reference || null,
      notes: r.notes || null,
      recorded_by: r.recorded_by ? Number(r.recorded_by) : null,
      recorded_by_name: r.recorded_by_name || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async create(
    data: CreateInvoiceInput,
    totals: { subtotal: number; tax_amount: number; total: number },
    invoiceNumber: string,
    userId?: number
  ): Promise<Invoice> {
    const id = await db.transaction(async (trx) => {
      const [insertedId] = await trx('invoices').insert({
        invoice_number: invoiceNumber,
        client_id: data.client_id,
        project_id: data.project_id || null,
        milestone_id: data.milestone_id || null,
        issue_date: data.issue_date,
        due_date: data.due_date,
        subtotal: totals.subtotal,
        tax_percent: data.tax_percent !== undefined ? data.tax_percent : 18.0,
        tax_amount: totals.tax_amount,
        total: totals.total,
        amount_paid: 0.0,
        status: 'draft',
        notes: data.notes || null,
        terms: data.terms || null,
        created_by: userId || null,
      });

      if (data.items && data.items.length > 0) {
        const itemRows = data.items.map((item) => ({
          invoice_id: insertedId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Number((item.quantity * item.unit_price).toFixed(2)),
        }));
        await trx('invoice_items').insert(itemRows);
      }

      return insertedId;
    });

    return (await this.findById(id))!;
  }

  public async update(
    id: number,
    data: UpdateInvoiceInput,
    totals: { subtotal: number; tax_amount: number; total: number },
    trx?: Knex.Transaction
  ): Promise<Invoice> {
    const executor = async (t: Knex.Transaction) => {
      await t('invoices')
        .where({ id })
        .update({
          client_id: data.client_id !== undefined ? data.client_id : undefined,
          project_id: data.project_id !== undefined ? data.project_id : undefined,
          milestone_id: data.milestone_id !== undefined ? data.milestone_id : undefined,
          issue_date: data.issue_date !== undefined ? data.issue_date : undefined,
          due_date: data.due_date !== undefined ? data.due_date : undefined,
          subtotal: totals.subtotal,
          tax_percent: data.tax_percent !== undefined ? data.tax_percent : undefined,
          tax_amount: totals.tax_amount,
          total: totals.total,
          notes: data.notes !== undefined ? data.notes : undefined,
          terms: data.terms !== undefined ? data.terms : undefined,
        });

      if (data.items) {
        await t('invoice_items').where({ invoice_id: id }).del();
        const itemRows = data.items.map((item) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Number((item.quantity * item.unit_price).toFixed(2)),
        }));
        await t('invoice_items').insert(itemRows);
      }

      return id;
    };

    if (trx) {
      await executor(trx);
    } else {
      await db.transaction(executor);
    }

    return (await this.findById(id))!;
  }

  public async updateStatus(id: number, status: string, trx?: Knex.Transaction): Promise<void> {
    const q = trx ? trx('invoices') : db('invoices');
    await q.where({ id }).update({ status });
  }

  public async recordPayment(
    data: RecordPaymentInput,
    paymentNumber: string,
    invoiceId: number,
    userId: number | undefined,
    newAmountPaid: number,
    newStatus: string,
    trx: Knex.Transaction
  ): Promise<Payment> {
    const [paymentId] = await trx('payments').insert({
      payment_number: paymentNumber,
      invoice_id: invoiceId,
      amount: data.amount,
      payment_date: data.payment_date,
      method: data.method || 'bank_transfer',
      reference: data.reference || null,
      notes: data.notes || null,
      recorded_by: userId || null,
    });

    await trx('invoices').where({ id: invoiceId }).update({
      amount_paid: newAmountPaid,
      status: newStatus,
    });

    const paymentRow = await trx('payments').where({ id: paymentId }).first();
    return {
      id: Number(paymentRow.id),
      payment_number: paymentRow.payment_number,
      invoice_id: Number(paymentRow.invoice_id),
      amount: Number(paymentRow.amount),
      payment_date: paymentRow.payment_date instanceof Date ? paymentRow.payment_date.toISOString().split('T')[0] : String(paymentRow.payment_date),
      method: paymentRow.method,
      reference: paymentRow.reference || null,
      notes: paymentRow.notes || null,
      recorded_by: paymentRow.recorded_by ? Number(paymentRow.recorded_by) : null,
      created_at: paymentRow.created_at,
      updated_at: paymentRow.updated_at,
    };
  }

  public async delete(id: number): Promise<void> {
    await db('invoices').where({ id }).del();
  }

  public async findOverdueInvoices(currentDate: string): Promise<any[]> {
    return db('invoices')
      .whereIn('status', ['sent', 'viewed', 'partially_paid'])
      .where('due_date', '<', currentDate);
  }
}

export const invoicesRepository = new InvoicesRepository();
