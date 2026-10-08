import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField } from '../../../shared/components/FormField';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { Briefcase, Plus, Edit2, Trash2, Users } from 'lucide-react';

export const DesignationListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: designations = [], isLoading } = useQuery({
    queryKey: ['designations', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/designations');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingDesig) {
        return axiosClient.put(`/designations/${editingDesig.id}`, payload);
      } else {
        return axiosClient.post('/designations', payload);
      }
    },
    onSuccess: () => {
      success(editingDesig ? 'Designation updated successfully.' : 'Designation created successfully.');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save designation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/designations/${id}`);
    },
    onSuccess: () => {
      success('Designation removed successfully.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete designation');
    },
  });

  const resetForm = () => {
    setEditingDesig(null);
    setName('');
    setCode('');
    setDescription('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (desig: any) => {
    setEditingDesig(desig);
    setName(desig.name);
    setCode(desig.code);
    setDescription(desig.description || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      code,
      description,
    });
  };

  const columns: Column<any>[] = [
    {
      header: 'Designation Code',
      accessorKey: 'code',
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Designation Title',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => <span className="font-bold text-slate-800">{row.name}</span>,
    },
    {
      header: 'Assigned Employees',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {row.employee_count} Personnel
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
          <Can permission="designations.edit">
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
              title="Edit Designation"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="designations.delete">
            <button
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete Designation"
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Designations & Titles</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standard job roles, titles, and grade definitions across departments.
          </p>
        </div>

        <Can permission="designations.create">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Designation
          </button>
        </Can>
      </div>

      <DataTable
        columns={columns}
        data={designations}
        isLoading={isLoading}
        emptyTitle="No designations defined"
        keyExtractor={(row) => row.id}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDesig ? 'Edit Designation' : 'Create Designation'}
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
              {saveMutation.isPending ? 'Saving...' : 'Save Designation'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Designation Title" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </FormField>

          <FormField label="Designation Code" helperText="Uppercase identifier (e.g. SSE, EM)" required>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SSE"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities and seniority level"
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
        title="Delete Designation"
        message={`Are you sure you want to remove the '${deleteTarget?.name}' designation? It cannot be deleted if assigned to employees.`}
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DesignationListPage;
