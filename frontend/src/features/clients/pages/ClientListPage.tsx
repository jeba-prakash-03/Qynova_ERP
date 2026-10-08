import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Globe,
  Mail,
  Phone,
  Search,
} from 'lucide-react';
import { clientsApi } from '../api';
import { Client, ClientStatus } from '../types';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { ClientFormModal } from '../components/ClientFormModal';

export const ClientListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['clients', searchTerm, statusFilter],
    queryFn: () =>
      clientsApi.getAll({
        search: searchTerm || undefined,
        status: (statusFilter as ClientStatus) || undefined,
        limit: 100,
      }),
  });

  const clients = responseData?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => clientsApi.create(payload),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      success(`Client ${newClient.client_code} created successfully`);
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create client');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      clientsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      success('Client updated successfully');
      setIsModalOpen(false);
      setEditingClient(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update client');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      success('Client deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete client');
    },
  });

  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: Column<Client>[] = [
    {
      header: 'Client Code',
      cell: (client: Client) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {client.client_code}
        </span>
      ),
      sortable: true,
      accessorKey: 'client_code',
    },
    {
      header: 'Company & Website',
      cell: (client: Client) => (
        <div>
          <Link
            to={`/clients/${client.id}`}
            className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition"
          >
            {client.company_name}
          </Link>
          {client.website && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="hover:underline truncate max-w-[200px]"
                onClick={(e) => e.stopPropagation()}
              >
                {client.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      ),
      sortable: true,
      accessorKey: 'company_name',
    },
    {
      header: 'Industry',
      cell: (client: Client) => (
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {client.industry || 'Not specified'}
        </span>
      ),
      sortable: true,
      accessorKey: 'industry',
    },
    {
      header: 'Primary Contact',
      cell: (client: Client) => (
        <div className="text-xs">
          {client.primary_contact_name ? (
            <>
              <div className="font-medium text-slate-800">{client.primary_contact_name}</div>
              {client.primary_contact_email && (
                <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{client.primary_contact_email}</span>
                </div>
              )}
              {client.primary_contact_phone && (
                <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{client.primary_contact_phone}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-slate-400 italic">No primary contact</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (client: Client) => {
        const badgeColors: Record<string, string> = {
          active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          lead: 'bg-amber-50 text-amber-700 border-amber-200',
          inactive: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
              badgeColors[client.status] || badgeColors.inactive
            }`}
          >
            {client.status}
          </span>
        );
      },
      sortable: true,
      accessorKey: 'status',
    },
    {
      header: 'Actions',
      cell: (client: Client) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/clients/${client.id}`}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Can permission="clients.edit">
            <button
              onClick={() => handleOpenEdit(client)}
              title="Edit Client"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="clients.delete">
            <button
              onClick={() => setDeleteTarget(client)}
              title="Delete Client"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition"
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
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clients & Accounts</h1>
              <p className="text-sm text-slate-500">
                Manage enterprise customer accounts, stakeholders, communication logs, and contracts
              </p>
            </div>
          </div>
        </div>

        <Can permission="clients.create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Client
          </button>
        </Can>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, code, GSTIN, or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable<Client>
          columns={columns}
          data={clients}
          isLoading={isLoading}
          keyExtractor={(c) => c.id}
          emptyTitle="No clients found matching your query"
        />
      </div>

      {/* Create / Edit Modal */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        client={editingClient}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.company_name}"? All associated contacts, addresses, and projects will be archived.`}
        confirmText="Delete Client"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};
