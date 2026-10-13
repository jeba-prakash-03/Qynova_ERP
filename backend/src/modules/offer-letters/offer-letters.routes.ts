import { Router } from 'express';
import { offerLettersController } from './offer-letters.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../../shared/middleware/permission.middleware';

const router = Router();

router.use(authenticate);

// ==========================================
// TEMPLATES (Offer letter templates management)
// ==========================================
router.get(
  '/templates',
  requireAnyPermission('offer_letter_templates.manage', 'settings.view', 'offer_letters.view'),
  offerLettersController.listTemplates
);

router.get(
  '/templates/:id',
  requireAnyPermission('offer_letter_templates.manage', 'settings.view', 'offer_letters.view'),
  offerLettersController.getTemplateById
);

router.post(
  '/templates',
  requirePermission('offer_letter_templates.manage'),
  offerLettersController.createTemplate
);

router.put(
  '/templates/:id',
  requirePermission('offer_letter_templates.manage'),
  offerLettersController.updateTemplate
);

router.post(
  '/templates/:id/duplicate',
  requirePermission('offer_letter_templates.manage'),
  offerLettersController.duplicateTemplate
);

router.post(
  '/templates/:id/default',
  requirePermission('offer_letter_templates.manage'),
  offerLettersController.setDefaultTemplate
);

router.delete(
  '/templates/:id',
  requirePermission('offer_letter_templates.manage'),
  offerLettersController.deleteTemplate
);

// ==========================================
// OFFER LETTERS
// ==========================================
// Employee view own offer letter
router.get(
  '/my',
  requireAnyPermission('offer_letters.view_own', 'offer_letters.view'),
  offerLettersController.getMyOfferLetter
);

// List all offer letters
router.get(
  '/',
  requirePermission('offer_letters.view'),
  offerLettersController.listOfferLetters
);

// Get employee's offer letters & version history
router.get(
  '/employee/:employeeId',
  requirePermission('offer_letters.view'),
  offerLettersController.getEmployeeOfferLetters
);

// Download PDF
router.get(
  '/:id/download',
  requireAnyPermission('offer_letters.view', 'offer_letters.view_own'),
  offerLettersController.downloadPdf
);

// Get single offer letter by ID
router.get(
  '/:id',
  requireAnyPermission('offer_letters.view', 'offer_letters.view_own'),
  offerLettersController.getOfferLetterById
);

// Generate / Regenerate / Save draft
router.post(
  '/generate',
  requirePermission('offer_letters.create'),
  offerLettersController.generate
);

// Send offer letter via email
router.post(
  '/:id/send',
  requirePermission('offer_letters.send'),
  offerLettersController.send
);

// Mark as accepted
router.post(
  '/:id/accept',
  requirePermission('offer_letters.edit'),
  offerLettersController.markAccepted
);

// Mark as declined
router.post(
  '/:id/decline',
  requirePermission('offer_letters.edit'),
  offerLettersController.markDeclined
);

export default router;
