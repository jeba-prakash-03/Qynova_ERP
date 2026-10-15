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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold clay-inset text-[#14776b] border border-[#14776b]/20">
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
            className="text-sm font-semibold text-[#26301f] hover:text-[#14776b] transition-colors"
          >
            {client.company_name}
          </Link>
          {client.website && (
            <div className="flex items-center gap-1.5 text-xs text-[#6b7663] mt-0.5">
              <Globe className="w-3 h-3 text-[#6b7663]/70" />
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-[#14776b] truncate max-w-[200px]"
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
        <span className="text-xs font-semibold clay-inset text-[#26301f]/80 px-2.5 py-0.5 rounded-lg border border-[#c5d0be]/40">
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
              <div className="font-semibold text-[#26301f]">{client.primary_contact_name}</div>
              {client.primary_contact_email && (
                <div className="flex items-center gap-1.5 text-[#6b7663] mt-0.5">
                  <Mail className="w-3 h-3 text-[#6b7663]/70" />
                  <span>{client.primary_contact_email}</span>
                </div>
              )}
              {client.primary_contact_phone && (
                <div className="flex items-center gap-1.5 text-[#6b7663] mt-0.5">
                  <Phone className="w-3 h-3 text-[#6b7663]/70" />
                  <span>{client.primary_contact_phone}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-[#6b7663]/60 italic">No primary contact</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (client: Client) => {
        const badgeColors: Record<string, string> = {
          active: 'bg-emerald-100/70 text-emerald-800 border-emerald-300',
          lead: 'bg-[#cf9b34]/15 text-[#916515] border-[#cf9b34]/30',
          inactive: 'bg-[#dbe2d5] text-[#6b7663] border-[#c5d0be]',
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
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
        <div className="flex items-center gap-1">
          <Link
            to={`/clients/${client.id}`}
            title="View Details"
            className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Can permission="clients.edit">
            <button
              onClick={() => handleOpenEdit(client)}
              title="Edit Client"
              className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </Can>
          <Can permission="clients.delete">
            <button
              onClick={() => setDeleteTarget(client)}
              title="Delete Client"
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
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-baloo text-[#26301f]">Clients & Accounts</h1>
            <p className="text-sm text-[#6b7663]">
              Manage enterprise customer accounts, stakeholders, communication logs, and contracts
            </p>
          </div>
        </div>

        <Can permission="clients.create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all duration-180 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Client
          </button>
        </Can>
      </div>

      {/* Filter and Search Bar */}
      <div className="clay-card p-4 rounded-2xl border border-[#c5d0be]/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6b7663] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, code, GSTIN, or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
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
