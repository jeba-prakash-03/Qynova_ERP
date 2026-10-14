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
      {/* Top Banner */}
      <div className="bg-[#202c25] rounded-[26px] p-6 sm:p-8 text-[#e2e8dc] shadow-[8px_10px_24px_rgba(88,104,84,0.30),-6px_-7px_18px_rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#14776b]/30 text-[#e2e8dc] border border-[#14776b]/40 font-display">
            Manager Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display mt-2">
            Welcome, {user?.employee ? `${user.employee.first_name}` : user?.email.split('@')[0]}
          </h1>
          <p className="text-[#c5d0be] text-sm mt-1 max-w-xl">
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

      {/* SECTION: Projects & Tasks Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks List for Manager */}
        <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#26301f] font-display">Overdue Tasks Requiring Action</h2>
                <p className="text-xs text-[#6b7663]">Team tasks overdue past scheduled deadline</p>
              </div>
              <Link to="/tasks" className="text-xs font-bold text-[#14776b] hover:underline font-display">
                All Tasks →
              </Link>
            </div>

            {overdueTasks?.items?.length > 0 ? (
              <div className="space-y-3">
                {overdueTasks.items.map((t: any) => (
                  <div
                    key={t.id}
                    className="rounded-[16px] border border-[#c4643f]/25 bg-[#f4ded6]/60 p-3 text-xs flex items-center justify-between gap-3 shadow-[inset_1px_1px_3px_rgba(196,100,63,0.1)]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#632a17]">{t.task_code}</span>
                        <span className="font-semibold text-[#26301f] truncate">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-[#6b7663] mt-0.5">
                        {t.project_name} • Assignee: {t.assignee_name || 'Unassigned'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#c4643f] tabular-nums">
                      {t.due_date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[#6b7663] text-xs">
                <CheckCircle className="mx-auto h-7 w-7 text-[#3f8f4a] mb-1" />
                All team tasks are currently on track!
              </div>
            )}
          </div>
        </div>

        {/* Active Projects List */}
        <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#26301f] font-display">Active Engineering Projects</h2>
                <p className="text-xs text-[#6b7663]">Currently ongoing deliverables</p>
              </div>
              <Link to="/projects" className="text-xs font-bold text-[#14776b] hover:underline font-display">
                Projects View →
              </Link>
            </div>

            {activeProjects?.items?.length > 0 ? (
              <div className="space-y-3">
                {activeProjects.items.map((p: any) => (
                  <div
                    key={p.id}
                    className="rounded-[16px] border border-[rgba(76,91,70,0.14)] bg-[#dbe2d5] p-3 text-xs flex items-center justify-between gap-3 shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] hover:bg-[#d5dccf] transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#26301f]">{p.project_code}</span>
                        <span className="font-semibold text-[#26301f]">{p.name}</span>
                      </div>
                      <span className="text-[10px] text-[#6b7663] capitalize">
                        Status: {p.status} • Priority: {p.priority}
                      </span>
                    </div>
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-xs font-bold text-[#14776b] hover:underline shrink-0 font-display"
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[#6b7663] text-xs">
                No active projects found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#e2e8dc] rounded-[22px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[14px] bg-[#f7eed9] text-[#cf9b34] shadow-[inset_1px_2px_4px_rgba(207,155,52,0.15)] flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#26301f] font-display">Team Directory</h3>
            <p className="text-xs text-[#6b7663] mt-1 mb-4">View your direct reports and contact information.</p>
          </div>
          <Link to="/employees" className="text-xs font-bold text-[#14776b] hover:underline font-display">
            Browse Directory →
          </Link>
        </div>

        <div className="bg-[#e2e8dc] rounded-[22px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[14px] bg-[#daebd9] text-[#1b4e23] shadow-[inset_1px_2px_4px_rgba(63,143,74,0.15)] flex items-center justify-center mb-4">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#26301f] font-display">Projects Board</h3>
            <p className="text-xs text-[#6b7663] mt-1 mb-4">Track sprint milestones and task assignees.</p>
          </div>
          <Link to="/projects" className="text-xs font-bold text-[#14776b] hover:underline font-display">
            Manage Projects →
          </Link>
        </div>

        <div className="bg-[#e2e8dc] rounded-[22px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[14px] bg-[#f4ded6] text-[#c4643f] shadow-[inset_1px_2px_4px_rgba(196,100,63,0.15)] flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#26301f] font-display">Task Management</h3>
            <p className="text-xs text-[#6b7663] mt-1 mb-4">Monitor task deadlines and progress updates.</p>
          </div>
          <Link to="/tasks" className="text-xs font-bold text-[#14776b] hover:underline font-display">
            View All Tasks →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
