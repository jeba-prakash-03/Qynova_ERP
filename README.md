# Qynova ERP - Enterprise Resource Planning

Enterprise Resource Planning system for an IT services company built with a full-stack TypeScript monorepo architecture.

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Zod validation, JWT (access + rotating refresh tokens), bcrypt.
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
│   │   │   ├── auth/            # Login, Refresh, Logout, Change/Forgot Password, Me
│   │   │   ├── roles/           # Roles CRUD, RBAC matrix assignment
│   │   │   ├── permissions/     # Full project system permissions list
│   │   │   ├── employees/       # Employee CRUD, Onboarding transaction, Profile
│   │   │   ├── departments/     # Tree hierarchy departments CRUD
│   │   │   ├── designations/    # Titles and designations CRUD
│   │   │   ├── audit-logs/      # Immutable audit trail queries and diffs
│   │   │   └── notifications/   # In-app notifications with deduplication
│   │   ├── shared/
│   │   │   ├── middleware/      # authenticate, requirePermission, validate, rateLimit, errorHandler
│   │   │   ├── services/        # auditService, notificationService (used by teammates)
│   │   │   ├── constants/       # SYSTEM_ROLES, ALL_SYSTEM_PERMISSIONS (all 134 permissions)
│   │   │   ├── utils/           # response helpers, asyncHandler, jwt, password hashing
│   │   │   └── errors/          # AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError
│   │   └── db/
│   │       ├── knexfile.ts      # Knex configuration
│   │       ├── migrations/      # YYYYMMDDHHmm_<module>_<description>.ts
│   │       └── seeds/           # 01_initial_seed.ts (roles, permissions, test users, depts, employees)
│   └── tests/                   # Jest integration and unit test suites
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/            # Login, Change Password, Forgot Password
│   │   │   ├── dashboard/       # Admin Dashboard, Manager Dashboard, Employee Self-Service
│   │   │   ├── employees/       # Directory list, Create with Dev 2 salary placeholder, Detail tabs, Edit
│   │   │   ├── departments/     # Tree and Table view hierarchy manager
│   │   │   ├── designations/    # Title directory and employee counts
│   │   │   ├── roles/           # Role list, Module × Action permissions grid
│   │   │   ├── audit-logs/      # Audit log viewer and JSON diff inspection modal
│   │   │   └── notifications/   # Bell icon, unread counter badge, 30s polling dropdown
│   │   └── shared/
│   │       ├── components/      # DataTable, Modal, ConfirmDialog, FormField, Can, ProtectedRoute, EmptyState, Loader, ErrorState
│   │       ├── context/         # AuthContext, ToastContext
│   │       ├── hooks/           # useAuth, usePermission
│   │       ├── navigation/      # menuConfig.ts (Single file for teammates to add menu entries)
│   │       └── api/             # Axios client with transparent 401 refresh interceptor
│   └── index.html
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

Run automated tests (Auth, Rate Limiting, RBAC enforcement, Atomic Employee creation transaction):
```bash
npm run test:backend
```

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
