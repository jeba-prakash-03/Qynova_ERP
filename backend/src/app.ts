import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import rolesRoutes from './modules/roles/roles.routes';
import permissionsRoutes from './modules/permissions/permissions.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import designationsRoutes from './modules/designations/designations.routes';
import employeesRoutes from './modules/employees/employees.routes';
import auditLogsRoutes from './modules/audit-logs/audit-logs.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import holidaysRoutes from './modules/holidays/holidays.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRequestsRoutes from './modules/leaves/leave-requests.routes';
import leaveBalancesRoutes from './modules/leaves/leave-balances.routes';
import leaveTypesRoutes from './modules/leaves/leave-types.routes';
import documentsRoutes from './modules/documents/documents.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import timesheetsRoutes from './modules/timesheets/timesheets.routes';
import clientsRoutes from './modules/clients/clients.routes';
import projectsRoutes from './modules/projects/projects.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import financeRoutes from './modules/profitability/profitability.routes';
import crmRoutes from './modules/crm/crm.routes';

export const createApp = (): Application => {
  const app = express();

  // CORS Configuration
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: [clientUrl, 'http://127.0.0.1:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/permissions', permissionsRoutes);
  app.use('/api/v1/departments', departmentsRoutes);
  app.use('/api/v1/designations', designationsRoutes);
  app.use('/api/v1/employees', employeesRoutes);
  app.use('/api/v1/audit-logs', auditLogsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/holidays', holidaysRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/leave-requests', leaveRequestsRoutes);
  app.use('/api/v1/leaves', leaveRequestsRoutes);
  app.use('/api/v1/leave-balances', leaveBalancesRoutes);
  app.use('/api/v1/leave-types', leaveTypesRoutes);
  app.use('/api/v1/documents', documentsRoutes);
  app.use('/api/v1/payroll', payrollRoutes);
  app.use('/api/v1/timesheets', timesheetsRoutes);
  app.use('/api/v1/clients', clientsRoutes);
  app.use('/api/v1/projects', projectsRoutes);
  app.use('/api/v1/tasks', tasksRoutes);
  app.use('/api/v1/expenses', expensesRoutes);
  app.use('/api/v1/invoices', invoicesRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/crm', crmRoutes);

  // 404 Route handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.baseUrl} not found`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
