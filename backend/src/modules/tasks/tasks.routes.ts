import { Router } from 'express';
import { tasksController } from './tasks.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createCommentSchema,
  createModuleSchema,
  taskQuerySchema,
} from './tasks.schema';

const router = Router();

router.use(authenticate);

// My Tasks (Employees viewing their assigned tasks)
router.get('/my', tasksController.getMyTasks);

// Modules
router.get('/modules/:projectId', tasksController.getModules);
router.post(
  '/modules',
  requirePermission('projects.edit'),
  validate({ body: createModuleSchema }),
  tasksController.createModule
);

// List Tasks
router.get(
  '/',
  validate({ query: taskQuerySchema }),
  tasksController.getAll
);

// Get Task by ID
router.get(
  '/:id',
  validate({ params: taskIdParamSchema }),
  tasksController.getById
);

// Create Task
router.post(
  '/',
  requirePermission('tasks.create'),
  validate({ body: createTaskSchema }),
  tasksController.create
);

// Update Task Details
router.put(
  '/:id',
  requirePermission('tasks.edit'),
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  tasksController.update
);

// Transition Task Status (Workflow transition)
router.patch(
  '/:id/status',
  validate({ params: taskIdParamSchema, body: updateTaskStatusSchema }),
  tasksController.updateStatus
);

// Delete Task
router.delete(
  '/:id',
  requirePermission('tasks.delete'),
  validate({ params: taskIdParamSchema }),
  tasksController.delete
);

// Comments
router.post(
  '/:id/comments',
  validate({ params: taskIdParamSchema, body: createCommentSchema }),
  tasksController.addComment
);

export default router;
