import { expensesRepository } from './expenses.repository';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  UpdateExpenseStatusInput,
  ExpenseQueryParams,
} from './expenses.types';
import db from '../../db/knex';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';

export class ExpensesService {
  public async getCategories(): Promise<ExpenseCategory[]> {
    return expensesRepository.findAllCategories();
  }

  public async getExpenses(params: ExpenseQueryParams): Promise<{ data: Expense[]; total: number }> {
    return expensesRepository.findAll(params);
  }

  public async getExpenseById(id: number): Promise<Expense> {
    const expense = await expensesRepository.findById(id);
    if (!expense) {
      throw new NotFoundError(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  public async createExpense(
    data: CreateExpenseInput,
    currentUser: { userId?: number; employeeId?: number | null; roles?: string[] },
    ip?: string
  ): Promise<Expense> {
    // Determine category
    let categoryName = data.category;
    let categoryId = data.category_id;

    if (categoryId) {
      const cat = await expensesRepository.findCategoryById(categoryId);
      if (!cat) {
        throw new BadRequestError('Invalid expense category ID', [
          { field: 'category_id', message: 'Category ID does not exist' },
        ]);
      }
      categoryName = cat.name;
    } else if (categoryName) {
      const cat = await expensesRepository.findCategoryByName(categoryName);
      if (cat) {
        categoryId = cat.id;
        categoryName = cat.name;
      }
    } else {
      throw new BadRequestError('Expense category is required', [
        { field: 'category', message: 'Category is required' },
      ]);
    }

    // Determine employee
    const employeeId = data.employee_id || currentUser.employeeId;
    if (!employeeId) {
      throw new BadRequestError('Employee identity is required to claim an expense', [
        { field: 'employee_id', message: 'Employee ID is required' },
      ]);
    }

    // Validate project if provided
    if (data.project_id) {
      const proj = await db('projects').where({ id: data.project_id }).whereNull('deleted_at').first();
      if (!proj) {
        throw new BadRequestError('Referenced project does not exist', [
          { field: 'project_id', message: 'Project does not exist or was deleted' },
        ]);
      }
    }

    const expenseCode = await expensesRepository.generateExpenseCode();

    const created = await expensesRepository.create(
      {
        ...data,
        category: categoryName!,
        category_id: categoryId,
        employee_id: employeeId,
        expense_code: expenseCode,
      },
      currentUser.userId
    );

    await auditService.record({
      userId: currentUser.userId,
      action: 'expenses.create',
      entity: 'expenses',
      entityId: created.id,
      newValue: {
        expense_code: created.expense_code,
        amount: created.amount,
        category: created.category,
        project_id: created.project_id,
        status: created.status,
      },
      ip,
    });

    return created;
  }

  public async updateExpense(
    id: number,
    data: UpdateExpenseInput,
    currentUser: { userId?: number; employeeId?: number | null },
    ip?: string
  ): Promise<Expense> {
    const existing = await expensesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Expense with ID ${id} not found`);
    }

    if (existing.status !== 'draft' && existing.status !== 'pending_approval') {
      throw new BadRequestError(`Cannot edit expense in status '${existing.status}'`, [
        { field: 'status', message: `Only draft or pending expenses can be edited` },
      ]);
    }

    let categoryName = data.category;
    if (data.category_id) {
      const cat = await expensesRepository.findCategoryById(data.category_id);
      if (cat) {
        categoryName = cat.name;
      }
    }

    const updated = await expensesRepository.update(id, {
      ...data,
      category: categoryName,
    });

    await auditService.record({
      userId: currentUser.userId,
      action: 'expenses.update',
      entity: 'expenses',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      ip,
    });

    return updated;
  }

  public async updateStatus(
    id: number,
    data: UpdateExpenseStatusInput,
    currentUser: { userId?: number; employeeId?: number | null; roles?: string[]; permissions?: string[] },
    ip?: string
  ): Promise<Expense> {
    const existing = await expensesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Expense with ID ${id} not found`);
    }

    // BUSINESS RULE: Nobody approves their own expense
    if (
      data.status === 'approved' &&
      currentUser.employeeId &&
      existing.employee_id === currentUser.employeeId
    ) {
      throw new ForbiddenError('You cannot approve your own expense submission');
    }

    if (data.status === 'rejected' && (!data.rejection_reason || !data.rejection_reason.trim())) {
      throw new BadRequestError('Rejection reason is required when rejecting an expense', [
        { field: 'rejection_reason', message: 'Rejection reason is mandatory' },
      ]);
    }

    await expensesRepository.updateStatus(
      id,
      data.status,
      currentUser.employeeId || null,
      data.rejection_reason || null
    );

    const updated = (await expensesRepository.findById(id))!;

    await auditService.record({
      userId: currentUser.userId,
      action: `expenses.${data.status}`,
      entity: 'expenses',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status, rejection_reason: updated.rejection_reason },
      ip,
    });

    // Notify submitting employee
    const targetUser = await db('users as u')
      .join('employees as e', 'u.id', 'e.user_id')
      .where('e.id', existing.employee_id)
      .select('u.id')
      .first();

    if (targetUser) {
      await notificationService.notify({
        userIds: targetUser.id,
        title: `Expense Claim ${updated.expense_code} ${updated.status}`,
        message: `Your expense claim of ₹${updated.amount} for ${updated.category} was ${updated.status}.${
          data.rejection_reason ? ` Reason: ${data.rejection_reason}` : ''
        }`,
        type: data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'warning' : 'info',
        eventKey: `expense-${id}-${updated.status}`,
      });
    }

    return updated;
  }

  public async deleteExpense(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await expensesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Expense with ID ${id} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestError('Only draft expenses can be deleted', [
        { field: 'status', message: 'Cannot delete expense that has been submitted for approval' },
      ]);
    }

    await expensesRepository.delete(id);

    await auditService.record({
      userId,
      action: 'expenses.delete',
      entity: 'expenses',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }
}

export const expensesService = new ExpensesService();
