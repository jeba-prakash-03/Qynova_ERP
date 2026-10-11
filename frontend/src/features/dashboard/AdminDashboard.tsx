import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import {
  Users,
  Building2,
  UserPlus,
  ArrowUpRight,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Loader } from '../../shared/components/Loader';
import WidgetErrorBoundary from '../../shared/components/WidgetErrorBoundary';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { Button } from '../../shared/components/Button';

export const AdminDashboard: React.FC = () => {
  // Fetch overview stats
  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', 'summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/employees?limit=5');
        return res.data;
      } catch {
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/departments');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/roles');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: pendingLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'pending-approvals-summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/leaves/pending');
        return Array.isArray(res.data?.data) ? res.data.data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: todayAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', 'today-summary'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await axiosClient.get(`/attendance/sheet?date=${today}`);
        return Array.isArray(res.data?.data) ? res.data.data : [];
      } catch {
        return [];
      }
    },
  });

  const { data: statsSummary } = useQuery({
    queryKey: ['employees', 'stats-summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/employees/stats/summary');
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
  });

  const totalEmployees = employeesData?.meta?.total || 0;
  const activeTotalCount = statsSummary?.activeTotal ?? totalEmployees;
  const onboardingCount = statsSummary?.onboardingCount ?? 0;
  const relievedCount = statsSummary?.relievedCount ?? 0;
  const recentEmployeesList = Array.isArray(employeesData?.data) ? employeesData.data : [];
  const todayAttendanceList = Array.isArray(todayAttendance) ? todayAttendance : [];
  const pendingLeavesList = Array.isArray(pendingLeaves) ? pendingLeaves : [];
  const departmentsList = Array.isArray(departments) ? departments : [];

  const presentTodayCount = todayAttendanceList.filter(
    (a: any) => a?.status === 'present' || a?.status === 'half_day' || a?.status === 'wfh'
  ).length;

  const isLoading = loadingEmployees || loadingDepts || loadingRoles || loadingLeaves || loadingAttendance;

  return (
    <div className="space-y-6">
      {/* Top Banner - Preserving Navy Dark (#0F172A) */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Admin & HR Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Overview</h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Manage employees, departments and role access policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/employees/new">
            <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />}>
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <WidgetErrorBoundary widgetName="Metrics Cards">
        {isLoading ? (
          <Loader text="Loading dashboard metrics..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Employees</span>
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{activeTotalCount}</div>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
                {onboardingCount} onboarding, {relievedCount} relieved
              </p>
              <Link
                to="/employees"
                className="text-xs text-[#4F46E5] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
              >
                Manage Directory <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Present Today</span>
                <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{presentTodayCount}</div>
              <Link
                to="/attendance/sheet"
                className="text-xs text-[#15803D] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
              >
                Daily Sheet <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Pending Approvals</span>
                <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{pendingLeavesList.length}</div>
              <Link
                to="/leaves/approvals"
                className="text-xs text-[#B45309] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
              >
                Review Requests <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Departments</span>
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{departmentsList.length}</div>
              <Link
                to="/departments"
                className="text-xs text-[#4F46E5] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
              >
                View Hierarchy <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </WidgetErrorBoundary>

      {/* Grid: Recent Employees & Pending Approvals List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees Widget */}
        <WidgetErrorBoundary widgetName="Recent Employees">
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0F172A]">Recent Employees</h2>
              <Link to="/employees" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                View all
              </Link>
            </div>

            {recentEmployeesList.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">No employee records yet</p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] flex-1">
                {recentEmployeesList.map((emp: any) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] text-[#475569] flex items-center justify-center text-xs font-bold">
                        {emp.first_name?.[0] || 'E'}
                        {emp.last_name?.[0] || ''}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">
                          {emp.first_name || ''} {emp.last_name || ''}
                        </h4>
                        <p className="text-[11px] text-[#64748B]">{emp.email || ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-bold">
                        {emp.employee_code || ''}
                      </span>
                      <StatusBadge status={emp.lifecycle_stage} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WidgetErrorBoundary>

        {/* Pending Approvals Widget */}
        <WidgetErrorBoundary widgetName="Pending Leave Approvals">
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0F172A]">Pending Leave Approvals</h2>
              <Link to="/leaves/approvals" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                View all
              </Link>
            </div>

            {pendingLeavesList.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">No pending leave requests</p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] flex-1">
                {pendingLeavesList.slice(0, 5).map((req: any) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#0F172A]">
                        {req.employee_name || `Employee #${req.employee_id}`}
                      </h4>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        {req.leave_type_name || 'Leave'}: {req.from_date} to {req.to_date} ({req.days} day
                        {req.days > 1 ? 's' : ''})
                      </p>
                    </div>
                    <StatusBadge status="pending" size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </WidgetErrorBoundary>
      </div>
    </div>
  );
};

export default AdminDashboard;
