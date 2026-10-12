import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  updateCompanySettingsSchema,
  updateWorkSettingsSchema,
  updateLeavePolicySchema,
  updatePayrollSettingsSchema,
} from './settings.schema';
import {
  uploadLogoMulter,
  uploadFaviconMulter,
  uploadSignatureMulter,
  validateImageBuffer,
} from './settings.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';

// 1. Public branding routes (NO auth)
export const publicBrandingRouter = Router();
publicBrandingRouter.get('/', asyncHandler(settingsController.getPublicBranding.bind(settingsController)));
publicBrandingRouter.get('/file/:filename', asyncHandler(settingsController.serveBrandingFile.bind(settingsController)));

// 2. Settings management routes (Requires auth)
export const settingsRouter = Router();
settingsRouter.use(authenticate);

// Company settings
settingsRouter.get(
  '/company',
  requirePermission('settings.view'),
  asyncHandler(settingsController.getCompanySettings.bind(settingsController))
);

settingsRouter.put(
  '/company',
  requirePermission('settings.company.edit'),
  validate({ body: updateCompanySettingsSchema }),
  asyncHandler(settingsController.updateCompanySettings.bind(settingsController))
);

// Branding files
settingsRouter.post(
  '/company/logo',
  requirePermission('settings.company.edit'),
  uploadLogoMulter,
  validateImageBuffer,
  asyncHandler(settingsController.uploadLogo.bind(settingsController))
);

settingsRouter.delete(
  '/company/logo',
  requirePermission('settings.company.edit'),
  asyncHandler(settingsController.deleteLogo.bind(settingsController))
);

settingsRouter.post(
  '/company/favicon',
  requirePermission('settings.company.edit'),
  uploadFaviconMulter,
  validateImageBuffer,
  asyncHandler(settingsController.uploadFavicon.bind(settingsController))
);

settingsRouter.delete(
  '/company/favicon',
  requirePermission('settings.company.edit'),
  asyncHandler(settingsController.deleteFavicon.bind(settingsController))
);

settingsRouter.post(
  '/company/signature',
  requirePermission('settings.company.edit'),
  uploadSignatureMulter,
  validateImageBuffer,
  asyncHandler(settingsController.uploadSignature.bind(settingsController))
);

settingsRouter.delete(
  '/company/signature',
  requirePermission('settings.company.edit'),
  asyncHandler(settingsController.deleteSignature.bind(settingsController))
);

// Work and Attendance settings
settingsRouter.get(
  '/work',
  requirePermission('settings.view'),
  asyncHandler(settingsController.getWorkSettings.bind(settingsController))
);

settingsRouter.put(
  '/work',
  requirePermission('settings.edit'),
  validate({ body: updateWorkSettingsSchema }),
  asyncHandler(settingsController.updateWorkSettings.bind(settingsController))
);

// Leave Policy settings
settingsRouter.get(
  '/leave-policy',
  requirePermission('settings.view'),
  asyncHandler(settingsController.getLeavePolicy.bind(settingsController))
);

settingsRouter.put(
  '/leave-policy',
  requirePermission('settings.edit'),
  validate({ body: updateLeavePolicySchema }),
  asyncHandler(settingsController.updateLeavePolicy.bind(settingsController))
);

// Payroll settings
settingsRouter.get(
  '/payroll',
  requirePermission('settings.view'),
  asyncHandler(settingsController.getPayrollSettings.bind(settingsController))
);

settingsRouter.put(
  '/payroll',
  requirePermission('settings.edit'),
  validate({ body: updatePayrollSettingsSchema }),
  asyncHandler(settingsController.updatePayrollSettings.bind(settingsController))
);

export default settingsRouter;
