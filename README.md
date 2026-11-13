# Qynova ERP - Enterprise Resource Planning

Enterprise Resource Planning system for an IT services company built with a full-stack TypeScript monorepo architecture.

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Zod validation, JWT (access + SHA-256 rotating refresh tokens with reuse detection), token versioning, Helmet, rate limiting, bcryptjs.
- **Database**: MySQL 8.0, Knex.js migrations and seeds.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query v5, React Router v6, React Hook Form + Zod, Lucide Icons.
- **Testing**: Jest, Supertest, ts-jest.

---

## 📁 Repository Structure

```
qynova_ERP/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Login, Refresh, Logout, Change/Reset/Forgot Password, Me
│   │   │   ├── roles/           # Roles CRUD, RBAC matrix assignment
│   │   │   ├── permissions/     # System permissions list & authorization
│   │   │   ├── employees/       # Employee CRUD, Onboarding transaction, Lifecycle stages
│   │   │   ├── departments/     # Tree hierarchy departments CRUD
│   │   │   ├── designations/    # Titles and designations CRUD
│   │   │   ├── attendance/      # Check-in/out, Breaks, Geofencing, Export
│   │   │   ├── leaves/          # Leave requests, Balances, Types, Approvals, Concurrency locking
│   │   │   ├── payroll/         # Salary structures, Payroll runs, Payslip PDF, PF deduction
│   │   │   ├── timesheets/      # Timesheet logging & approval
│   │   │   ├── clients/         # Client accounts CRUD
│   │   │   ├── projects/        # Projects lifecycle, members, budgets
│   │   │   ├── tasks/           # Tasks workflow (backlog to completed), subtasks
│   │   │   ├── expenses/        # Project & company expenses
│   │   │   ├── invoices/        # Milestone-based invoicing & payments
│   │   │   ├── profitability/   # Revenue, labor costs, and net margins
│   │   │   ├── crm/             # Leads pipeline and client/project conversion
│   │   │   ├── assets/          # Hardware/software asset assignment and maintenance
│   │   │   ├── settings/        # Company settings and branding configuration
│   │   │   ├── audit-logs/      # Immutable audit trail queries and diffs
│   │   │   ├── documents/       # File upload with magic bytes validation and secure downloads
│   │   │   ├── notifications/   # In-app notifications with deduplication
│   │   │   └── push/            # Web push notification device tokens
│   │   ├── shared/
│   │   │   ├── registry/        # Centralized dashboard widgets and reports registry & exporters
│   │   │   ├── middleware/      # authenticate, requirePermission, rateLimit, helmet, errorHandler
│   │   │   ├── services/        # auditService, notificationService, emailService
│   │   │   ├── constants/       # SYSTEM_ROLES, ALL_SYSTEM_PERMISSIONS
│   │   │   ├── utils/           # response helpers, asyncHandler, jwt, date, password hashing
│   │   │   └── errors/          # AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError
│   │   └── db/
│   │       ├── knexfile.ts      # Knex configuration
│   │       ├── migrations/      # Strict YYYYMMDDHHMM_<name>.ts schema migrations
│   │       └── seeds/           # Essential and demo seeds
│   └── tests/                   # 27 Jest backend integration and unit test suites
│
├── frontend/
│   ├── src/
│   │   ├── features/            # Auth, Dashboard, Employees, Leaves, Attendance, Payroll, Projects, etc.
│   │   └── shared/              # Reusable UI components, contexts, hooks, navigation, and API client
│   └── index.html
├── scripts/
│   └── backup.sh                # Automated MySQL dump, uploaded files tar.gz archive & retention pruning
└── package.json                 # Monorepo workspaces configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **MySQL**: 8.0+ running locally on port 3306

### 2. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE IF NOT EXISTS qynova_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Configure `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=qynova_erp

JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Install Dependencies, Migrate, and Seed
From the monorepo root:
```bash
npm install

# Run database migrations
npm run migrate:latest --workspace=backend

# Seed foundational roles, permissions, departments, designations, test users
npm run seed:run --workspace=backend
```

### 4. Run Locally
Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run individually:
```bash
# Terminal 1: Backend (http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend (http://localhost:5173)
npm run dev:frontend
```

