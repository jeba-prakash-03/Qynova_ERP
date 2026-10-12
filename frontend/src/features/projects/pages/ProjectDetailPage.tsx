import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  ArrowLeft,
  Building,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Users,
  Flag,
  CheckSquare,
  FileText,
  DollarSign,
  Receipt,
  Tag,
} from 'lucide-react';
import { projectsApi } from '../api';
import {
  ProjectWithDetails,
  ProjectMember,
  ProjectMilestone,
  ProjectStatus,
  ProjectPriority,
  ProjectMemberRole,
} from '../types';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Can } from '../../../shared/components/Can';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useToast } from '../../../shared/context/ToastContext';
import axiosClient from '../../../shared/api/axiosClient';

type TabType =
  | 'overview'
  | 'team'
  | 'milestones'
  | 'tasks'
  | 'timesheets'
  | 'documents'
  | 'expenses'
  | 'invoices';

const ALL_STATUSES: ProjectStatus[] = [
  'lead',
  'proposal',
  'won',
  'contract',
  'planning',
  'development',
  'testing',
  'uat',
  'deployment',
  'maintenance',
  'completed',
  'on_hold',
  'cancelled',
];

const priorityBadges: Record<ProjectPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Modals
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<ProjectMember | null>(null);

  // Add Member Form
  const [memberEmpId, setMemberEmpId] = useState<string>('');
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('developer');
  const [memberAllocation, setMemberAllocation] = useState<number>(100);
  const [memberJoinedAt, setMemberJoinedAt] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Add Milestone Form
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState<number>(0);

  // Project Query
  const {
    data: project,
    isLoading,
    isError,
  } = useQuery<ProjectWithDetails>({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: Boolean(id),
  });

  // Employees Query for Add Member modal
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'for-team-assignment'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=100');
      return res.data.data;
    },
    enabled: isMemberModalOpen,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => projectsApi.updateStatus(id!, newStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success(`Project status transitioned to ${updated.status}`);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Invalid status transition');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.addMember(id!, payload),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success(`Added ${newMember.employee_name || 'member'} to team`);
      setIsMemberModalOpen(false);
      resetMemberForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to add team member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (empId: number) => projectsApi.removeMember(id!, empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success('Team member removed');
      setMemberToDelete(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to remove member');
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.addMilestone(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success('Milestone added successfully');
      setIsMilestoneModalOpen(false);
      resetMilestoneForm();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to add milestone');
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, payload }: { milestoneId: number; payload: any }) =>
      projectsApi.updateMilestone(id!, milestoneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success('Milestone updated');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update milestone');
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => projectsApi.deleteMilestone(id!, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success('Milestone deleted');
    },
  });

  const resetMemberForm = () => {
    setMemberEmpId('');
    setMemberRole('developer');
    setMemberAllocation(100);
    setMemberJoinedAt(new Date().toISOString().split('T')[0]);
  };

  const resetMilestoneForm = () => {
    setMilestoneTitle('');
    setMilestoneDesc('');
    setMilestoneDueDate('');
    setMilestoneAmount(0);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader text="Loading project details..." />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Project Not Accessible"
          message="This project either does not exist or you do not have permission to view its records."
        />
        <div className="text-center">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'team', label: 'Team', count: project.members?.length },
    { key: 'milestones', label: 'Milestones', count: project.milestones?.length },
    { key: 'tasks', label: 'Tasks' },
    { key: 'timesheets', label: 'Timesheets' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'invoices', label: 'Invoices' },
  ];

  const totalMilestonesAmount = project.milestones?.reduce(
    (acc, m) => acc + Number(m.amount || 0),
    0
  );
  const completedMilestones = project.milestones?.filter((m) => m.status === 'completed');
  const progressPercent = project.progress_percent ?? 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects Directory
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mt-1">
              <FolderKanban className="w-8 h-8" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {project.project_code}
                </span>
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                    priorityBadges[project.priority] || priorityBadges.medium
                  }`}
                >
                  {project.priority} priority
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <Link
                  to={`/clients/${project.client_id}`}
                  className="flex items-center gap-1 hover:text-indigo-600 font-medium text-slate-700"
                >
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Client: {project.client_name}
                </Link>

                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  PM: {project.project_manager_name || 'Unassigned'}
                </span>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {project.start_date.split('T')[0]}
                  {project.end_date && <> → {project.end_date.split('T')[0]}</>}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Lifecycle Status Transition Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-right">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Lifecycle State
              </span>
              <Can
                permission="projects.edit"
                fallback={
                  <span className="inline-block mt-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold capitalize">
                    {project.status.replace('_', ' ')}
                  </span>
                }
              >
                <select
                  value={project.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className="mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white capitalize shadow-sm"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </Can>
            </div>
          </div>
        </div>

        {/* Milestone Progress bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Milestone Completion Progress</span>
            <span className="font-bold text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>
              {completedMilestones?.length || 0} of {project.milestones?.length || 0} milestones
              delivered
            </span>
            <span>
              ₹{totalMilestonesAmount.toLocaleString()} committed of ₹
              {Number(project.budget).toLocaleString()} budget
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 mt-6 -mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Scope & Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {project.description || 'No detailed scope description provided.'}
              </p>

              {/* Technologies */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                  Technology Stack
                </h4>
                {project.technologies && project.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No technology tags specified.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Financial Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Financial Budget</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Contract Budget</span>
                  <span className="font-bold text-slate-900 text-base">
                    ₹{Number(project.budget).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Milestones Committed</span>
                  <span className="font-semibold text-indigo-600">
                    ₹{totalMilestonesAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500 text-xs">Unassigned Margin</span>
                  <span className="font-semibold text-slate-700">
                    ₹{Math.max(0, Number(project.budget) - totalMilestonesAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stakeholders Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Key Stakeholders</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Client Account
                  </span>
                  <Link
                    to={`/clients/${project.client_id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {project.client_name}
                  </Link>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Project Manager
                  </span>
                  <span className="font-semibold text-slate-800">
                    {project.project_manager_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEAM TAB */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Project Team Members</h3>
            <Can permission="projects.edit">
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Member
              </button>
            </Can>
          </div>

          {project.members && project.members.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">Project Role</th>
                    <th className="py-3 px-4 font-semibold">Allocation</th>
                    <th className="py-3 px-4 font-semibold">Joined Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {member.employee_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {member.employee_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {member.employee_code} • {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {member.allocation_percent}%
                      </td>
                      <td className="py-3 px-4 text-slate-500">{member.joined_at}</td>
                      <td className="py-3 px-4 text-right">
                        <Can permission="projects.edit">
                          <button
                            onClick={() => setMemberToDelete(member)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Team Members Assigned"
              description="No engineers or leads assigned to this project yet."
              action={{
                label: 'Assign First Member',
                onClick: () => setIsMemberModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* 3. MILESTONES TAB */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Deliverable Milestones</h3>
              <p className="text-xs text-slate-500">
                Track deliverables, completion milestones, and associated billing tranches
              </p>
            </div>
            <Can permission="milestones.create">
              <button
                onClick={() => setIsMilestoneModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </Can>
          </div>

          {project.milestones && project.milestones.length > 0 ? (
            <div className="space-y-3">
              {project.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        milestone.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-600'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {milestone.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Flag className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{milestone.title}</h4>
                        <span
                          className={`capitalize px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            milestone.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : milestone.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>

                      {milestone.description && (
                        <p className="text-xs text-slate-500 mt-1">{milestone.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Due: {milestone.due_date}
                        </span>
                        <span>• Value: ₹{Number(milestone.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Can permission="milestones.edit">
                      {milestone.status !== 'completed' ? (
                        <button
                          onClick={() =>
                            updateMilestoneMutation.mutate({
                              milestoneId: milestone.id,
                              payload: { status: 'completed' },
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold transition"
                        >
                          Mark Completed
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateMilestoneMutation.mutate({
                              milestoneId: milestone.id,
                              payload: { status: 'in_progress' },
                            })
                          }
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition"
                        >
                          Reopen
                        </button>
                      )}
                    </Can>

                    <Can permission="milestones.delete">
                      <button
                        onClick={() => deleteMilestoneMutation.mutate(milestone.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                        title="Delete milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Milestones Defined"
              description="Define deliverables and payment milestones to track project health."
              action={{
                label: 'Create First Milestone',
                onClick: () => setIsMilestoneModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* 4. TASKS TAB (PLACEHOLDER) */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Task Board & Sprint Kanban</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Task execution, sprint board, and issue tracking are owned by{' '}
            <strong>Dev 3 (Stage 2)</strong>. Project deliverables will be broken down into assignable
            tasks here.
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
            Roadmap: Dev 3 Stage 2
          </div>
        </div>
      )}

      {/* 5. TIMESHEETS TAB (PLACEHOLDER) */}
      {activeTab === 'timesheets' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Timesheets & Hours Billed</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Weekly timesheet submissions, hourly burn rate, and manager sign-offs are integrated
            with <strong>Dev 2</strong> via{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              /api/v1/projects/my-assignments
            </code>
            .
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            Teammate: Dev 2 Integration
          </div>
        </div>
      )}

      {/* 6. DOCUMENTS TAB (PLACEHOLDER) */}
      {activeTab === 'documents' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Project Architecture & SOWs</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Project requirements documents, architecture diagrams, and sign-off agreements are
            managed in Foundation Documents (Dev 1).
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            Foundation: Dev 1 Integration
          </div>
        </div>
      )}

      {/* 7. EXPENSES TAB (PLACEHOLDER) */}
      {activeTab === 'expenses' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Project Expenses & Claims</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Team travel expenses, software license costs, and project reimbursements are owned by{' '}
            <strong>Dev 3 (Stage 2)</strong>.
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
            Roadmap: Dev 3 Stage 2
          </div>
        </div>
      )}

      {/* 8. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Project Invoices & Billing</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            View milestone-based and hourly invoices generated for this project.
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            Linked Milestones & Invoicing
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Assign Team Member"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMemberMutation.mutate({
              employee_id: Number(memberEmpId),
              role: memberRole,
              allocation_percent: Number(memberAllocation),
              joined_at: memberJoinedAt,
            });
          }}
          className="space-y-4"
        >
          <FormField label="Select Employee" required>
            <select
              required
              value={memberEmpId}
              onChange={(e) => setMemberEmpId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Employee...</option>
              {employeesData?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.email})
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Project Role" required>
              <select
                value={memberRole}
                onChange={(e: any) => setMemberRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="developer">Developer</option>
                <option value="team_lead">Team Lead</option>
                <option value="qa">QA / Tester</option>
                <option value="designer">UI/UX Designer</option>
                <option value="manager">Manager</option>
              </select>
            </FormField>

            <FormField label="Allocation (%)" required>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={memberAllocation}
                onChange={(e) => setMemberAllocation(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
          </div>

          <FormField label="Joining Date" required>
            <input
              type="date"
              required
              value={memberJoinedAt}
              onChange={(e) => setMemberJoinedAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsMemberModalOpen(false)}
              className="px-3 py-1.5 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
            >
              {addMemberMutation.isPending ? 'Assigning...' : 'Assign Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToDelete?.employee_name} from this project team?`}
        confirmText="Remove Member"
        variant="danger"
        isLoading={removeMemberMutation.isPending}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => memberToDelete && removeMemberMutation.mutate(memberToDelete.employee_id)}
      />

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title="Add Deliverable Milestone"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMilestoneMutation.mutate({
              title: milestoneTitle,
              description: milestoneDesc || null,
              due_date: milestoneDueDate,
              amount: Number(milestoneAmount),
              status: 'pending',
            });
          }}
          className="space-y-4"
        >
          <FormField label="Milestone Title" required>
            <input
              type="text"
              required
              placeholder="e.g. Beta Release on TestFlight"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              rows={2}
              placeholder="Milestone deliverables and completion criteria..."
              value={milestoneDesc}
              onChange={(e) => setMilestoneDesc(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due Date" required>
              <input
                type="date"
                required
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>

            <FormField label="Milestone Amount (₹)">
              <input
                type="number"
                min="0"
                step="1000"
                value={milestoneAmount}
                onChange={(e) => setMilestoneAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsMilestoneModalOpen(false)}
              className="px-3 py-1.5 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMilestoneMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
            >
              {addMilestoneMutation.isPending ? 'Saving...' : 'Add Milestone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
