import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField } from '../../../shared/components/FormField';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { ShieldCheck, Plus, Edit2, Trash2, Key, Shield, Layers } from 'lucide-react';

export const RoleListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/roles');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingRole) {
        return axiosClient.put(`/roles/${editingRole.id}`, payload);
      } else {
        return axiosClient.post('/roles', payload);
      }
    },
    onSuccess: (res) => {
      const saved = res.data.data;
      success(editingRole ? 'Role updated.' : 'Role created.');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['roles'] });

      // If created new role, offer immediate permission matrix configuration
      if (!editingRole && saved?.id) {
        navigate(`/roles/${saved.id}/permissions`);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      success('Role deleted successfully.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete role');
    },
  });

  const resetForm = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (role: any) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ name, description });
  };

  const columns: Column<any>[] = [
    {
      header: 'Role Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              {row.name}
              {row.is_system && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                  System
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">{row.description || 'No description'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Granted Permissions',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <Key className="w-3 h-3 text-indigo-500" />
          {row.is_system && row.name === 'Admin' ? 'All System Access' : `${row.permissions_count} Permissions`}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/roles/${row.id}/permissions`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            title="Configure Permissions Matrix"
          >
            <Key className="w-3.5 h-3.5" />
            Permissions Matrix
          </button>

          <Can permission="roles.edit">
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
              title="Edit Role Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>

          <Can permission="roles.delete">
            {!row.is_system && (
              <button
                onClick={() => setDeleteTarget(row)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Delete Role"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Roles & Access Control</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure system roles and grant granular capabilities in the Module × Action authorization grid.
          </p>
        </div>

        <Can permission="roles.create">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </Can>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        emptyTitle="No roles found"
        keyExtractor={(row) => row.id}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Edit Role' : 'Create Security Role'}
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
              {saveMutation.isPending ? 'Saving...' : editingRole ? 'Update Role' : 'Create & Assign Permissions'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Role Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance Auditor"
              disabled={editingRole?.is_system}
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities and purpose of this access role"
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
        title="Delete Role"
        message={`Are you sure you want to delete '${deleteTarget?.name}'? Users assigned to this role will lose their granted privileges.`}
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default RoleListPage;
