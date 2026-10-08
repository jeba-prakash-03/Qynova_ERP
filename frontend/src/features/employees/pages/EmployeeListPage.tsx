import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { UserPlus, Eye, Edit2, Trash2, Building2, Briefcase, Filter } from 'lucide-react';

export const EmployeeListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [lifecycleStage, setLifecycleStage] = useState<string>('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Fetch departments for filter dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  // Fetch employees list with query parameters
  const { data, isLoading } = useQuery({
    queryKey: [
      'employees',
      { page, search, departmentId, employmentType, status, lifecycleStage, sortField, sortOrder },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (departmentId) params.append('department_id', departmentId);
      if (employmentType) params.append('employment_type', employmentType);
      if (status) params.append('status', status);
      if (lifecycleStage) params.append('lifecycle_stage', lifecycleStage);
      params.append('sort', sortField);
      params.append('order', sortOrder);

      const res = await axiosClient.get(`/employees?${params.toString()}`);
      return res.data;
    },
  });

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      success('Employee profile deleted and account deactivated.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete employee');
    },
  });

  const columns: Column<any>[] = [
    {
      header: 'Employee Code',
      accessorKey: 'employee_code',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          {row.employee_code}
        </span>
      ),
    },
    {
      header: 'Name & Contact',
      accessorKey: 'first_name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {row.photo_url ? (
              <img src={row.photo_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              `${row.first_name[0]}${row.last_name[0]}`
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-xs text-slate-400">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Department & Role',
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">
            {row.department_name || '—'}
          </div>
          <div className="text-xs text-slate-400">{row.designation_name || '—'}</div>
        </div>
      ),
    },
    {
      header: 'Lifecycle Stage',
      accessorKey: 'lifecycle_stage',
      cell: (row) => {
        const stageColors: Record<string, string> = {
          candidate: 'bg-slate-100 text-slate-700',
          onboarding: 'bg-blue-50 text-blue-700 border border-blue-200',
          probation: 'bg-amber-50 text-amber-700 border border-amber-200',
          confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          resigned: 'bg-orange-50 text-orange-700 border border-orange-200',
          relieved: 'bg-slate-100 text-slate-500',
        };
        return (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-bold capitalize ${
              stageColors[row.lifecycle_stage] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {row.lifecycle_stage?.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      header: 'Type',
      accessorKey: 'employment_type',
      cell: (row) => (
        <span className="text-xs text-slate-600 capitalize">
          {row.employment_type?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold capitalize ${
            row.status === 'active'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/employees/${row.id}`)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <Can permission="employees.edit">
            <button
              onClick={() => navigate(`/employees/${row.id}/edit`)}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="employees.delete">
            <button
              onClick={() =>
                setDeleteTarget({ id: row.id, name: `${row.first_name} ${row.last_name}` })
              }
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete Profile"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Employees Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse and manage all registered company personnel, departments, and onboarding statuses.
          </p>
        </div>

        <Can permission="employees.create">
          <Link
            to="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/30 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add New Employee
          </Link>
        </Can>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyTitle="No employees found"
        emptyDescription="Try adjusting search terms or filters to find personnel records."
        searchPlaceholder="Search by name, email, phone, or code..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        page={page}
        totalPages={data?.meta?.totalPages || 1}
        totalRecords={data?.meta?.total}
        onPageChange={setPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field) => {
          if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortOrder('asc');
          }
        }}
        keyExtractor={(row) => row.id}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={lifecycleStage}
              onChange={(e) => {
                setLifecycleStage(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Lifecycle Stages</option>
              <option value="onboarding">Onboarding</option>
              <option value="probation">Probation</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="resigned">Resigned</option>
              <option value="relieved">Relieved</option>
            </select>

            <select
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>
              <option value="full_time">Full Time</option>
              <option value="intern">Intern</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        }
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove Employee"
        message={`Are you sure you want to soft delete ${deleteTarget?.name}? Their access credentials will be immediately deactivated and marked as inactive.`}
        confirmText="Delete Record"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default EmployeeListPage;
