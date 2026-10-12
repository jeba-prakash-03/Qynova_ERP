import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './shared/context/AuthContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { AppShell } from './shared/components/AppShell';

// Auth Pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { ChangePasswordPage } from './features/auth/pages/ChangePasswordPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';

// Dashboards
import { AdminDashboard } from './features/dashboard/AdminDashboard';
import { ManagerDashboard } from './features/dashboard/ManagerDashboard';
import { EmployeeDashboard } from './features/dashboard/EmployeeDashboard';

// People & Org (Dev 1)
import { EmployeeListPage } from './features/employees/pages/EmployeeListPage';
import { EmployeeCreatePage } from './features/employees/pages/EmployeeCreatePage';
import { EmployeeDetailPage } from './features/employees/pages/EmployeeDetailPage';
import { EmployeeEditPage } from './features/employees/pages/EmployeeEditPage';
import { DepartmentListPage } from './features/departments/pages/DepartmentListPage';
import { DesignationListPage } from './features/designations/pages/DesignationListPage';

// Security & RBAC (Dev 1)
import { RoleListPage } from './features/roles/pages/RoleListPage';
import { RolePermissionsPage } from './features/roles/pages/RolePermissionsPage';


// Time & Attendance (Dev 2)
import { HolidaysPage } from './features/holidays/pages/HolidaysPage';
import { MyAttendancePage } from './features/attendance/pages/MyAttendancePage';
import { AttendanceSheetPage } from './features/attendance/pages/AttendanceSheetPage';
import { MyLeavesPage } from './features/leaves/pages/MyLeavesPage';
import { LeaveApprovalsPage } from './features/leaves/pages/LeaveApprovalsPage';

// Payroll & Timesheets (Dev 2)
import { PayrollRunPage } from './features/payroll/pages/PayrollRunPage';
import { MyPayslipsPage } from './features/payroll/pages/MyPayslipsPage';
import { MyTimesheetsPage } from './features/timesheets/pages/MyTimesheetsPage';

// Clients & Projects & Tasks (Dev 3)
import { ClientListPage } from './features/clients/pages/ClientListPage';
import { ClientDetailPage } from './features/clients/pages/ClientDetailPage';
import { ProjectListPage } from './features/projects/pages/ProjectListPage';
import { ProjectDetailPage } from './features/projects/pages/ProjectDetailPage';
import { TasksPage } from './features/tasks/pages/TasksPage';
import { MyTasksPage } from './features/tasks/pages/MyTasksPage';

// Finance & Expenses & Invoices (Dev 3)
import { ExpensesPage } from './features/expenses/pages/ExpensesPage';
import { InvoiceListPage } from './features/invoices/pages/InvoiceListPage';
import { InvoiceDetailPage } from './features/invoices/pages/InvoiceDetailPage';
import { FinanceOverviewPage } from './features/finance/pages/FinanceOverviewPage';

// CRM Module (Dev B)
import { CrmPipelinePage } from './features/crm/pages/CrmPipelinePage';

// Root Redirect Helper
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading, getRedirectPath } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getRedirectPath(user)} replace />;
};

import ErrorBoundary from './shared/components/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Mandatory Password Change Route */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Main Protected Application Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Dashboards */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute targetDashboard="/admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute targetDashboard="/manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me"
          element={
            <ProtectedRoute requireEmployee targetDashboard="/me">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Employees Module */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute permission="employees.view">
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute permission="employees.create">
              <EmployeeCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute permission="employees.edit">
              <EmployeeEditPage />
            </ProtectedRoute>
          }
        />

        {/* Departments Module */}
        <Route
          path="/departments"
          element={
            <ProtectedRoute permission="departments.view">
              <DepartmentListPage />
            </ProtectedRoute>
          }
        />

        {/* Designations Module */}
        <Route
          path="/designations"
          element={
            <ProtectedRoute permission="designations.view">
              <DesignationListPage />
            </ProtectedRoute>
          }
        />

        {/* Roles & RBAC Module */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute permission="roles.view">
              <RoleListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles/:id/permissions"
          element={
            <ProtectedRoute permission="roles.edit">
              <RolePermissionsPage />
            </ProtectedRoute>
          }
        />


        {/* Attendance & Holidays (Dev 2) */}
        <Route
          path="/attendance/my"
          element={
            <ProtectedRoute requireEmployee>
              <MyAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/holidays"
          element={
            <ProtectedRoute permission="holidays.view">
              <HolidaysPage />
            </ProtectedRoute>
          }
        />

        {/* Leaves Module (Dev 2) */}
        <Route
          path="/leaves/my"
          element={
            <ProtectedRoute requireEmployee>
              <MyLeavesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves/approvals"
          element={
            <ProtectedRoute>
              <LeaveApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/leaves" element={<Navigate to="/leaves/my" replace />} />
        <Route path="/leave" element={<Navigate to="/leaves/my" replace />} />

        {/* Payroll Module (Dev 2) */}
        <Route
          path="/payroll/runs"
          element={
            <ProtectedRoute permission="payroll.view">
              <PayrollRunPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/payslips"
          element={
            <ProtectedRoute requireEmployee permission="payroll.view_own">
              <MyPayslipsPage />
            </ProtectedRoute>
          }
        />

        {/* Timesheets Module (Dev 2) */}
        <Route
          path="/timesheets/my"
          element={
            <ProtectedRoute requireEmployee permission="timesheets.view_own">
              <MyTimesheetsPage />
            </ProtectedRoute>
          }
        />

        {/* Clients Module (Dev 3) */}
        <Route
          path="/clients"
          element={
            <ProtectedRoute permission="clients.view">
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute permission="clients.view">
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Projects Module (Dev 3) */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Tasks Module (Dev 3) */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/my"
          element={
            <ProtectedRoute requireEmployee>
              <MyTasksPage />
            </ProtectedRoute>
          }
        />

        {/* Expenses Module (Dev 3) */}
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        {/* Invoices Module (Dev 3) */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Finance Overview Module (Dev 3) */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute permission="projects.view_financials">
              <FinanceOverviewPage />
            </ProtectedRoute>
          }
        />

        {/* CRM Pipeline Module (Dev B) */}
        <Route
          path="/crm"
          element={
            <ProtectedRoute permission="crm.view,crm.view_own">
              <CrmPipelinePage />
            </ProtectedRoute>
          }
        />

        {/* Fallback & Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
};

export default App;
