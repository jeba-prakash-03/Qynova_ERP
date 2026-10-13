# Qynova ERP - Complete Permission Matrix

This document defines the permission enforcement and role access across all system modules, API routes, and user interfaces.

---

## 1. System Roles Overview

| Role | Role Name | Purpose | Default Redirect |
|---|---|---|---|
| **Admin** | `Admin` | Unrestricted superuser with company configuration and system control | `/admin` |
| **HR** | `HR` | People ops, recruitment, onboarding, leave/attendance admin, payroll runs | `/admin` |
| **Manager** | `Manager` | Team supervisor, direct report approvals, project & timesheet approvals | `/manager` |
| **Employee** | `Employee` | Core personnel, self-service leaves, attendance punch, timesheets, profile | `/me` |
| **Intern** | `Intern` | Student/trainee personnel, self-service timesheets, punch, leave applications | `/me` |

---

## 2. API Routes Permission Matrix

### Module: Authentication & System
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/auth/refresh-token` | Public (Requires valid refresh token) | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/auth/logout` | Authenticated | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/auth/me` | Authenticated | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/auth/change-password` | Authenticated | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/auth/forgot-password` | Public | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/auth/reset-password` | Public | Yes | Yes | Yes | Yes | Yes |

### Module: Company Settings & Branding
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/settings/public` | Public | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/settings/branding` | Public | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/settings` | `settings.view` | Yes | Yes | No | No | No |
| PUT | `/api/v1/settings/company` | `settings.company.edit` | Yes | No | No | No | No |
| POST | `/api/v1/settings/company/logo` | `settings.company.edit` | Yes | No | No | No | No |
| POST | `/api/v1/settings/company/favicon`| `settings.company.edit` | Yes | No | No | No | No |
| PUT | `/api/v1/settings/work-settings` | `settings.edit` | Yes | No | No | No | No |
| PUT | `/api/v1/settings/leave-policy` | `settings.edit` | Yes | No | No | No | No |
| PUT | `/api/v1/settings/payroll-config` | `settings.edit` | Yes | No | No | No | No |

### Module: Organization (Departments & Designations)
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/departments` | `departments.view` | Yes | Yes | Yes | No | No |
| POST | `/api/v1/departments` | `departments.create` | Yes | Yes | No | No | No |
| PUT | `/api/v1/departments/:id` | `departments.edit` | Yes | Yes | No | No | No |
| DELETE | `/api/v1/departments/:id` | `departments.delete` | Yes | No | No | No | No |
| GET | `/api/v1/designations` | `designations.view` | Yes | Yes | Yes | No | No |
| POST | `/api/v1/designations` | `designations.create` | Yes | Yes | No | No | No |
| PUT | `/api/v1/designations/:id` | `designations.edit` | Yes | Yes | No | No | No |
| DELETE | `/api/v1/designations/:id` | `designations.delete` | Yes | No | No | No | No |

### Module: Roles & RBAC
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/roles` | `roles.view` | Yes | No | No | No | No |
| GET | `/api/v1/roles/:id` | `roles.view` | Yes | No | No | No | No |
| POST | `/api/v1/roles` | `roles.create` | Yes | No | No | No | No |
| PUT | `/api/v1/roles/:id` | `roles.edit` | Yes | No | No | No | No |
| PUT | `/api/v1/roles/:id/permissions` | `roles.edit` | Yes | No | No | No | No |
| DELETE | `/api/v1/roles/:id` | `roles.delete` | Yes | No | No | No | No |
| GET | `/api/v1/permissions` | `roles.view` | Yes | No | No | No | No |

### Module: Employees & Lifecycle
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/employees/me` | Authenticated | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/employees/stats/summary`| `employees.view` | Yes | Yes | No | No | No |
| GET | `/api/v1/employees` | `employees.view` | Yes | Yes | No | No | No |
| GET | `/api/v1/employees/:id` | Admin/HR: Full; Manager: Team; Emp: Self | Yes | Yes | Team only | Self only | Self only |
| POST | `/api/v1/employees` | `employees.create` | Yes | Yes | No | No | No |
| PUT | `/api/v1/employees/:id` | `employees.edit` | Yes | Yes | No | No | No |
| PATCH | `/api/v1/employees/:id/lifecycle`| `employees.edit` | Yes | Yes | No | No | No |
| GET | `/api/v1/employees/:id/lifecycle-history` | Admin/HR: Full; Manager: Team; Emp: Self | Yes | Yes | Team only | Self only | Self only |
| DELETE | `/api/v1/employees/:id` | `employees.delete` | Yes | Yes | No | No | No |

### Module: Documents & Vault
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/employees/:id/documents` | Admin, HR, or Owner (`documents.create`) | Yes | Yes | Self only | Self only | Self only |
| GET | `/api/v1/employees/:id/documents` | Admin, HR, Owner, Manager (Team only) | Yes | Yes | Team only | Self only | Self only |
| GET | `/api/v1/documents/:id/download` | Admin, HR, Owner (Sensitive restricted) | Yes | Yes | No (sens.) | Self | Self |
| DELETE | `/api/v1/documents/:id` | Admin, HR, or Owner (`documents.delete`) | Yes | Yes | Self only | Self only | Self only |

