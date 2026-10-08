import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  FileText,
  UserCheck,
  CalendarDays,
  Clock,
  Banknote,
  FolderKanban,
  CheckSquare,
  Building,
  Receipt,
  LucideIcon,
  Bell,
} from 'lucide-react';

export interface MenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
  requireEmployee?: boolean;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

export interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

/**
 * MENU CONFIGURATION
 * Teammates (Dev 2 and Dev 3) should add their navigation entries here.
 * Items will automatically be filtered by user permissions and employee status in AppShell.
 */
export const MENU_CONFIG: MenuGroup[] = [
  {
    groupTitle: 'Overview',
    items: [
      {
        title: 'Admin Dashboard',
        path: '/admin',
        icon: LayoutDashboard,
        adminOnly: true,
      },
      {
        title: 'Manager Dashboard',
        path: '/manager',
        icon: LayoutDashboard,
        managerOnly: true,
      },
      {
        title: 'My Profile & Portal',
        path: '/me',
        icon: UserCheck,
        requireEmployee: true,
      },
    ],
  },
  {
    groupTitle: 'People & Organization',
    items: [
      {
        title: 'Employees',
        path: '/employees',
        icon: Users,
        permission: 'employees.view',
      },
      {
        title: 'Departments',
        path: '/departments',
        icon: Building2,
        permission: 'departments.view',
      },
      {
        title: 'Designations',
        path: '/designations',
        icon: Briefcase,
        permission: 'designations.view',
      },
    ],
  },
  {
    groupTitle: 'Security & System',
    items: [
      {
        title: 'Roles & RBAC',
        path: '/roles',
        icon: ShieldCheck,
        permission: 'roles.view',
      },
      {
        title: 'Audit Logs',
        path: '/audit-logs',
        icon: FileText,
        permission: 'audit_logs.view',
      },
    ],
  },
  // --- DEV 2 MODULES (Time, Attendance, Payroll) ---
  {
    groupTitle: 'Attendance & Payroll (Dev 2)',
    items: [
      {
        title: 'Attendance',
        path: '/attendance',
        icon: Clock,
        permission: 'attendance.view',
      },
      {
        title: 'Leave Requests',
        path: '/leave',
        icon: CalendarDays,
        permission: 'leave.view',
      },
      {
        title: 'Timesheets',
        path: '/timesheets',
        icon: Clock,
        permission: 'timesheets.view',
      },
      {
        title: 'Payroll',
        path: '/payroll',
        icon: Banknote,
        permission: 'payroll.view',
      },
    ],
  },
  // --- DEV 3 MODULES (Projects & Billing) ---
  {
    groupTitle: 'Projects & Finance (Dev 3)',
    items: [
      {
        title: 'Clients',
        path: '/clients',
        icon: Building,
        permission: 'clients.view',
      },
      {
        title: 'Projects',
        path: '/projects',
        icon: FolderKanban,
        permission: 'projects.view',
      },
      {
        title: 'Tasks',
        path: '/tasks',
        icon: CheckSquare,
        permission: 'tasks.view',
      },
      {
        title: 'Invoices',
        path: '/invoices',
        icon: Receipt,
        permission: 'invoices.view',
      },
    ],
  },
];
