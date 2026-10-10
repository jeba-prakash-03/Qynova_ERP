import { Router } from 'express';
import { leavesController } from './leaves.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

// All leave-types routes require authentication
router.use(authenticate);

router.get('/', asyncHandler(leavesController.getAllTypes));
router.get('/:id', asyncHandler(leavesController.getTypeById));

export default router;
