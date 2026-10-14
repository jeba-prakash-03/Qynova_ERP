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
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Team Attendance Today</h3>
          <p className="text-xs text-[#6b7663]">Real-time status of your direct reports</p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#14776b]/15 text-[#14776b] font-display tabular-nums">
          {presentCount} / {teamCount} Present
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#daebd9] p-3 rounded-[18px] text-center border border-[#3f8f4a]/20 shadow-[inset_1px_2px_4px_rgba(63,143,74,0.12)]">
          <div className="text-lg font-bold text-[#1b4e23] font-display tabular-nums">{presentCount}</div>
          <div className="text-[11px] font-semibold text-[#1b4e23]">Present</div>
        </div>
        <div className="bg-[#dbe2d5] p-3 rounded-[18px] text-center border border-[#22304a]/20 shadow-[inset_1px_2px_4px_rgba(34,48,74,0.12)]">
          <div className="text-lg font-bold text-[#22304a] font-display tabular-nums">{onLeaveCount}</div>
          <div className="text-[11px] font-semibold text-[#22304a]">On Leave</div>
        </div>
        <div className="bg-[#f4ded6] p-3 rounded-[18px] text-center border border-[#c4643f]/20 shadow-[inset_1px_2px_4px_rgba(196,100,63,0.12)]">
          <div className="text-lg font-bold text-[#c4643f] font-display tabular-nums">{absentCount}</div>
          <div className="text-[11px] font-semibold text-[#c4643f]">Not Marked</div>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-[#6b7663] text-center py-4">No team members assigned</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {members.map((m: any) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] text-xs"
            >
              <div>
                <span className="font-semibold text-[#26301f]">
                  {m.first_name} {m.last_name}
                </span>
                <span className="text-[11px] text-[#6b7663] ml-2">({m.employee_code})</span>
              </div>
              <div className="flex items-center gap-2">
                {m.check_in && (
                  <span className="text-[10px] text-[#6b7663] tabular-nums font-mono">
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
      <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex items-center justify-center">
        <Loader size="sm" text="Loading pending approvals..." />
      </div>
    );
  }

  const { pendingLeaves = [], pendingTimesheets = [], pendingLeavesCount, pendingTimesheetsCount } = data;

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Pending Approvals</h3>
          <p className="text-xs text-[#6b7663]">Leaves & timesheets requiring your review</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f7eed9] text-[#cf9b34] border border-[#cf9b34]/30 tabular-nums">
            {pendingLeavesCount} Leaves
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#14776b]/15 text-[#14776b] border border-[#14776b]/30 tabular-nums">
            {pendingTimesheetsCount} Timesheets
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold text-[#6b7663] uppercase tracking-wider mb-2 font-display">Leave Requests</div>
          {pendingLeaves.length === 0 ? (
            <p className="text-xs text-[#6b7663] italic">No pending leave requests</p>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.map((lr: any) => (
                <div
                  key={lr.id}
                  className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#26301f]">
                      {lr.first_name} {lr.last_name}
                    </span>
                    <span className="text-[#6b7663] ml-2">
                      {lr.leave_type} ({lr.days}d)
                    </span>
                  </div>
                  <Link
                    to="/leaves"
                    className="text-xs font-bold text-[#14776b] hover:underline font-display"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-[#6b7663] uppercase tracking-wider mb-2 font-display">Timesheets</div>
          {pendingTimesheets.length === 0 ? (
            <p className="text-xs text-[#6b7663] italic">No pending timesheets</p>
          ) : (
            <div className="space-y-2">
              {pendingTimesheets.map((ts: any) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#26301f]">
                      {ts.first_name} {ts.last_name}
                    </span>
                    <span className="text-[#6b7663] ml-2">
                      {ts.hours} hrs ({ts.date ? new Date(ts.date).toISOString().split('T')[0] : ''})
                    </span>
                  </div>
                  <Link
                    to="/timesheets"
                    className="text-xs font-bold text-[#14776b] hover:underline font-display"
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
      <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex items-center justify-center">
        <Loader size="sm" text="Loading team leave calendar..." />
      </div>
    );
  }

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Upcoming Team Leaves (14 Days)</h3>
          <p className="text-xs text-[#6b7663]">Planned absences across your reporting team</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-[#6b7663] text-center py-6">No scheduled leaves in the next 14 days</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {data.map((item: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)] text-xs"
            >
              <div>
                <span className="font-semibold text-[#26301f]">
                  {item.first_name} {item.last_name}
                </span>
                <span className="text-xs text-[#6b7663] ml-2">
                  • {item.leave_type_name} ({item.day_type})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#26301f]">
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
