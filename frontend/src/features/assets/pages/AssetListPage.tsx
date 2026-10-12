import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assetsApi, AssetRecord } from '../api';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import {
  Laptop,
  Plus,
  Search,
  Filter,
  UserCheck,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Tag,
  Building2,
} from 'lucide-react';

const CATEGORIES = ['All', 'laptop', 'desktop', 'monitor', 'mobile', 'peripheral', 'furniture', 'other'];
const STATUSES = ['All', 'available', 'assigned', 'maintenance', 'retired'];

export const AssetListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<AssetRecord | null>(null);

  // Form states for Create Asset
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formCategory, setFormCategory] = useState('laptop');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form states for Assign
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | ''>('');
  const [assignCondition, setAssignCondition] = useState('Good');
  const [assignNotes, setAssignNotes] = useState('');

  // Query assets
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assets', { search, category, status, page }],
    queryFn: () =>
      assetsApi.getAssets({
        search: search || undefined,
        category: category !== 'All' ? category : undefined,
        status: status !== 'All' ? status : undefined,
        page,
        limit: 15,
      }),
  });

  // Query employees for assign dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active_list'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      return res.data?.data || [];
    },
    enabled: isAssignModalOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => assetsApi.createAsset(payload),
    onSuccess: () => {
      success('Asset successfully registered.');
      setIsCreateModalOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to register asset');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { id: number; employee_id: number; condition_assigned?: string; notes?: string }) =>
      assetsApi.assignAsset(payload.id, {
        employee_id: payload.employee_id,
        condition_assigned: payload.condition_assigned,
        notes: payload.notes,
      }),
    onSuccess: () => {
      success('Asset successfully assigned.');
      setIsAssignModalOpen(false);
      setSelectedAssetForAssign(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to assign asset');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (assetId: number) => assetsApi.returnAsset(assetId),
    onSuccess: () => {
      success('Asset returned and marked as available.');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to return asset');
    },
  });

  const resetCreateForm = () => {
    setFormName('');
    setFormTag('');
    setFormCategory('laptop');
    setFormModel('');
    setFormSerial('');
    setFormCost('');
    setFormPurchaseDate('');
    setFormNotes('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      asset_tag: formTag || undefined,
      category: formCategory,
      model: formModel || undefined,
      serial_number: formSerial || undefined,
      purchase_cost: formCost ? Number(formCost) : undefined,
      purchase_date: formPurchaseDate || undefined,
      notes: formNotes || undefined,
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAssign || !assignEmployeeId) return;
    assignMutation.mutate({
      id: selectedAssetForAssign.id,
      employee_id: Number(assignEmployeeId),
      condition_assigned: assignCondition,
      notes: assignNotes,
    });
  };

  const assets: AssetRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              IT & Equipment Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Company Assets</h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Track hardware, manage employee equipment assignments, and monitor maintenance schedules.
          </p>
        </div>

        <Can permission="assets.create">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Register Asset
          </Button>
        </Can>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by tag, name, model..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#64748B]">Category:</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[#64748B]">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Asset Table */}
      {isLoading ? (
        <Loader text="Loading assets registry..." />
      ) : isError ? (
        <ErrorState title="Failed to load assets" onRetry={refetch} />
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Laptop className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">No Assets Found</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            No equipment matches your current filters. Register new hardware or clear filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Asset Tag</th>
                  <th className="px-6 py-4">Name & Specs</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-6 py-4 font-mono font-bold text-[#4F46E5]">
                      <Link to={`/assets/${asset.id}`} className="hover:underline">
                        {asset.asset_tag}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#0F172A]">{asset.name}</div>
                      <div className="text-[11px] text-[#64748B]">{asset.model || asset.serial_number || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-medium border border-[#E2E8F0]">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-6 py-4">
                      {asset.assigned_to_employee_name ? (
                        <div>
                          <span className="font-semibold text-[#0F172A]">
                            {asset.assigned_to_employee_name}
                          </span>
                          <span className="text-[11px] text-[#64748B] ml-1.5">
                            ({asset.assigned_to_employee_code})
                          </span>
                          <div className="text-[10px] text-[#64748B]">Since: {asset.assigned_date}</div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link to={`/assets/${asset.id}`}>
                        <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          Details
                        </Button>
                      </Link>

                      {asset.status === 'available' && (
                        <Can permission="assets.assign">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setSelectedAssetForAssign(asset);
                              setAssignEmployeeId('');
                              setIsAssignModalOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                        </Can>
                      )}

                      {asset.status === 'assigned' && (
                        <Can permission="assets.assign">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#D97706]" />}
                            onClick={() => {
                              if (confirm(`Return asset ${asset.asset_tag} (${asset.name}) back to available pool?`)) {
                                returnMutation.mutate(asset.id);
                              }
                            }}
                          >
                            Return
                          </Button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs">
              <span className="text-[#64748B]">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} assets)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register Asset Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Company Asset"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. MacBook Pro 16 M3 Max"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Asset Tag (Optional)</label>
              <input
                type="text"
                value={formTag}
                onChange={(e) => setFormTag(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Model</label>
              <input
                type="text"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="e.g. A2991"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Serial Number</label>
              <input
                type="text"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                placeholder="e.g. C02GXXXXX"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Purchase Cost (₹)</label>
              <input
                type="number"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Purchase Date</label>
              <input
                type="date"
                value={formPurchaseDate}
                onChange={(e) => setFormPurchaseDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional specifications, vendor info, warranty..."
                rows={2}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Register Asset'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Asset Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Asset: ${selectedAssetForAssign?.asset_tag || ''}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">Assign to Employee *</label>
            <select
              required
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">Select Employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code}) — {emp.department_name || 'No Dept'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">Equipment Condition on Handover</label>
            <input
              type="text"
              value={assignCondition}
              onChange={(e) => setAssignCondition(e.target.value)}
              placeholder="e.g. Brand New, Good, Minor scuffs"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">Assignment Notes</label>
            <textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Charger, bag, accessories included..."
              rows={2}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={assignMutation.isPending || !assignEmployeeId}>
              {assignMutation.isPending ? 'Assigning...' : 'Confirm Handover'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetListPage;
