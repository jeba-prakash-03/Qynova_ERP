import { Request, Response } from 'express';
import { departmentsService } from './departments.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';

export class DepartmentsController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const isTree = req.query.tree === 'true';
    const departments = await departmentsService.getAllDepartments(isTree);
    return sendSuccess(res, departments, 200);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const department = await departmentsService.getDepartmentById(id);
    return sendSuccess(res, department, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const department = await departmentsService.createDepartment(req.body, req.user?.userId, ip);
    return sendCreated(res, department, 'Department created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const department = await departmentsService.updateDepartment(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, department, 200, undefined, 'Department updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await departmentsService.deleteDepartment(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Department deleted successfully');
  });
}

export const departmentsController = new DepartmentsController();
export default departmentsController;
