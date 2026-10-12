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
  CreditCard,
  TrendingUp,
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
        title: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupTitle: 'Business',
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
        permission: 'projects.view,projects.view_team,projects.view_own',
      },
      {
        title: 'Tasks',
        path: '/tasks',
        icon: CheckSquare,
        permission: 'tasks.view,projects.view,projects.view_team,projects.view_own',
      },
      {
        title: 'My Tasks',
        path: '/tasks/my',
        icon: CheckSquare,
        requireEmployee: true,
      },
      {
        title: 'Invoices',
        path: '/invoices',
        icon: Receipt,
        permission: 'invoices.view,invoices.view_team,invoices.view_own',
      },
      {
        title: 'Expenses',
        path: '/expenses',
        icon: CreditCard,
        permission: 'expenses.view,expenses.view_team,expenses.view_own',
      },
      {
        title: 'Finance Overview',
        path: '/finance',
        icon: TrendingUp,
        permission: 'projects.view_financials',
      },
    ],
  },
  {
    groupTitle: 'People',
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
    groupTitle: 'Attendance and Leave',
    items: [
      {
        title: 'My Attendance',
        path: '/attendance/my',
        icon: Clock,
        requireEmployee: true,
      },
      {
        title: 'Attendance Sheet',
        path: '/attendance',
        icon: FileText,
        permission: 'attendance.view',
      },
      {
        title: 'Holidays & Calendar',
        path: '/holidays',
        icon: CalendarDays,
        permission: 'holidays.view',
      },
      {
        title: 'Apply / My Leaves',
        path: '/leaves/my',
        icon: CalendarDays,
        requireEmployee: true,
      },
      {
        title: 'Leave Approvals',
        path: '/leaves/approvals',
        icon: CheckSquare,
        permission: 'leave.approve',
      },
      {
        title: 'My Timesheets',
        path: '/timesheets/my',
        icon: Clock,
        requireEmployee: true,
      },
    ],
  },
  {
    groupTitle: 'Payroll',
    items: [
      {
        title: 'Payroll',
        path: '/payroll/runs',
        icon: Banknote,
        permission: 'payroll.view',
      },
      {
        title: 'My Payslips',
        path: '/payroll/payslips',
        icon: Banknote,
        requireEmployee: true,
      },
    ],
  },
  {
    groupTitle: 'Security',
    items: [
      {
        title: 'Roles & RBAC',
        path: '/roles',
        icon: ShieldCheck,
        permission: 'roles.view',
      },
    ],
  },
];
