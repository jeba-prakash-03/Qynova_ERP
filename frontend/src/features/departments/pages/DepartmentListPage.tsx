import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Table as TableIcon,
  ChevronRight,
  GitBranch,
} from 'lucide-react';

export const DepartmentListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Flat query
  const { data: flatDepts = [], isLoading: loadingFlat } = useQuery({
    queryKey: ['departments', 'flat'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  // Tree query
  const { data: treeDepts = [], isLoading: loadingTree } = useQuery({
    queryKey: ['departments', 'tree'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments?tree=true');
      return res.data.data;
    },
    enabled: viewMode === 'tree',
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingDept) {
        return axiosClient.put(`/departments/${editingDept.id}`, payload);
      } else {
        return axiosClient.post('/departments', payload);
      }
    },
    onSuccess: () => {
      success(editingDept ? 'Department updated successfully.' : 'Department created successfully.');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      success('Department removed successfully.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete department');
    },
  });

  const resetForm = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setParentId('');
    setDescription('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (dept: any) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setParentId(dept.parent_id ? String(dept.parent_id) : '');
    setDescription(dept.description || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      code,
      parent_id: parentId ? Number(parentId) : null,
      description,
    });
  };

  const columns: Column<any>[] = [
    {
      header: 'Department Code',
      accessorKey: 'code',
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => <span className="font-bold text-slate-800">{row.name}</span>,
    },
    {
      header: 'Parent Department',
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {row.parent_name ? (
            <span className="inline-flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-slate-400" />
              {row.parent_name}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Top Level</span>
          )}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (row) => <span className="text-xs text-slate-500 line-clamp-1">{row.description || '—'}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Can permission="departments.edit">
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
              title="Edit Department"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="departments.delete">
            <button
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete Department"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Department Hierarchy</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure the organizational tree structure, parent-child divisions, and operational units.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-200/60 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'tree' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Tree View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>

          <Can permission="departments.create">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </Can>
        </div>
      </div>

      {/* Render Tree View or Table View */}
      {viewMode === 'tree' ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Organizational Tree Breakdown
          </div>

          {treeDepts.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Building2}
                title="No departments found"
                description="Start organizing your teams and reporting structure."
                action={{
                  label: 'Add your first department',
                  onClick: openCreateModal,
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {treeDepts.map((root: any) => (
                <div
                  key={root.id}
                  className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-800">{root.name}</h3>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {root.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{root.description || 'Top-level branch'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Can permission="departments.edit">
                        <button
                          onClick={() => openEditModal(root)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Can>
                      <Can permission="departments.delete">
                        <button
                          onClick={() => setDeleteTarget(root)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Can>
                    </div>
                  </div>

                  {/* Sub-departments */}
                  {root.children && root.children.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 pl-6 space-y-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        Sub-Departments ({root.children.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {root.children.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-800">{sub.name}</div>
                              <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Can permission="departments.edit">
                                <button
                                  onClick={() => openEditModal(sub)}
                                  className="p-1 text-slate-400 hover:text-amber-600 transition"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </Can>
                              <Can permission="departments.delete">
                                <button
                                  onClick={() => setDeleteTarget(sub)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </Can>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={flatDepts}
          isLoading={loadingFlat}
          emptyTitle="No departments found"
          emptyDescription="Start organizing your teams and reporting structure."
          emptyAction={{
            label: 'Add your first department',
            onClick: openCreateModal,
          }}
          keyExtractor={(row) => row.id}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create Department'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Department Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quality Assurance"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </FormField>

          <FormField label="Department Code" helperText="Uppercase code (e.g. QA, DEV)" required>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DEV-QA"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
            />
          </FormField>

          <FormField label="Parent Department" helperText="Leave empty for root departments">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">None (Top-Level Department)</option>
              {flatDepts
                .filter((d: any) => !editingDept || d.id !== editingDept.id)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
            </select>
          </FormField>

          <FormField label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department purpose and scope"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Department"
        message={`Are you sure you want to remove the '${deleteTarget?.name}' department? Departments with active employees or sub-departments cannot be deleted.`}
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DepartmentListPage;
