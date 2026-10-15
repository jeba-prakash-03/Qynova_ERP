import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Building,
  User,
  ArrowRight,
} from 'lucide-react';
import { projectsApi } from '../api';
import { Project, ProjectPriority, ProjectStatus } from '../types';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { formatCurrency } from '../../../shared/utils/format.util';

const priorityBadges: Record<ProjectPriority, string> = {
  low: 'bg-[#dbe2d5] text-[#26301f] border-[#c5d0be]',
  medium: 'bg-[#22304a]/10 text-[#22304a] border-[#22304a]/25',
  high: 'bg-[#cf9b34]/15 text-[#916515] border-[#cf9b34]/30',
  critical: 'bg-[#c4643f]/15 text-[#9e3a1b] border-[#c4643f]/30',
};

const statusBadges: Record<ProjectStatus, string> = {
  lead: 'bg-purple-100/70 text-purple-800 border-purple-200',
  proposal: 'bg-indigo-100/70 text-indigo-800 border-indigo-200',
  won: 'bg-[#14776b]/15 text-[#14776b] border-[#14776b]/30',
  contract: 'bg-cyan-100/70 text-cyan-800 border-cyan-200',
  planning: 'bg-[#22304a]/10 text-[#22304a] border-[#22304a]/25',
  development: 'bg-[#14776b]/15 text-[#14776b] border-[#14776b]/30',
  testing: 'bg-[#cf9b34]/15 text-[#916515] border-[#cf9b34]/30',
  uat: 'bg-orange-100/70 text-orange-800 border-orange-200',
  deployment: 'bg-emerald-100/70 text-emerald-800 border-emerald-300',
  maintenance: 'bg-[#dbe2d5] text-[#6b7663] border-[#c5d0be]',
  completed: 'bg-emerald-100/80 text-emerald-900 border-emerald-300',
  on_hold: 'bg-[#cf9b34]/20 text-[#855700] border-[#cf9b34]/30',
  cancelled: 'bg-[#c4643f]/15 text-[#9e3a1b] border-[#c4643f]/30',
};

