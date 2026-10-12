import { Knex } from 'knex';
import db from '../../db/knex';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryParams,
} from './expenses.types';

export class ExpensesRepository {
  private formatExpense(row: any): Expense {
    return {
      id: Number(row.id),
      expense_code: row.expense_code,
      category_id: row.category_id ? Number(row.category_id) : null,
      category: row.category,
      project_id: row.project_id ? Number(row.project_id) : null,
      project_name: row.project_name || null,
      project_code: row.project_code || null,
      employee_id: Number(row.employee_id),
      employee_name: row.employee_name || null,
      employee_code: row.employee_code || null,
      amount: Number(row.amount),
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
      vendor: row.vendor || null,
      description: row.description || null,
      receipt_url: row.receipt_url || null,
      status: row.status,
      approved_by: row.approved_by ? Number(row.approved_by) : null,
      approved_by_name: row.approved_by_name || null,
      approved_at: row.approved_at || null,
      rejection_reason: row.rejection_reason || null,
      created_by: row.created_by ? Number(row.created_by) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async findAllCategories(): Promise<ExpenseCategory[]> {
    const rows = await db('expense_categories').orderBy('name', 'asc');
    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async findCategoryById(id: number): Promise<ExpenseCategory | null> {
    const row = await db('expense_categories').where({ id }).first();
    if (!row) return null;
    return {
      id: Number(row.id),
      name: row.name,
      description: row.description || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async findCategoryByName(name: string): Promise<ExpenseCategory | null> {
    const row = await db('expense_categories').where('name', 'like', name).first();
    if (!row) return null;
    return {
      id: Number(row.id),
      name: row.name,
      description: row.description || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async findAll(params: ExpenseQueryParams): Promise<{ data: Expense[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const baseQuery = db('expenses as e')
      .leftJoin('projects as p', 'e.project_id', 'p.id')
      .join('employees as emp', 'e.employee_id', 'emp.id')
      .leftJoin('employees as app', 'e.approved_by', 'app.id');

    if (params.project_id) {
      baseQuery.where('e.project_id', params.project_id);
    }
    if (params.employee_id) {
      baseQuery.where('e.employee_id', params.employee_id);
    }
    if (params.category) {
      baseQuery.where('e.category', params.category);
    }
    if (params.status) {
      baseQuery.where('e.status', params.status);
    }
    if (params.start_date) {
      baseQuery.where('e.date', '>=', params.start_date);
    }
    if (params.end_date) {
      baseQuery.where('e.date', '<=', params.end_date);
    }
    if (params.search) {
      const term = `%${params.search}%`;
      baseQuery.where((b) => {
        b.where('e.expense_code', 'like', term)
          .orWhere('e.vendor', 'like', term)
          .orWhere('e.description', 'like', term)
          .orWhere('e.category', 'like', term);
      });
    }

    const countRes = await baseQuery.clone().count<{ total: number }>('e.id as total').first();
    const total = Number(countRes?.total || 0);

    const rows = await baseQuery
      .select(
        'e.*',
        'p.name as project_name',
        'p.project_code',
        'emp.employee_code',
        db.raw("CONCAT(emp.first_name, ' ', emp.last_name) as employee_name"),
        db.raw("CONCAT(app.first_name, ' ', app.last_name) as approved_by_name")
      )
      .orderBy('e.date', 'desc')
      .orderBy('e.id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(this.formatExpense),
      total,
    };
  }

  public async findById(id: number): Promise<Expense | null> {
    const row = await db('expenses as e')
      .leftJoin('projects as p', 'e.project_id', 'p.id')
      .join('employees as emp', 'e.employee_id', 'emp.id')
      .leftJoin('employees as app', 'e.approved_by', 'app.id')
      .where('e.id', id)
      .select(
        'e.*',
        'p.name as project_name',
        'p.project_code',
        'emp.employee_code',
        db.raw("CONCAT(emp.first_name, ' ', emp.last_name) as employee_name"),
        db.raw("CONCAT(app.first_name, ' ', app.last_name) as approved_by_name")
      )
      .first();

    return row ? this.formatExpense(row) : null;
  }

  public async findRawById(id: number, trx?: Knex.Transaction): Promise<Expense | null> {
    const q = trx ? trx('expenses') : db('expenses');
    const row = await q.where({ id }).first();
    return row ? this.formatExpense(row) : null;
  }

  public async generateExpenseCode(trx?: Knex.Transaction): Promise<string> {
    const q = trx ? trx('expenses') : db('expenses');
    const last = await q.orderBy('id', 'desc').first();
    const nextNum = last ? Number(last.id) + 1001 : 1001;
    return `EXP-${nextNum}`;
  }

  public async create(data: CreateExpenseInput & { category: string; expense_code: string }, userId?: number): Promise<Expense> {
    const [id] = await db('expenses').insert({
      expense_code: data.expense_code,
      category_id: data.category_id || null,
      category: data.category,
      project_id: data.project_id || null,
      employee_id: data.employee_id,
      amount: data.amount,
      date: data.date,
      vendor: data.vendor || null,
      description: data.description || null,
      receipt_url: data.receipt_url || null,
      status: data.status || 'pending_approval',
      created_by: userId || null,
    });

    return (await this.findById(id))!;
  }

  public async update(id: number, data: UpdateExpenseInput & { category?: string }): Promise<Expense> {
    await db('expenses')
      .where({ id })
      .update({
        category_id: data.category_id !== undefined ? data.category_id : undefined,
        category: data.category !== undefined ? data.category : undefined,
        project_id: data.project_id !== undefined ? data.project_id : undefined,
        amount: data.amount !== undefined ? data.amount : undefined,
        date: data.date !== undefined ? data.date : undefined,
        vendor: data.vendor !== undefined ? data.vendor : undefined,
        description: data.description !== undefined ? data.description : undefined,
        receipt_url: data.receipt_url !== undefined ? data.receipt_url : undefined,
      });

    return (await this.findById(id))!;
  }

  public async updateStatus(
    id: number,
    status: string,
    approvedBy?: number | null,
    rejectionReason?: string | null,
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx ? trx('expenses') : db('expenses');
    await q.where({ id }).update({
      status,
      approved_by: approvedBy || null,
      approved_at: status === 'approved' || status === 'paid' ? db.fn.now() : null,
      rejection_reason: rejectionReason || null,
    });
  }

  public async delete(id: number): Promise<void> {
    await db('expenses').where({ id }).del();
  }
}

export const expensesRepository = new ExpensesRepository();
