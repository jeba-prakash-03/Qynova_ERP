export interface PermissionDefinition {
  module: string;
  action: string;
  name: string;
  description: string;
}

export const ALL_SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // --- DEV 1 MODULES ---
  // Employees
  { module: 'employees', action: 'view', name: 'employees.view', description: 'View all employees' },
  { module: 'employees', action: 'view_own', name: 'employees.view_own', description: 'View own employee profile' },
  { module: 'employees', action: 'view_team', name: 'employees.view_team', description: 'View team members profiles' },
  { module: 'employees', action: 'create', name: 'employees.create', description: 'Create new employee' },
  { module: 'employees', action: 'edit', name: 'employees.edit', description: 'Edit employee details' },
  { module: 'employees', action: 'delete', name: 'employees.delete', description: 'Delete employee (soft delete)' },
  { module: 'employees', action: 'export', name: 'employees.export', description: 'Export employee data' },

  // Departments
  { module: 'departments', action: 'view', name: 'departments.view', description: 'View departments' },
  { module: 'departments', action: 'create', name: 'departments.create', description: 'Create department' },
  { module: 'departments', action: 'edit', name: 'departments.edit', description: 'Edit department' },
  { module: 'departments', action: 'delete', name: 'departments.delete', description: 'Delete department' },

  // Designations
  { module: 'designations', action: 'view', name: 'designations.view', description: 'View designations' },
  { module: 'designations', action: 'create', name: 'designations.create', description: 'Create designation' },
  { module: 'designations', action: 'edit', name: 'designations.edit', description: 'Edit designation' },
  { module: 'designations', action: 'delete', name: 'designations.delete', description: 'Delete designation' },

  // Roles & RBAC
  { module: 'roles', action: 'view', name: 'roles.view', description: 'View roles and permissions' },
  { module: 'roles', action: 'create', name: 'roles.create', description: 'Create role' },
  { module: 'roles', action: 'edit', name: 'roles.edit', description: 'Edit role and permissions' },
  { module: 'roles', action: 'delete', name: 'roles.delete', description: 'Delete role' },

  // Users
  { module: 'users', action: 'view', name: 'users.view', description: 'View user accounts' },
  { module: 'users', action: 'create', name: 'users.create', description: 'Create user account' },
  { module: 'users', action: 'edit', name: 'users.edit', description: 'Edit user account' },
  { module: 'users', action: 'delete', name: 'users.delete', description: 'Delete user account' },

  // Documents
  { module: 'documents', action: 'view', name: 'documents.view', description: 'View all documents' },
  { module: 'documents', action: 'view_own', name: 'documents.view_own', description: 'View own documents' },
  { module: 'documents', action: 'view_team', name: 'documents.view_team', description: 'View team documents' },
  { module: 'documents', action: 'create', name: 'documents.create', description: 'Upload document' },
  { module: 'documents', action: 'edit', name: 'documents.edit', description: 'Edit document details' },
  { module: 'documents', action: 'delete', name: 'documents.delete', description: 'Delete document' },

  // Audit Logs
  { module: 'audit_logs', action: 'view', name: 'audit_logs.view', description: 'View system audit logs' },
  { module: 'audit_logs', action: 'export', name: 'audit_logs.export', description: 'Export audit logs' },

  // Notifications
  { module: 'notifications', action: 'view', name: 'notifications.view', description: 'View notifications' },
  { module: 'notifications', action: 'create', name: 'notifications.create', description: 'Send broadcast notification' },
  { module: 'notifications', action: 'edit', name: 'notifications.edit', description: 'Edit notification status' },
  { module: 'notifications', action: 'delete', name: 'notifications.delete', description: 'Delete notifications' },

  // Assets
  { module: 'assets', action: 'view', name: 'assets.view', description: 'View company assets' },
  { module: 'assets', action: 'view_own', name: 'assets.view_own', description: 'View own assigned assets' },
  { module: 'assets', action: 'create', name: 'assets.create', description: 'Create asset' },
  { module: 'assets', action: 'edit', name: 'assets.edit', description: 'Edit asset details' },
  { module: 'assets', action: 'delete', name: 'assets.delete', description: 'Delete asset' },
  { module: 'assets', action: 'assign', name: 'assets.assign', description: 'Assign or return assets' },

  // --- DEV 2 MODULES ---
  // Attendance
  { module: 'attendance', action: 'view', name: 'attendance.view', description: 'View company attendance' },
  { module: 'attendance', action: 'view_own', name: 'attendance.view_own', description: 'View own attendance' },
  { module: 'attendance', action: 'view_team', name: 'attendance.view_team', description: 'View team attendance' },
  { module: 'attendance', action: 'create', name: 'attendance.create', description: 'Mark/create attendance' },
  { module: 'attendance', action: 'edit', name: 'attendance.edit', description: 'Edit attendance records' },
  { module: 'attendance', action: 'delete', name: 'attendance.delete', description: 'Delete attendance records' },
  { module: 'attendance', action: 'approve', name: 'attendance.approve', description: 'Approve attendance adjustments' },
  { module: 'attendance', action: 'export', name: 'attendance.export', description: 'Export attendance report' },

  // Leave
  { module: 'leave', action: 'view', name: 'leave.view', description: 'View company leave requests' },
  { module: 'leave', action: 'view_own', name: 'leave.view_own', description: 'View own leave requests' },
  { module: 'leave', action: 'view_team', name: 'leave.view_team', description: 'View team leave requests' },
  { module: 'leave', action: 'create', name: 'leave.create', description: 'Apply for leave' },
  { module: 'leave', action: 'edit', name: 'leave.edit', description: 'Edit leave request' },
  { module: 'leave', action: 'delete', name: 'leave.delete', description: 'Cancel/delete leave request' },
  { module: 'leave', action: 'approve', name: 'leave.approve', description: 'Approve or reject leave' },
  { module: 'leave', action: 'export', name: 'leave.export', description: 'Export leave data' },

  // Holidays
  { module: 'holidays', action: 'view', name: 'holidays.view', description: 'View holiday calendar' },
  { module: 'holidays', action: 'create', name: 'holidays.create', description: 'Add holiday' },
  { module: 'holidays', action: 'edit', name: 'holidays.edit', description: 'Edit holiday' },
  { module: 'holidays', action: 'delete', name: 'holidays.delete', description: 'Delete holiday' },

  // Timesheets
  { module: 'timesheets', action: 'view', name: 'timesheets.view', description: 'View all timesheets' },
  { module: 'timesheets', action: 'view_own', name: 'timesheets.view_own', description: 'View own timesheets' },
  { module: 'timesheets', action: 'view_team', name: 'timesheets.view_team', description: 'View team timesheets' },
  { module: 'timesheets', action: 'create', name: 'timesheets.create', description: 'Submit timesheet' },
  { module: 'timesheets', action: 'edit', name: 'timesheets.edit', description: 'Edit timesheet' },
  { module: 'timesheets', action: 'delete', name: 'timesheets.delete', description: 'Delete timesheet' },
  { module: 'timesheets', action: 'approve', name: 'timesheets.approve', description: 'Approve timesheet' },
  { module: 'timesheets', action: 'export', name: 'timesheets.export', description: 'Export timesheets' },

  // Payroll
  { module: 'payroll', action: 'view', name: 'payroll.view', description: 'View payroll records' },
  { module: 'payroll', action: 'view_own', name: 'payroll.view_own', description: 'View own salary information' },
  { module: 'payroll', action: 'create', name: 'payroll.create', description: 'Create salary structure' },
  { module: 'payroll', action: 'edit', name: 'payroll.edit', description: 'Edit salary structure' },
  { module: 'payroll', action: 'delete', name: 'payroll.delete', description: 'Delete salary structure' },
  { module: 'payroll', action: 'approve', name: 'payroll.approve', description: 'Approve payroll batch' },
  { module: 'payroll', action: 'run', name: 'payroll.run', description: 'Execute payroll run' },
  { module: 'payroll', action: 'export', name: 'payroll.export', description: 'Export payroll data' },

  // Payslips
  { module: 'payslips', action: 'view', name: 'payslips.view', description: 'View all payslips' },
  { module: 'payslips', action: 'view_own', name: 'payslips.view_own', description: 'View own payslips' },
  { module: 'payslips', action: 'create', name: 'payslips.create', description: 'Generate payslip' },
  { module: 'payslips', action: 'edit', name: 'payslips.edit', description: 'Edit payslip' },
  { module: 'payslips', action: 'delete', name: 'payslips.delete', description: 'Delete payslip' },
  { module: 'payslips', action: 'export', name: 'payslips.export', description: 'Download/export payslip' },

  // --- DEV 3 MODULES ---
  // Clients
  { module: 'clients', action: 'view', name: 'clients.view', description: 'View clients' },
  { module: 'clients', action: 'view_own', name: 'clients.view_own', description: 'View assigned clients' },
  { module: 'clients', action: 'create', name: 'clients.create', description: 'Create client' },
  { module: 'clients', action: 'edit', name: 'clients.edit', description: 'Edit client details' },
  { module: 'clients', action: 'delete', name: 'clients.delete', description: 'Delete client' },
  { module: 'clients', action: 'export', name: 'clients.export', description: 'Export clients' },

  // Projects
  { module: 'projects', action: 'view', name: 'projects.view', description: 'View projects' },
  { module: 'projects', action: 'view_own', name: 'projects.view_own', description: 'View assigned projects' },
  { module: 'projects', action: 'view_team', name: 'projects.view_team', description: 'View team projects' },
  { module: 'projects', action: 'create', name: 'projects.create', description: 'Create project' },
  { module: 'projects', action: 'edit', name: 'projects.edit', description: 'Edit project' },
  { module: 'projects', action: 'delete', name: 'projects.delete', description: 'Delete project' },
  { module: 'projects', action: 'export', name: 'projects.export', description: 'Export projects' },
  { module: 'projects', action: 'view_financials', name: 'projects.view_financials', description: 'View project financial metrics and profitability' },

  // Tasks
  { module: 'tasks', action: 'view', name: 'tasks.view', description: 'View tasks' },
  { module: 'tasks', action: 'view_own', name: 'tasks.view_own', description: 'View assigned tasks' },
  { module: 'tasks', action: 'view_team', name: 'tasks.view_team', description: 'View team tasks' },
  { module: 'tasks', action: 'create', name: 'tasks.create', description: 'Create task' },
  { module: 'tasks', action: 'edit', name: 'tasks.edit', description: 'Edit task' },
  { module: 'tasks', action: 'delete', name: 'tasks.delete', description: 'Delete task' },
  { module: 'tasks', action: 'assign', name: 'tasks.assign', description: 'Assign tasks to employees' },
  { module: 'tasks', action: 'export', name: 'tasks.export', description: 'Export tasks' },

  // Milestones
  { module: 'milestones', action: 'view', name: 'milestones.view', description: 'View milestones' },
  { module: 'milestones', action: 'create', name: 'milestones.create', description: 'Create milestone' },
  { module: 'milestones', action: 'edit', name: 'milestones.edit', description: 'Edit milestone' },
  { module: 'milestones', action: 'delete', name: 'milestones.delete', description: 'Delete milestone' },

  // Expenses
  { module: 'expenses', action: 'view', name: 'expenses.view', description: 'View expenses' },
  { module: 'expenses', action: 'view_own', name: 'expenses.view_own', description: 'View own expenses' },
  { module: 'expenses', action: 'view_team', name: 'expenses.view_team', description: 'View team expenses' },
  { module: 'expenses', action: 'create', name: 'expenses.create', description: 'Create expense claim' },
  { module: 'expenses', action: 'edit', name: 'expenses.edit', description: 'Edit expense claim' },
  { module: 'expenses', action: 'delete', name: 'expenses.delete', description: 'Delete expense claim' },
  { module: 'expenses', action: 'approve', name: 'expenses.approve', description: 'Approve expense claim' },
  { module: 'expenses', action: 'export', name: 'expenses.export', description: 'Export expenses' },

  // Invoices
  { module: 'invoices', action: 'view', name: 'invoices.view', description: 'View invoices' },
  { module: 'invoices', action: 'create', name: 'invoices.create', description: 'Create invoice' },
  { module: 'invoices', action: 'edit', name: 'invoices.edit', description: 'Edit invoice' },
  { module: 'invoices', action: 'delete', name: 'invoices.delete', description: 'Delete invoice' },
  { module: 'invoices', action: 'approve', name: 'invoices.approve', description: 'Approve invoice' },
  { module: 'invoices', action: 'export', name: 'invoices.export', description: 'Export invoices' },

  // Payments
  { module: 'payments', action: 'view', name: 'payments.view', description: 'View payments' },
  { module: 'payments', action: 'create', name: 'payments.create', description: 'Record payment' },
  { module: 'payments', action: 'edit', name: 'payments.edit', description: 'Edit payment' },
  { module: 'payments', action: 'delete', name: 'payments.delete', description: 'Delete payment' },
  { module: 'payments', action: 'export', name: 'payments.export', description: 'Export payments' },

  // CRM
  { module: 'crm', action: 'view', name: 'crm.view', description: 'View CRM leads and deals' },
  { module: 'crm', action: 'view_own', name: 'crm.view_own', description: 'View own leads' },
  { module: 'crm', action: 'create', name: 'crm.create', description: 'Create lead/deal' },
  { module: 'crm', action: 'edit', name: 'crm.edit', description: 'Edit lead/deal' },
  { module: 'crm', action: 'delete', name: 'crm.delete', description: 'Delete lead/deal' },
  { module: 'crm', action: 'export', name: 'crm.export', description: 'Export CRM data' },

  // Contracts
  { module: 'contracts', action: 'view', name: 'contracts.view', description: 'View contracts' },
  { module: 'contracts', action: 'create', name: 'contracts.create', description: 'Create contract' },
  { module: 'contracts', action: 'edit', name: 'contracts.edit', description: 'Edit contract' },
  { module: 'contracts', action: 'delete', name: 'contracts.delete', description: 'Delete contract' },
  { module: 'contracts', action: 'export', name: 'contracts.export', description: 'Export contracts' },

  // Reports
  { module: 'reports', action: 'view', name: 'reports.view', description: 'View analytics and reports' },
  { module: 'reports', action: 'export', name: 'reports.export', description: 'Export reports' },
];
