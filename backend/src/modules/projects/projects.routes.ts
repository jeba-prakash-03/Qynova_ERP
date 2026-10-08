import { Router, Request, Response, NextFunction } from 'express';
import { projectsController } from './projects.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission, requireEmployee } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-error';
import {
  projectIdParamSchema,
  memberParamSchema,
  milestoneParamSchema,
  projectQuerySchema,
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  addProjectMemberSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './projects.schema';

const router = Router();

router.use(authenticate);

// Middleware allowing users with any project view permission
const requireProjectView = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw new UnauthorizedError('User authentication required');
  if (req.user.roles.includes('Admin') || req.user.roles.includes('HR')) {
    return next();
  }
  const allowed = ['projects.view', 'projects.view_team', 'projects.view_own'];
  if (allowed.some((p) => req.user?.permissions.includes(p))) {
    return next();
  }
  throw new ForbiddenError("Permission 'projects.view' required");
};

// GET /projects/my-assignments (for Dev 2 timesheet dropdown)
router.get(
  '/my-assignments',
  requireEmployee,
  projectsController.getMyAssignments
);

// List projects (with visibility filter)
router.get(
  '/',
  requireProjectView,
  validate({ query: projectQuerySchema }),
  projectsController.getAll
);

// Get project by ID
router.get(
  '/:id',
  requireProjectView,
  validate({ params: projectIdParamSchema }),
  projectsController.getById
);

// Create project
router.post(
  '/',
  requirePermission('projects.create'),
  validate({ body: createProjectSchema }),
  projectsController.create
);

// Update project
router.put(
  '/:id',
  requirePermission('projects.edit'),
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  projectsController.update
);

// Transition project status
router.patch(
  '/:id/status',
  requirePermission('projects.edit'),
  validate({ params: projectIdParamSchema, body: updateProjectStatusSchema }),
  projectsController.updateStatus
);

// Soft delete project
router.delete(
  '/:id',
  requirePermission('projects.delete'),
  validate({ params: projectIdParamSchema }),
  projectsController.delete
);

// --- Members ---
router.post(
  '/:id/members',
  requirePermission('projects.edit'),
  validate({ params: projectIdParamSchema, body: addProjectMemberSchema }),
  projectsController.addMember
);

router.delete(
  '/:id/members/:employeeId',
  requirePermission('projects.edit'),
  validate({ params: memberParamSchema }),
  projectsController.removeMember
);

// --- Milestones ---
router.post(
  '/:id/milestones',
  requirePermission('milestones.create'),
  validate({ params: projectIdParamSchema, body: createMilestoneSchema }),
  projectsController.addMilestone
);

router.put(
  '/:id/milestones/:milestoneId',
  requirePermission('milestones.edit'),
  validate({ params: milestoneParamSchema, body: updateMilestoneSchema }),
  projectsController.updateMilestone
);

router.delete(
  '/:id/milestones/:milestoneId',
  requirePermission('milestones.delete'),
  validate({ params: milestoneParamSchema }),
  projectsController.deleteMilestone
);

export default router;
