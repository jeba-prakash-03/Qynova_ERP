import { Router } from 'express';
import { profitabilityController } from './profitability.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Financial Overview
router.get('/overview', profitabilityController.getFinanceOverview);

export default router;