### Module: Offer Letters
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/offer-letters/templates` | `offer_letter_templates.manage` or `settings.view` | Yes | Yes | No | No | No |
| POST | `/api/v1/offer-letters/templates` | `offer_letter_templates.manage` | Yes | Yes | No | No | No |
| PUT | `/api/v1/offer-letters/templates/:id` | `offer_letter_templates.manage` | Yes | Yes | No | No | No |
| DELETE | `/api/v1/offer-letters/templates/:id` | `offer_letter_templates.manage` | Yes | No | No | No | No |
| GET | `/api/v1/offer-letters/my` | `offer_letters.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/offer-letters` | `offer_letters.view` | Yes | Yes | No | No | No |
| GET | `/api/v1/offer-letters/employee/:id` | Admin/HR: All; Employee: Self | Yes | Yes | No | Self only | Self only |
| POST | `/api/v1/offer-letters/generate` | `offer_letters.create` | Yes | Yes | No | No | No |
| POST | `/api/v1/offer-letters/:id/send` | `offer_letters.send` | Yes | Yes | No | No | No |
| POST | `/api/v1/offer-letters/:id/accept` | `offer_letters.edit` | Yes | Yes | No | No | No |
| POST | `/api/v1/offer-letters/:id/decline`| `offer_letters.edit` | Yes | Yes | No | No | No |
| GET | `/api/v1/offer-letters/:id/download` | Admin, HR, or Candidate Owner | Yes | Yes | No | Self only | Self only |

### Module: Time & Attendance
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/attendance/check-in` | `requireEmployee`, `attendance.create` | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/attendance/check-out` | `requireEmployee`, `attendance.create` | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/attendance/break/start` | `requireEmployee`, `attendance.create` | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/attendance/break/end` | `requireEmployee`, `attendance.create` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/attendance/today` | `requireEmployee`, `attendance.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/attendance/me` | `requireEmployee`, `attendance.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/attendance/sheet` | `attendance.view` (All) or `attendance.view_team` (Team) | Yes | Yes | Team only | No | No |
| GET | `/api/v1/attendance/monthly-sheet` | `attendance.view` (All) or `attendance.view_team` (Team) | Yes | Yes | Team only | No | No |
| POST | `/api/v1/attendance` | `attendance.edit` | Yes | Yes | No | No | No |
| PUT | `/api/v1/attendance/:id` | `attendance.edit` | Yes | Yes | No | No | No |

### Module: Leave Management
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/leave-requests` | `requireEmployee`, `leave.create` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/leave-requests/me` | `requireEmployee`, `leave.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/leave-requests/pending` | Admin/HR: Company; Manager: Direct Team | Yes | Yes | Team only | No | No |
| GET | `/api/v1/leave-requests/calendar` | Admin/HR: Company; Manager: Team; Emp: Self | Yes | Yes | Team only | Self only | Self only |
| PATCH | `/api/v1/leave-requests/:id/approve` | Reporting Manager or Admin/HR | Yes | Yes | Team only | No | No |
| PATCH | `/api/v1/leave-requests/:id/reject` | Reporting Manager or Admin/HR | Yes | Yes | Team only | No | No |
| PATCH | `/api/v1/leave-requests/:id/cancel` | `requireEmployee`, Owner only | Yes | Yes | Self only | Self only | Self only |
| GET | `/api/v1/leave-balances/me` | `requireEmployee`, `leave.view_own` | Yes | Yes | Yes | Yes | Yes |
| POST | `/api/v1/leave-balances/allocate` | `leave.approve` (Admin / HR) | Yes | Yes | No | No | No |

### Module: Timesheets
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/timesheets` | `requireEmployee`, `timesheets.create` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/timesheets/me` | `requireEmployee`, `timesheets.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/timesheets/pending` | Admin/HR: Company; Manager: Direct Team | Yes | Yes | Team only | No | No |
| PATCH | `/api/v1/timesheets/:id/approve`| Reporting Manager or Admin/HR | Yes | Yes | Team only | No | No |
| PATCH | `/api/v1/timesheets/:id/reject` | Reporting Manager or Admin/HR | Yes | Yes | Team only | No | No |

