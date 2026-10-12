import { Router } from 'express';
import { pushController } from './push.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

// All push endpoints require authentication
router.use(authenticate);

router.post('/register', pushController.register);
router.delete('/register', pushController.unregister);
router.get('/preferences', pushController.getPreferences);
router.put('/preferences', pushController.updatePreferences);
router.post('/test', pushController.sendTest);

export default router;
