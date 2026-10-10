import { Router } from 'express';
import { documentsController } from './documents.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

router.use(authenticate);

// Download document (checks permissions and sensitive types)
router.get('/:id/download', asyncHandler(documentsController.download));

// Delete document (audited, Admin/HR only)
router.delete('/:id', asyncHandler(documentsController.delete));

export default router;
