import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  requirePermission,
  requireEmployee,
} from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  checkInSchema,
  checkOutSchema,
  manualAttendanceSchema,
  updateAttendanceSchema,
  attendanceSheetQuerySchema,
  monthlySheetQuerySchema,
} from './attendance.schema';

const router = Router();

router.use(authenticate);

// ==========================================
// 1. Employee Punch & Break Endpoints
// ==========================================
router.post(
  '/check-in',
  requireEmployee,
  validate({ body: checkInSchema }),
  attendanceController.checkIn
);

router.post(
  '/check-out',
  requireEmployee,
  validate({ body: checkOutSchema }),
  attendanceController.checkOut
);

router.post('/break/start', requireEmployee, attendanceController.startBreak);
router.post('/break/end', requireEmployee, attendanceController.endBreak);

router.get('/today', requireEmployee, attendanceController.getToday);
router.get('/me', requireEmployee, attendanceController.getMyMonthly);

// ==========================================
// 2. Attendance Sheets (Admin / HR / Manager)
// ==========================================
router.get(
  '/sheet',
  // Can be viewed by users with attendance.view OR attendance.view_team
  (req, res, next) => {
    const perms = req.user?.permissions || [];
    if (perms.includes('attendance.view') || perms.includes('attendance.view_team')) {
      return next();
    }
    return requirePermission('attendance.view')(req, res, next);
  },
  validate({ query: attendanceSheetQuerySchema }),
  attendanceController.getDailySheet
);

router.get(
  '/monthly-sheet',
  (req, res, next) => {
    const perms = req.user?.permissions || [];
    if (perms.includes('attendance.view') || perms.includes('attendance.view_team')) {
      return next();
    }
    return requirePermission('attendance.view')(req, res, next);
  },
  validate({ query: monthlySheetQuerySchema }),
  attendanceController.getMonthlySheet
);

router.get('/export', attendanceController.exportSheet);

// ==========================================
// 3. Admin / HR Manual Edit & Insertion
// ==========================================
router.post(
  '/',
  requirePermission('attendance.edit'),
  validate({ body: manualAttendanceSchema }),
  attendanceController.createManual
);

router.put(
  '/:id',
  requirePermission('attendance.edit'),
  validate({ body: updateAttendanceSchema }),
  attendanceController.update
);

router.delete(
  '/:id',
  requirePermission('attendance.edit'),
  attendanceController.delete
);

export default router;
