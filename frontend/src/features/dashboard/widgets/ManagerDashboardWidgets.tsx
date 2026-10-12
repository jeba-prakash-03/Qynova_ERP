import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Users, CalendarCheck, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManagerTeamAttendanceWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'manager_team_attendance_today'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/manager_team_attendance_today');
      return res.data?.data || { teamCount: 0, presentCount: 0, absentCount: 0, onLeaveCount: 0, members: [] };
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading team attendance..." />
      </div>
    );
  }

  const { teamCount, presentCount, onLeaveCount, absentCount, members } = data;

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Team Attendance Today</h3>
          <p className="text-xs text-[#64748B]">Real-time status of your direct reports</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
          {presentCount} / {teamCount} Present
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#DCFCE7] p-3 rounded-2xl text-center">
          <div className="text-lg font-bold text-[#16A34A]">{presentCount}</div>
          <div className="text-[11px] font-semibold text-[#16A34A]">Present</div>
        </div>
        <div className="bg-[#E0F2FE] p-3 rounded-2xl text-center">
          <div className="text-lg font-bold text-[#0284C7]">{onLeaveCount}</div>
          <div className="text-[11px] font-semibold text-[#0284C7]">On Leave</div>
        </div>
        <div className="bg-[#FEE2E2] p-3 rounded-2xl text-center">
          <div className="text-lg font-bold text-[#DC2626]">{absentCount}</div>
          <div className="text-[11px] font-semibold text-[#DC2626]">Not Marked</div>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-[#64748B] text-center py-4">No team members assigned</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {members.map((m: any) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
            >
              <div>
                <span className="font-semibold text-[#0F172A]">
                  {m.first_name} {m.last_name}
                </span>
                <span className="text-[11px] text-[#64748B] ml-2">({m.employee_code})</span>
              </div>
              <div className="flex items-center gap-2">
                {m.check_in && (
                  <span className="text-[10px] text-[#64748B]">
                    In: {m.check_in.slice(11, 16)}
                  </span>
                )}
                <StatusBadge status={m.attendance_status || 'absent'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ManagerPendingApprovalsWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'manager_pending_approvals'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/manager_pending_approvals');
      return res.data?.data || { pendingLeavesCount: 0, pendingTimesheetsCount: 0, pendingLeaves: [], pendingTimesheets: [] };
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading pending approvals..." />
      </div>
    );
  }

  const { pendingLeaves = [], pendingTimesheets = [], pendingLeavesCount, pendingTimesheetsCount } = data;

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Pending Approvals</h3>
          <p className="text-xs text-[#64748B]">Leaves & timesheets requiring your review</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
            {pendingLeavesCount} Leaves
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
            {pendingTimesheetsCount} Timesheets
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Leave Requests</div>
          {pendingLeaves.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No pending leave requests</p>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.map((lr: any) => (
                <div
                  key={lr.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#0F172A]">
                      {lr.first_name} {lr.last_name}
                    </span>
                    <span className="text-[#64748B] ml-2">
                      {lr.leave_type} ({lr.days}d)
                    </span>
                  </div>
                  <Link
                    to="/leaves"
                    className="text-xs font-bold text-[#4F46E5] hover:underline"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Timesheets</div>
          {pendingTimesheets.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No pending timesheets</p>
          ) : (
            <div className="space-y-2">
              {pendingTimesheets.map((ts: any) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#0F172A]">
                      {ts.first_name} {ts.last_name}
                    </span>
                    <span className="text-[#64748B] ml-2">
                      {ts.hours} hrs ({ts.date ? new Date(ts.date).toISOString().split('T')[0] : ''})
                    </span>
                  </div>
                  <Link
                    to="/timesheets"
                    className="text-xs font-bold text-[#4F46E5] hover:underline"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ManagerLeaveCalendarWidget: React.FC = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'manager_team_leave_calendar_14d'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/manager_team_leave_calendar_14d');
      return res.data?.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading team leave calendar..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Upcoming Team Leaves (14 Days)</h3>
          <p className="text-xs text-[#64748B]">Planned absences across your reporting team</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-[#64748B] text-center py-6">No scheduled leaves in the next 14 days</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {data.map((item: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
            >
              <div>
                <span className="font-semibold text-[#0F172A]">
                  {item.first_name} {item.last_name}
                </span>
                <span className="text-xs text-[#64748B] ml-2">
                  • {item.leave_type_name} ({item.day_type})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#475569]">
                  {new Date(item.date).toISOString().split('T')[0]}
                </span>
                <StatusBadge status={item.day_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
