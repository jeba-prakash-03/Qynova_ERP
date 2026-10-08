import { Request, Response } from 'express';
import { employeesService } from './employees.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-error';

export class EmployeesController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const queryParams: any = req.query;
    const { data, total } = await employeesService.getEmployees(queryParams);
    const limit = Number(queryParams.limit) || 20;
    const page = Number(queryParams.page) || 1;
    return sendSuccess(res, data, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });

  public getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const employee = await employeesService.getEmployeeByUserId(req.user.userId);
    return sendSuccess(res, employee, 200);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    // If user does not have employees.view, they can only view their own employee record
    if (
      !req.user?.roles.includes('Admin') &&
      !req.user?.permissions.includes('employees.view') &&
      req.user?.employeeId !== id
    ) {
      throw new ForbiddenError('You do not have permission to view other employee records');
    }

    const employee = await employeesService.getEmployeeById(id);
    return sendSuccess(res, employee, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const result = await employeesService.createEmployee(req.body, req.user?.userId, ip);
    return sendCreated(
      res,
      result,
      `Employee ${result.employee.employee_code} created successfully. Temporary password: ${result.temporaryPassword}`
    );
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await employeesService.updateEmployee(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, updated, 200, undefined, 'Employee updated successfully');
  });

  public updateLifecycle = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await employeesService.updateLifecycleStage(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, updated, 200, undefined, 'Lifecycle stage updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await employeesService.deleteEmployee(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Employee removed successfully');
  });
}

export const employeesController = new EmployeesController();
export default employeesController;
