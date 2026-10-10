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
import { AuditLogListPage } from './features/audit-logs/pages/AuditLogListPage';

// Time & Attendance (Dev 2)
import { HolidaysPage } from './features/holidays/pages/HolidaysPage';
import { MyAttendancePage } from './features/attendance/pages/MyAttendancePage';
import { AttendanceSheetPage } from './features/attendance/pages/AttendanceSheetPage';

// Root Redirect Helper
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading, getRedirectPath } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getRedirectPath(user)} replace />;
};

export const App: React.FC = () => {
  return (
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route
          path="/me"
          element={
            <ProtectedRoute requireEmployee>
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

        {/* Audit Logs Module */}
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute permission="audit_logs.view">
              <AuditLogListPage />
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

        {/* Fallback & Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Route>
    </Routes>
  );
};

export default App;
