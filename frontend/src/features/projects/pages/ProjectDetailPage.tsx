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
import { tasksApi } from '../../tasks/api';
import { Task, TaskStatus } from '../../tasks/types';
import { TaskKanbanBoard } from '../../tasks/components/TaskKanbanBoard';
import { TaskDrawer } from '../../tasks/components/TaskDrawer';
import { TaskFormModal } from '../../tasks/components/TaskFormModal';
import { expensesApi } from '../../expenses/api';
import { Expense, EXPENSE_STATUS_CONFIG } from '../../expenses/types';
import { ExpenseFormModal } from '../../expenses/components/ExpenseFormModal';
import { invoicesApi } from '../../invoices/api';
import { Invoice, INVOICE_STATUS_CONFIG } from '../../invoices/types';
import { InvoiceFormModal } from '../../invoices/components/InvoiceFormModal';
import { financeApi } from '../../finance/api';
import { ProjectProfitability } from '../../finance/types';
import { Kanban, List, Download, ExternalLink, ShieldAlert } from 'lucide-react';

type TabType =
  | 'overview'
  | 'team'
  | 'milestones'
  | 'tasks'
  | 'timesheets'
  | 'documents'
  | 'expenses'
  | 'invoices'
  | 'profitability';

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
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
    },
    enabled: isMemberModalOpen,
  });

  // Task Board State in Project
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const { data: projectTasksRes } = useQuery({
    queryKey: ['tasks', { project_id: id }],
    queryFn: () => tasksApi.getAll({ project_id: Number(id), limit: 100 }),
    enabled: Boolean(id),
  });
  const projectTasks = projectTasksRes?.data || [];

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.updateStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update task status');
    },
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

  // Financial State & Queries
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const {
    data: projectExpenses = [],
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ['expenses', 'project', id],
    queryFn: async () => {
      const res = await expensesApi.getAll({ project_id: id });
      return res.data;
    },
    enabled: activeTab === 'expenses',
  });

  const {
    data: projectInvoices = [],
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['invoices', 'project', id],
    queryFn: async () => {
      const res = await invoicesApi.getAll({ project_id: id });
      return res.data;
    },
    enabled: activeTab === 'invoices',
  });

  const {
    data: profitability,
    isLoading: isLoadingProfitability,
    error: profitabilityError,
  } = useQuery<ProjectProfitability>({
    queryKey: ['profitability', 'project', id],
    queryFn: () => financeApi.getProjectProfitability(id!),
    enabled: activeTab === 'profitability',
    retry: false,
  });

  const createInvoiceFromMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => invoicesApi.createFromMilestone(milestoneId),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      success(`Invoice ${inv.invoice_number} created from milestone`);
      setActiveTab('invoices');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create invoice from milestone');
    },
  });

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
    { key: 'tasks', label: 'Tasks', count: projectTasks.length },
    { key: 'timesheets', label: 'Timesheets' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'profitability', label: 'Profitability' },
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

                    {milestone.status === 'completed' && (
                      <Can permission="invoices.create">
                        <button
                          onClick={() => createInvoiceFromMilestoneMutation.mutate(milestone.id)}
                          disabled={createInvoiceFromMilestoneMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold transition"
                          title="Generate draft invoice from this milestone"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Invoice</span>
                        </button>
                      </Can>
                    )}

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

      {/* 4. TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Project Tasks & Sprints</h3>
              <p className="text-xs text-slate-500">
                Track deliverables, code review workflow, and subtasks for {project.name}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setTaskViewMode('kanban')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                    taskViewMode === 'kanban'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  Kanban
                </button>
                <button
                  onClick={() => setTaskViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                    taskViewMode === 'list'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
              </div>

              <Can permission="tasks.create">
                <button
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> New Task
                </button>
              </Can>
            </div>
          </div>

          {projectTasks.length === 0 ? (
            <EmptyState
              title="No Tasks for this Project"
              description="Break down this project into sprint tasks, assign them to project members, and track code review progress."
              action={{
                label: 'Create First Task',
                onClick: () => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                },
              }}
            />
          ) : taskViewMode === 'kanban' ? (
            <TaskKanbanBoard
              tasks={projectTasks}
              onStatusChange={(taskId, status) =>
                updateTaskStatusMutation.mutate({ taskId, status })
              }
              onCardClick={(task) => setActiveTaskId(task.id)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setActiveTaskId(t.id)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                        {t.task_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {t.assignee_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 capitalize">{t.priority}</td>
                      <td className="px-4 py-3 capitalize">{t.status.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {t.due_date ? t.due_date.split('T')[0] : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TaskDrawer
            taskId={activeTaskId}
            onClose={() => setActiveTaskId(null)}
            onEdit={(task) => {
              setActiveTaskId(null);
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
          />

          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => {
              setIsTaskModalOpen(false);
              setTaskToEdit(null);
            }}
            taskToEdit={taskToEdit}
            defaultProjectId={Number(id)}
          />
        </div>
      )}

      {/* 5. TIMESHEETS TAB */}
      {activeTab === 'timesheets' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Timesheets & Hours Billed</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Weekly timesheet submissions, hourly burn rate, and manager sign-offs are tracked in
            the Timesheets module and linked directly to project tasks.
          </p>
          <div className="mt-4">
            <Link
              to="/timesheets/my"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200 transition-colors"
            >
              Open Timesheets
            </Link>
          </div>
        </div>
      )}

      {/* 6. DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Project Architecture & SOWs</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Project requirements documents, architecture diagrams, and sign-off agreements are
            managed securely in the company document repository.
          </p>
        </div>
      )}

      {/* 7. EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Project Expenses & Reimbursables</h3>
              <p className="text-xs text-slate-500">
                Track direct expenses, software licenses, travel, and vendor claims attributed to {project.name}.
              </p>
            </div>
            <Can permission="expenses.create">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> Claim Expense
              </button>
            </Can>
          </div>

          {isLoadingExpenses ? (
            <div className="p-12 flex justify-center">
              <Loader text="Loading project expenses..." />
            </div>
          ) : projectExpenses.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Vendor / Purpose</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectExpenses.map((exp: Expense) => {
                    const statusConf = EXPENSE_STATUS_CONFIG[exp.status];
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {exp.expense_code}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(exp.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {exp.category}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {exp.vendor || exp.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                          ₹{Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConf.bg} ${statusConf.color} ${statusConf.border}`}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No project expenses found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No expense claims have been charged to this project yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 8. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Project Billing & Invoices</h3>
              <p className="text-xs text-slate-500">
                Milestone invoices and billing statements generated for {project.name}.
              </p>
            </div>
            <Can permission="invoices.create">
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> Create Invoice
              </button>
            </Can>
          </div>

          {isLoadingInvoices ? (
            <div className="p-12 flex justify-center">
              <Loader text="Loading project invoices..." />
            </div>
          ) : projectInvoices.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectInvoices.map((inv: Invoice) => {
                    const statusConf = INVOICE_STATUS_CONFIG[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                          <Link to={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(inv.issue_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(inv.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                          ₹{Number(inv.total).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">
                          ₹{Number(inv.amount_paid).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-rose-700">
                          ₹{Number(inv.balance_due).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConf.bg} ${statusConf.color} ${statusConf.border}`}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => invoicesApi.downloadPdf(inv.id, inv.invoice_number)}
                              className="p-1 text-slate-400 hover:text-slate-700 transition"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                              title="View Invoice Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No project invoices found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No invoices have been billed for this project yet. You can create an invoice or generate one from a completed milestone.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 9. PROFITABILITY TAB (FINANCIAL ACCESS GUARDED) */}
      {activeTab === 'profitability' && (
        <Can
          permission="projects.view_financials"
          fallback={
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Financial Visibility Shielded</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Salary-derived labor costs and project profitability metrics are restricted. You require{' '}
                <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">
                  projects.view_financials
                </code>{' '}
                permission to view financial data.
              </p>
            </div>
          }
        >
          {isLoadingProfitability ? (
            <div className="p-12 flex justify-center">
              <Loader text="Computing project labor costs & profitability..." />
            </div>
          ) : profitability ? (
            <div className="space-y-6">
              {/* Top Financial KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Revenue */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Revenue Realized</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-xl font-bold font-mono text-emerald-700">
                    ₹{profitability.revenue.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Total client payments received</p>
                </div>

                {/* Labor Cost */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Labor Cost (Hours Burn)</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="mt-2 text-xl font-bold font-mono text-amber-700">
                    ₹{profitability.labor_cost.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Approved timesheet hours × hourly salary cost
                  </p>
                </div>

                {/* Direct Expenses */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Project Expenses</span>
                    <Receipt className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="mt-2 text-xl font-bold font-mono text-rose-700">
                    ₹{profitability.project_expenses.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Approved operational claims</p>
                </div>

                {/* Net Profit */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Net Profit</span>
                    <TrendingUp
                      className={`w-4 h-4 ${
                        profitability.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    />
                  </div>
                  <p
                    className={`mt-2 text-xl font-bold font-mono ${
                      profitability.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    ₹{profitability.net_profit.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">
                    Margin: {profitability.profit_margin_percent}% | Budget Burn: {profitability.budget_used_percent}%
                  </p>
                </div>
              </div>

              {/* Labor Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Labor Cost Breakdown by Team Member
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hourly rate computed dynamically from active salary structures
                  </p>
                </div>

                {profitability.labor_breakdown && profitability.labor_breakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Team Member</th>
                          <th className="px-4 py-2.5 text-right">Hourly Rate</th>
                          <th className="px-4 py-2.5 text-right">Approved Hours</th>
                          <th className="px-4 py-2.5 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profitability.labor_breakdown.map((item) => (
                          <tr key={item.employee_id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {item.employee_name}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              ₹{item.hourly_rate.toFixed(2)}/hr
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                              {item.hours} hrs
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                              ₹{item.cost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-2.5 text-right text-slate-700">
                            Total Labor Cost:
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-amber-700">
                            ₹{profitability.labor_cost.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No approved timesheet hours logged for this project yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Unable to calculate profitability data for this project.
              </p>
            </div>
          )}
        </Can>
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

      {/* Claim Expense Modal */}
      {isExpenseModalOpen && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            refetchExpenses();
          }}
          defaultProjectId={Number(id)}
        />
      )}

      {/* Create Invoice Modal */}
      {isInvoiceModalOpen && (
        <InvoiceFormModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            refetchInvoices();
          }}
          defaultClientId={project.client_id}
          defaultProjectId={Number(id)}
        />
      )}
    </div>
  );
};