### Module: Payroll & Payslips
| HTTP Method | Route | Enforced Middleware / Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/payroll/runs` | `payroll.view` | Yes | Yes | No | No | No |
| GET | `/api/v1/payroll/runs/:month` | `payroll.view` | Yes | Yes | No | No | No |
| POST | `/api/v1/payroll/generate` | `payroll.run` | Yes | Yes | No | No | No |
| POST | `/api/v1/payroll/runs/:month/status`| `payroll.approve` | Yes | Yes | No | No | No |
| POST | `/api/v1/payroll/adjustments` | `payroll.edit` | Yes | Yes | No | No | No |
| GET | `/api/v1/payroll/payslips/my` | `requireEmployee`, `payslips.view_own` | Yes | Yes | Yes | Yes | Yes |
| GET | `/api/v1/payroll/payslips/:id/pdf` | Admin/HR: All; Employee: Self | Yes | Yes | Self only | Self only | Self only |

---

## 3. Frontend Navigation & Screen Access Matrix

| UI Route | Screen Name | Guard Permissions | Admin | HR | Manager | Employee | Intern |
|---|---|---|---|---|---|---|---|
| `/admin` | Admin Dashboard | Admin or HR | Yes | Yes | No | No | No |
| `/manager` | Manager Dashboard | Admin, HR, Manager | Yes | Yes | Yes | No | No |
| `/me` | Employee Dashboard | Has Employee Profile | Yes | Yes | Yes | Yes | Yes |
| `/employees` | Employee Directory | `employees.view` | Yes | Yes | No | No | No |
| `/employees/new` | Onboard Employee | `employees.create` | Yes | Yes | No | No | No |
| `/employees/:id` | Employee Profile | Scoped (Full vs. Self vs. Team) | Yes | Yes | Team / Self | Self | Self |
| `/employees/:id/edit` | Edit Employee Profile | `employees.edit` | Yes | Yes | No | No | No |
| `/departments` | Department Hierarchy | `departments.view` | Yes | Yes | Yes | No | No |
| `/designations` | Designation List | `designations.view` | Yes | Yes | Yes | No | No |
| `/roles` | Roles & RBAC | `roles.view` | Yes | No | No | No | No |
| `/roles/:id/permissions`| Role Permissions Matrix | `roles.edit` | Yes | No | No | No | No |
| `/attendance/my` | My Attendance & Punch | `requireEmployee` | Yes | Yes | Yes | Yes | Yes |
| `/attendance` | Attendance Sheet Matrix | `attendance.view` | Yes | Yes | Team only | No | No |
| `/holidays` | Holiday Calendar | `holidays.view` | Yes | Yes | Yes | Yes | Yes |
| `/leaves/my` | My Leaves & Apply | `requireEmployee` | Yes | Yes | Yes | Yes | Yes |
| `/leaves/approvals` | Leave Approvals | `leave.approve` | Yes | Yes | Team only | No | No |
| `/payroll/runs` | Payroll Calculation Run | `payroll.view` | Yes | Yes | No | No | No |
| `/payroll/payslips` | My Payslips | `payroll.view_own` | Yes | Yes | Yes | Yes | Yes |
| `/timesheets/my` | My Timesheets | `timesheets.view_own` | Yes | Yes | Yes | Yes | Yes |
| `/projects` | Projects | `projects.view`, `view_team`, `view_own` | Yes | Yes | Team only | Assigned | Assigned |
| `/tasks` | All Tasks | `tasks.view`, `projects.view` | Yes | Yes | Team only | Assigned | Assigned |
| `/tasks/my` | My Tasks | `requireEmployee` | Yes | Yes | Yes | Yes | Yes |
| `/invoices` | Invoices | `invoices.view` | Yes | No | No | No | No |
| `/expenses` | Expense Claims | `expenses.view`, `expenses.view_team` | Yes | No | Team only | Self only | No |
| `/finance` | Financial Overview | `projects.view_financials` | Yes | No | No | No | No |
| `/crm` | CRM Pipeline | `crm.view`, `crm.view_own` | Yes | No | Team / Own | Own | No |
| `/reports` | Reports & Analytics | `reports.view` | Yes | Yes | Yes | No | No |
| `/assets` | Asset Inventory | `assets.view` | Yes | Yes | No | No | No |
| `/my-assets` | My Assigned Assets | `requireEmployee` | Yes | Yes | Yes | Yes | Yes |
| `/settings` | System & Company Settings | `settings.view` | Yes | Yes | No | No | No |
| `/settings/notifications`| Notification Preferences | Authenticated | Yes | Yes | Yes | Yes | Yes |
