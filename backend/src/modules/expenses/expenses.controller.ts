import { Request, Response } from 'express';
import { expensesService } from './expenses.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { ExpenseQueryParams } from './expenses.types';

export class ExpensesController {
  public getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await expensesService.getCategories();
    return sendSuccess(res, categories);
  });

  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const params: ExpenseQueryParams = {
      project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
      employee_id: req.query.employee_id ? Number(req.query.employee_id) : undefined,
      category: req.query.category as string,
      status: req.query.status as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const result = await expensesService.getExpenses(params);
    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: params.page || 1,
      limit: params.limit || 50,
      totalPages: Math.ceil(result.total / (params.limit || 50)),
    });
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const expense = await expensesService.getExpenseById(id);
    return sendSuccess(res, expense);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const created = await expensesService.createExpense(
      req.body,
      {
        userId: req.user?.userId,
        employeeId: req.user?.employeeId,
        roles: req.user?.roles,
      },
      ip
    );
    return sendCreated(res, created, 'Expense submitted successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await expensesService.updateExpense(
      id,
      req.body,
      {
        userId: req.user?.userId,
        employeeId: req.user?.employeeId,
      },
      ip
    );
    return sendSuccess(res, updated, 200, undefined, 'Expense updated successfully');
  });

  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await expensesService.updateStatus(
      id,
      req.body,
      {
        userId: req.user!.userId,
        employeeId: req.user!.employeeId,
        roles: req.user!.roles,
        permissions: req.user!.permissions,
      },
      ip
    );
    return sendSuccess(res, updated, 200, undefined, `Expense ${updated.status} successfully`);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await expensesService.deleteExpense(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Expense deleted successfully');
  });
}

export const expensesController = new ExpensesController();
