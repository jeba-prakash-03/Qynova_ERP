import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../shared/api/axiosClient';
import {
  Briefcase,
  Users,
  CalendarCheck,
  Clock,
  CheckCircle,
  FolderKanban,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: widgets } = useQuery({
    queryKey: ['dashboard', 'manager-widgets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
            Manager Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.employee ? `${user.employee.first_name}` : user?.email.split('@')[0]}
          </h1>
          <p className="text-blue-200 text-sm mt-1 max-w-xl">
            Supervise team performance, review project milestones, and clear overdue task bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/40 transition"
          >
            My Projects
          </Link>
          <Link
            to="/me"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
          >
            My Profile
          </Link>
        </div>
      </div>

      {/* Top Manager Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Team Directory</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">View your direct reports and contact details.</p>
          <Link to="/employees" className="text-xs font-bold text-indigo-600 hover:underline">
            Browse Directory →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Active Projects</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {widgets?.active_projects?.count ?? 0} active project(s) assigned to your team.
          </p>
          <Link to="/projects" className="text-xs font-bold text-blue-600 hover:underline">
            Manage Projects →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Overdue Tasks</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {widgets?.overdue_tasks?.count ?? 0} task(s) past completion deadline.
          </p>
          <Link to="/tasks" className="text-xs font-bold text-rose-600 hover:underline">
            Resolve Overdue →
          </Link>
        </div>
      </div>

      {/* Overdue Tasks List for Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {widgets?.overdue_tasks?.items?.length > 0 ? (
            <div className="space-y-3">
              {widgets.overdue_tasks.items.map((t: any) => (
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

          {widgets?.active_projects?.items?.length > 0 ? (
            <div className="space-y-3">
              {widgets.active_projects.items.map((p: any) => (
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
    </div>
  );
};

export default ManagerDashboard;
