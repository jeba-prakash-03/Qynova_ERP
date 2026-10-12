import { Router, Request, Response, NextFunction } from 'express';
import { expensesController } from './expenses.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-error';
import {
  expenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  updateExpenseStatusSchema,
  expenseQuerySchema,
} from './expenses.schema';

const router = Router();

router.use(authenticate);

// Middleware to check any expense view permission
const requireExpenseView = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw new UnauthorizedError('User authentication required');
  if (req.user.roles.includes('Admin') || req.user.roles.includes('HR')) {
    return next();
  }
  const allowed = ['expenses.view', 'expenses.view_team', 'expenses.view_own'];
  if (allowed.some((p) => req.user?.permissions.includes(p))) {
    return next();
  }
  throw new ForbiddenError("Permission 'expenses.view' required");
};

// Categories
router.get('/categories', expensesController.getCategories);

// List expenses
router.get('/', requireExpenseView, validate({ query: expenseQuerySchema }), expensesController.getAll);

// Get by ID
router.get('/:id', requireExpenseView, validate({ params: expenseIdParamSchema }), expensesController.getById);

// Create expense
router.post(
  '/',
  requirePermission('expenses.create'),
  validate({ body: createExpenseSchema }),
  expensesController.create
);

// Update expense
router.put(
  '/:id',
  requirePermission('expenses.edit'),
  validate({ params: expenseIdParamSchema, body: updateExpenseSchema }),
  expensesController.update
);

// Update status (Approve / Reject)
router.patch(
  '/:id/status',
  requirePermission('expenses.approve'),
  validate({ params: expenseIdParamSchema, body: updateExpenseStatusSchema }),
  expensesController.updateStatus
);

// Delete draft expense
router.delete(
  '/:id',
  requirePermission('expenses.delete'),
  validate({ params: expenseIdParamSchema }),
  expensesController.delete
);

export default router;
