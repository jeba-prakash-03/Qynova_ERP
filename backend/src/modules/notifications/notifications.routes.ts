import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.getAll);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreference);

// Outbox trigger
router.post('/process-outbox', notificationsController.processOutbox);

export default router;
