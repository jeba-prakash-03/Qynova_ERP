import { Router, Request, Response, NextFunction } from 'express';
import { invoicesController } from './invoices.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-error';
import {
  invoiceIdParamSchema,
  milestoneIdParamSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  recordPaymentSchema,
  invoiceQuerySchema,
} from './invoices.schema';

const router = Router();

router.use(authenticate);

const requireInvoiceView = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw new UnauthorizedError('User authentication required');
  if (req.user.roles.includes('Admin') || req.user.roles.includes('HR')) {
    return next();
  }
  const allowed = ['invoices.view', 'projects.view', 'projects.view_team'];
  if (allowed.some((p) => req.user?.permissions.includes(p))) {
    return next();
  }
  throw new ForbiddenError("Permission 'invoices.view' required");
};

// List invoices
router.get('/', requireInvoiceView, validate({ query: invoiceQuerySchema }), invoicesController.getAll);

// Create from Milestone
router.post(
  '/from-milestone/:milestoneId',
  requirePermission('invoices.create'),
  validate({ params: milestoneIdParamSchema }),
  invoicesController.createFromMilestone
);

// Get by ID
router.get('/:id', requireInvoiceView, validate({ params: invoiceIdParamSchema }), invoicesController.getById);

// Stream PDF
router.get('/:id/pdf', requireInvoiceView, validate({ params: invoiceIdParamSchema }), invoicesController.getPdf);

// Create invoice
router.post(
  '/',
  requirePermission('invoices.create'),
  validate({ body: createInvoiceSchema }),
  invoicesController.create
);

// Update invoice
router.put(
  '/:id',
  requirePermission('invoices.edit'),
  validate({ params: invoiceIdParamSchema, body: updateInvoiceSchema }),
  invoicesController.update
);

// Update status
router.patch(
  '/:id/status',
  requirePermission('invoices.edit'),
  validate({ params: invoiceIdParamSchema, body: updateInvoiceStatusSchema }),
  invoicesController.updateStatus
);

// Delete draft invoice
router.delete(
  '/:id',
  requirePermission('invoices.delete'),
  validate({ params: invoiceIdParamSchema }),
  invoicesController.delete
);

// Record payment
router.post(
  '/:id/payments',
  requirePermission('payments.create'),
  validate({ params: invoiceIdParamSchema, body: recordPaymentSchema }),
  invoicesController.recordPayment
);

// Get payments for invoice
router.get(
  '/:id/payments',
  requireInvoiceView,
  validate({ params: invoiceIdParamSchema }),
  invoicesController.getPayments
);

export default router;
