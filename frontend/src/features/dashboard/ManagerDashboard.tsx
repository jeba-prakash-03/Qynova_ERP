import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../shared/api/axiosClient';
import { Button } from '../../shared/components/Button';
import {
  Users,
  BarChart3,
  CheckCircle,
  FolderKanban,
  AlertTriangle,
} from 'lucide-react';
import { WidgetRenderer } from './widgets/WidgetRenderer';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: overdueTasks } = useQuery({
    queryKey: ['dashboard', 'widget', 'overdue_tasks'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets/overdue_tasks');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  const { data: activeProjects } = useQuery({
    queryKey: ['dashboard', 'widget', 'active_projects'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets/active_projects');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner - Dark Navy (#0F172A) */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Manager Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.employee ? `${user.employee.first_name}` : user?.email.split('@')[0]}
          </h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Supervise direct reports, monitor daily team attendance, review timesheets, and clear project bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/reports">
            <Button variant="secondary" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Team Reports
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="primary" leftIcon={<FolderKanban className="w-4 h-4" />}>
              Projects Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Manager HR Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetRenderer
          widgetKey="manager_team_attendance_today"
          title="Team Attendance Today"
        />

        <WidgetRenderer
          widgetKey="manager_pending_approvals"
          title="Pending Approvals"
        />
      </div>

      {/* 14-day Leave Calendar */}
      <div>
        <WidgetRenderer
          widgetKey="manager_team_leave_calendar_14d"
          title="Upcoming Team Leaves (14 Days)"
        />
      </div>

      {/* SECTION: Projects & Tasks Deliverables (Dev B) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks List for Manager */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Overdue Tasks Requiring Action</h2>
              <p className="text-xs text-slate-400">Team tasks overdue past scheduled deadline</p>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline">
              All Tasks →
            </Link>
          </div>

          {overdueTasks?.items?.length > 0 ? (
            <div className="space-y-3">
              {overdueTasks.items.map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{t.task_code}</span>
                      <span className="font-semibold text-slate-900 truncate">{t.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t.project_name} • Assignee: {t.assignee_name || 'Unassigned'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-rose-600">
                    {t.due_date}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle className="mx-auto h-7 w-7 text-emerald-500 mb-1" />
              All team tasks are currently on track!
            </div>
          )}
        </div>

        {/* Active Projects List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Active Engineering Projects</h2>
              <p className="text-xs text-slate-400">Currently ongoing deliverables</p>
            </div>
            <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:underline">
              Projects View →
            </Link>
          </div>

          {activeProjects?.items?.length > 0 ? (
            <div className="space-y-3">
              {activeProjects.items.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{p.project_code}</span>
                      <span className="font-semibold text-slate-900">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Status: {p.status} • Priority: {p.priority}
                    </span>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No active projects found.
            </div>
          )}
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Team Directory</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">View your direct reports and contact information.</p>
          <Link to="/employees" className="text-xs font-bold text-[#4F46E5] hover:underline">
            Browse Directory →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-4">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Projects Board</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">Track sprint milestones and task assignees.</p>
          <Link to="/projects" className="text-xs font-bold text-[#4F46E5] hover:underline">
            Manage Projects →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Task Management</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">Monitor task deadlines and progress updates.</p>
          <Link to="/tasks" className="text-xs font-bold text-[#4F46E5] hover:underline">
            View All Tasks →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