export const ProjectListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['projects', searchTerm, statusFilter, priorityFilter],
    queryFn: () =>
      projectsApi.getAll({
        search: searchTerm || undefined,
        status: (statusFilter as ProjectStatus) || undefined,
        priority: (priorityFilter as ProjectPriority) || undefined,
        limit: 100,
      }),
  });

  const projects = responseData?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.create(payload),
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success(`Project ${newProj.project_code} created successfully`);
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      projectsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success('Project updated successfully');
      setIsModalOpen(false);
      setEditingProject(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success('Project deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete project');
    },
  });

  const handleOpenCreate = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editingProject) {
      await updateMutation.mutateAsync({ id: editingProject.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: Column<Project>[] = [
    {
      header: 'Project Code',
      cell: (project: Project) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold clay-inset text-[#14776b] border border-[#14776b]/20">
          {project.project_code}
        </span>
      ),
      sortable: true,
      accessorKey: 'project_code',
    },
    {
      header: 'Project Name & Client',
      cell: (project: Project) => (
        <div>
          <Link
            to={`/projects/${project.id}`}
            className="text-sm font-semibold text-[#26301f] hover:text-[#14776b] transition-colors"
          >
            {project.name}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#6b7663] mt-0.5">
            <Building className="w-3 h-3 text-[#6b7663]/70" />
            <span>{project.client_name || 'Client'}</span>
          </div>
        </div>
      ),
      sortable: true,
      accessorKey: 'name',
    },
    {
      header: 'Project Manager',
      cell: (project: Project) => (
        <div className="text-xs">
          {project.project_manager_name ? (
            <div className="flex items-center gap-1.5 font-medium text-[#26301f]">
              <User className="w-3.5 h-3.5 text-[#6b7663]" />
              <span>{project.project_manager_name}</span>
            </div>
          ) : (
            <span className="text-[#6b7663]/60 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Budget',
      cell: (project: Project) => (
        <span className="text-xs font-semibold font-mono text-[#26301f]">
          {formatCurrency(project.budget)}
        </span>
      ),
      sortable: true,
      accessorKey: 'budget',
    },
    {
      header: 'Priority',
      cell: (project: Project) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
            priorityBadges[project.priority as ProjectPriority] || priorityBadges.medium
          }`}
        >
          {project.priority}
        </span>
      ),
      sortable: true,
      accessorKey: 'priority',
    },
    {
      header: 'Status',
      cell: (project: Project) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
            statusBadges[project.status as ProjectStatus] || 'bg-[#dbe2d5] text-[#26301f]'
          }`}
        >
          {project.status.replace('_', ' ')}
        </span>
      ),
      sortable: true,
      accessorKey: 'status',
    },
    {
      header: 'Timeline',
      cell: (project: Project) => (
        <div className="text-xs text-[#6b7663] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#6b7663]/70" />
          <span>{project.start_date.split('T')[0]}</span>
          {project.end_date && <span> → {project.end_date.split('T')[0]}</span>}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (project: Project) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/projects/${project.id}`}
            title="View Details"
            className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Can permission="projects.edit">
            <button
              onClick={() => handleOpenEdit(project)}
              title="Edit Project"
              className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="projects.delete">
            <button
              onClick={() => setDeleteTarget(project)}
              title="Delete Project"
              className="p-1.5 text-[#6b7663] hover:text-[#c4643f] hover:bg-[#c4643f]/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#14776b]/15 text-[#14776b] rounded-xl clay-card">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-baloo text-[#26301f]">Projects & Delivery</h1>
            <p className="text-sm text-[#6b7663]">
              Track project lifecycles, milestones, teams, budgets, and deliverable execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cards / Table View Toggle */}
          <div className="flex items-center clay-inset p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1.5 rounded-lg transition-all duration-180 ${
                viewMode === 'cards'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-lg transition-all duration-180 ${
                viewMode === 'table'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <Can permission="projects.create">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all duration-180 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </Can>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="clay-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6b7663] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by project name, PRJ-code, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          >
            <option value="">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="proposal">Proposal</option>
            <option value="planning">Planning</option>
            <option value="development">Development</option>
            <option value="testing">Testing</option>
            <option value="uat">UAT</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Project Content: Cards or Table */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} lines={4} />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={6} cols={6} />
        )
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects Found"
          description="No active projects matched your search criteria."
          action={{
            label: 'Initiate Project',
            onClick: handleOpenCreate,
          }}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="clay-card-interactive bg-[#e2e8dc] rounded-2xl border border-[#c5d0be]/50 transition-all duration-180 flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                {/* Card Top Pill Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold clay-inset text-[#14776b] border border-[#14776b]/20">
                    {project.project_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                        priorityBadges[project.priority] || priorityBadges.medium
                      }`}
                    >
                      {project.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                        statusBadges[project.status] || 'bg-[#dbe2d5] text-[#26301f]'
                      }`}
                    >
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Title and Client */}
                <Link to={`/projects/${project.id}`}>
                  <h3 className="text-base font-bold text-[#26301f] group-hover:text-[#14776b] transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-[#6b7663] mt-1">
                  <Building className="w-3.5 h-3.5 text-[#6b7663]/70" />
                  <span className="font-medium text-[#26301f]/80">{project.client_name}</span>
                </div>

                <p className="text-xs text-[#6b7663] mt-2.5 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>

                {/* Tech tags */}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.technologies.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold clay-inset text-[#26301f]/75 border border-[#c5d0be]/40"
                      >
                        {t}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold clay-inset text-[#6b7663] border border-[#c5d0be]/40">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3.5 bg-[#dbe2d5]/60 border-t border-[#c5d0be]/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#6b7663] block text-[10px] uppercase font-semibold tracking-wider">
                    Budget
                  </span>
                  <span className="font-bold font-mono text-[#26301f]">
                    {formatCurrency(project.budget)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Can permission="projects.edit">
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#e2e8dc] rounded-lg transition-colors"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Can>
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#14776b] hover:text-[#11655b] transition-colors"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
          <DataTable<Project>
            columns={columns}
            data={projects}
            isLoading={isLoading}
            keyExtractor={(p) => p.id}
            emptyTitle="No projects found"
          />
        </div>
      )}

      {/* Create / Edit Modal */}
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        project={editingProject}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.project_code})? All associated milestones and member assignments will be archived.`}
        confirmText="Delete Project"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};