---

## 🧪 Testing

Run backend automated test suites (27 Jest suites, 281 tests covering Auth, Hardening, Concurrency, Payroll, Leaves, Workflows, Reporting):
```bash
npm run test:backend
```

Run frontend unit and component tests:
```bash
npm run test:frontend
```

---

## ⚖️ Statutory Deductions & Compliance Status

- **Provident Fund (PF)**: Implemented. Calculates 12% on basic salary, capped by default at `15,000 INR` (configurable via `company_settings.pf_wage_cap`).
- **TODO - Employee State Insurance (ESI)**: Planned for future release once medical benefit rules are established.
- **TODO - Professional Tax (PT)**: State-specific slabs planned for future release.
- **TODO - Tax Deducted at Source (TDS)**: Income tax slab calculations planned for future release.

---

### Seeded Test Accounts

| Role | Email | Password | Home Screen |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@qynova.erp` | `Admin@123` | `/admin` |
| **HR** | `hr@qynova.erp` | `Hr@123` | `/admin` |
| **Manager** | `manager@qynova.erp` | `Manager@123` | `/manager` |
| **Employee** | `employee@qynova.erp` | `Employee@123` | `/me` |
| **Intern** | `intern@qynova.erp` | `Intern@123` | `/me` |

*Tip: The web login screen includes 1-click test credential pills.*

---

## 🤝 Guide for Teammates (Dev 2 & Dev 3)

### 1. How Teammates Use Auth & Authorization

#### Backend Contract
Import middlewares from `@/shared/middleware`:
```typescript
import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission, requireEmployee } from '../../shared/middleware/permission.middleware';

const router = Router();
router.use(authenticate);

// 1. Check granular module permission
router.get('/', requirePermission('attendance.view'), controller.getAll);

// 2. Protect employee-only actions (Admin/HR with employeeId = null will receive 403)
router.post('/apply-leave', requirePermission('leave.create'), requireEmployee, controller.applyLeave);
```

**CRITICAL RULE**: `users.id` is login identity. `employees.id` is HR identity.
ALL HR records (attendance, leave, tasks, timesheets, payroll, expenses) **MUST reference `employee_id`, NEVER `user_id`**.
Access `req.user.employeeId` (which is `number` or `null`).

#### Frontend Authorization
Import `usePermission` or `<Can>`:
```tsx
import { Can } from '@/shared/components/Can';
import { usePermission } from '@/shared/hooks/usePermission';

// Hook:
const canApprove = usePermission('leave.approve');

// Component:
<Can permission="payroll.run">
  <button onClick={handleRunPayroll}>Execute Payroll Run</button>
</Can>

// Employee-only component:
<Can requireEmployee>
  <button onClick={openApplyLeaveModal}>Apply For Leave</button>
</Can>
```

---

### 2. How Teammates Use Audit Logs

An immutable record must be written for: salary changes, attendance edits, role/permission changes, payroll runs, invoice changes, and all deletes.

```typescript
import { auditService } from '../../shared/services/audit.service';

await auditService.record({
  userId: req.user.userId,             // Who performed the action
  action: 'payroll.run',               // e.g., 'attendance.edit', 'invoices.delete'
  entity: 'payrolls',                  // Target table / entity
  entityId: payrollBatchId,            // Primary key ID
  oldValue: previousBatchState,        // (Optional) JSON-serializable prior state
  newValue: currentBatchState,         // (Optional) JSON-serializable updated state
  ip: req.ip,                          // (Optional) Client IP
  userAgent: req.headers['user-agent'] // (Optional) User Agent
});
```

---

### 3. How Teammates Use Notifications

Send in-app notifications with deduplication via `eventKey`:
```typescript
import { notificationService } from '../../shared/services/notification.service';

