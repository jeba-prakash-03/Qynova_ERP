import { Request, Response } from 'express';
import { rolesService } from './roles.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';

export class RolesController {
  public getAll = asyncHandler(async (_req: Request, res: Response) => {
    const roles = await rolesService.getAllRoles();
    return sendSuccess(res, roles, 200);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const roleId = Number(req.params.id);
    const role = await rolesService.getRoleById(roleId);
    return sendSuccess(res, role, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const role = await rolesService.createRole(req.body, req.user?.userId, ip);
    return sendCreated(res, role, 'Role created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const roleId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const role = await rolesService.updateRole(roleId, req.body, req.user?.userId, ip);
    return sendSuccess(res, role, 200, undefined, 'Role updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const roleId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await rolesService.deleteRole(roleId, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Role deleted successfully');
  });

  public updatePermissions = asyncHandler(async (req: Request, res: Response) => {
    const roleId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const role = await rolesService.updateRolePermissions(
      roleId,
      req.body.permissionIds,
      req.user?.userId,
      ip
    );
    return sendSuccess(res, role, 200, undefined, 'Role permissions updated successfully');
  });

  public getPermissions = asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await rolesService.getAllPermissions();
    return sendSuccess(res, permissions, 200);
  });
}

export const rolesController = new RolesController();
export default rolesController;
