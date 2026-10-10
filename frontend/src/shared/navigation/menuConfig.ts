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
        title: 'Dashboard',
        path: '/admin',
        icon: LayoutDashboard,
        adminOnly: true,
      },
      {
        title: 'Dashboard',
        path: '/manager',
        icon: LayoutDashboard,
        managerOnly: true,
      },
      {
        title: 'Dashboard',
        path: '/me',
        icon: UserCheck,
        requireEmployee: true,
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
    ],
  },
  {
    groupTitle: 'Payroll',
    items: [
      {
        title: 'Payroll',
        path: '/payroll',
        icon: Banknote,
        permission: 'payroll.view',
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