await notificationService.notify({
  eventKey: `leave:${leaveId}:approved`, // Unique per event to prevent duplicates
  userIds: [applicantUserId],            // Single userId or array of userIds
  type: 'success',                       // 'info' | 'warning' | 'success' | 'danger'
  title: 'Leave Request Approved',
  message: 'Your leave application for Oct 12-14 has been approved by your manager.',
  link: '/me'                            // (Optional) Relative URL for direct navigation
});
```

---

### 4. How Teammates Add Sidebar Navigation Links

Edit single file: [`frontend/src/shared/navigation/menuConfig.ts`](file:///home/jeba-prakash/Jeba/qynova_ERP/frontend/src/shared/navigation/menuConfig.ts).

Pre-configured sections exist for **Attendance & Payroll (Dev 2)** and **Projects & Finance (Dev 3)**.
Simply add or adjust items:
```typescript
{
  title: 'Leave Requests',
  path: '/leave',
  icon: CalendarDays,
  permission: 'leave.view',
  requireEmployee: true, // Set true if only employees should see this menu item
}
```
The AppShell dynamically verifies permissions and employee status and renders navigation items automatically.

---

### 5. How Teammates Use Shared UI Components

- **`DataTable`**: Reusable paginated, searchable, sortable table.
- **`Modal`**: Backdrop-blurred accessible dialog.
- **`ConfirmDialog`**: Standardized confirmation prompt for destructive actions.
- **`FormField`**: Label, required indicator, and Zod error message display.
- **`useToast`**: Toast alerts (`success(msg)`, `error(msg)`, `info(msg)`).
- **`Loader` / `EmptyState` / `ErrorState`**: Standardized loading and empty states.

---

### 6. How Teammates Use the `getWorkingDays` Calendar Contract (Dev 2)

Exported service function for Payroll and Leave calculations:

```typescript
import { getWorkingDays } from '@/shared/services/calendar.service';
// or from backend:
import { getWorkingDays } from '../shared/services/calendar.service';

const { workingDates, count } = await getWorkingDays(2026, 10);
// workingDates: ['2026-10-01', '2026-10-05', ...]
// count: 21 (working days in that month)
```

#### Calculation Formula:
$$\text{Working Days} = \text{Calendar Days in Month} - \text{Weekly Off Days (Sat/Sun)} - \text{Public/Company Holidays}$$

- Used directly in payroll to compute daily salary:
  $$\text{Daily Salary} = \frac{\text{Monthly Salary}}{\text{working days of THAT month}}$$
- Never hardcoded to 30 or 365. Accounts for leap years and custom company holidays.

---

### 7. Leave Management & Attendance Synchronization (Dev 2 Stage 2)

#### Leave Endpoints:
- `POST /api/v1/leave-requests`: Employee applies for leave (dates, type, half day option, reason). Automatically counts working days and deducts from `pending` in a DB transaction.
- `GET /api/v1/leave-requests/me`: Employee self-service request history with real-time status and approver notes.
- `PATCH /api/v1/leave-requests/:id/cancel`: Employee cancels pending requests or future approved requests (automatically reverts attendance and restores quota).
- `GET /api/v1/leave-requests/pending`: Manager views direct team's pending leaves; HR/Admin views company-wide.
- `PATCH /api/v1/leave-requests/:id/approve`: Reporting manager or HR/Admin approves leave. Transitions `pending` to `used`, syncs `attendance` rows (`status = leave` or `work_type = wfh`), and notifies employee. Self-approval is blocked.
- `PATCH /api/v1/leave-requests/:id/reject`: Rejection requires mandatory `decision_note`. Reverts `pending` balance.
- `GET /api/v1/leave-balances/me`: Employee gets their yearly quotas, used, pending, and calculated remaining days.
- `POST /api/v1/leave-balances/allocate`: HR/Admin yearly quota allocation (individual or bulk for all active employees).
- `GET /api/v1/leave-requests/calendar?month=YYYY-MM`: Team absence schedule for calendar visualizations.

---

## 📋 API Conventions

- **Base URL**: `/api/v1/<module>`
- **Standard Success Response**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
    "message": "Optional status message"
  }
  ```
- **Standard 400 Validation Error Response**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      { "field": "email", "message": "Please enter a valid email address" }
    ]
  }
  ```
- All list endpoints accept: `page`, `limit`, `search`, `sort`, `order`, plus module-specific filters.
- Money is stored as `DECIMAL(12,2)`. Dates use server Asia/Kolkata calendar dates.
