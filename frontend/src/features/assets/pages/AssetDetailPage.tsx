import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '../api';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import {
  ArrowLeft,
  Laptop,
  Wrench,
  RotateCcw,
  Calendar,
  DollarSign,
  Hash,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const assetId = Number(id);
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceDesc, setMaintenanceDesc] = useState('');
  const [maintenanceVendor, setMaintenanceVendor] = useState('');
  const [maintenanceCost, setMaintenanceCost] = useState('');
  const [maintenanceStartDate, setMaintenanceStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assets', assetId],
    queryFn: () => assetsApi.getAssetById(assetId),
    enabled: !!assetId,
  });

  const returnMutation = useMutation({
    mutationFn: () => assetsApi.returnAsset(assetId),
    onSuccess: () => {
      success('Asset returned and marked as available.');
      queryClient.invalidateQueries({ queryKey: ['assets', assetId] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to return asset');
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: (payload: any) => assetsApi.createMaintenance(assetId, payload),
    onSuccess: () => {
      success('Maintenance scheduled.');
      setIsMaintenanceModalOpen(false);
      setMaintenanceDesc('');
      setMaintenanceVendor('');
      setMaintenanceCost('');
      queryClient.invalidateQueries({ queryKey: ['assets', assetId] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to schedule maintenance');
    },
  });

  const completeMaintenanceMutation = useMutation({
    mutationFn: (maintenanceId: number) =>
      assetsApi.updateMaintenance(maintenanceId, {
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      success('Maintenance marked as completed. Asset is now available.');
      queryClient.invalidateQueries({ queryKey: ['assets', assetId] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update maintenance');
    },
  });

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    maintenanceMutation.mutate({
      start_date: maintenanceStartDate,
      issue_description: maintenanceDesc,
      vendor_name: maintenanceVendor || undefined,
      cost: maintenanceCost ? Number(maintenanceCost) : undefined,
    });
  };

  if (isLoading) {
    return <Loader size="lg" text="Loading asset details..." />;
  }

  if (isError || !data?.asset) {
    return <ErrorState title="Asset Not Found" onRetry={refetch} />;
  }

  const { asset, activeAssignment, assignmentHistory = [], maintenanceHistory = [] } = data;

  return (
    <div className="space-y-6">
      {/* Back Link & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assets Registry
        </Link>

        <div className="flex items-center gap-3">
          {asset.status === 'assigned' && (
            <Can permission="assets.assign">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#D97706]" />}
                onClick={() => {
                  if (confirm(`Return asset ${asset.asset_tag} (${asset.name}) back to available inventory?`)) {
                    returnMutation.mutate();
                  }
                }}
              >
                Return Asset
              </Button>
            </Can>
          )}

          {asset.status !== 'maintenance' && (
            <Can permission="assets.edit">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Wrench className="w-3.5 h-3.5 text-[#4F46E5]" />}
                onClick={() => setIsMaintenanceModalOpen(true)}
              >
                Send to Maintenance
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
            <Laptop className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">{asset.name}</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-bold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                {asset.asset_tag}
              </span>
              <StatusBadge status={asset.status} />
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Category: <span className="capitalize font-semibold text-[#0F172A]">{asset.category}</span>
              {asset.model && ` • Model: ${asset.model}`}
              {asset.serial_number && ` • S/N: ${asset.serial_number}`}
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Specs & Info */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
            Hardware & Purchase Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#64748B] block mb-0.5">Asset Tag</span>
              <span className="font-mono font-bold text-[#0F172A]">{asset.asset_tag}</span>
            </div>
            <div>
              <span className="text-[#64748B] block mb-0.5">Serial Number</span>
              <span className="font-mono font-semibold text-[#475569]">{asset.serial_number || '—'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block mb-0.5">Model</span>
              <span className="font-semibold text-[#475569]">{asset.model || '—'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block mb-0.5">Purchase Date</span>
              <span className="font-semibold text-[#475569]">{asset.purchase_date || '—'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block mb-0.5">Purchase Cost</span>
              <span className="font-bold text-[#0F172A]">
                {asset.purchase_cost != null ? `₹${asset.purchase_cost.toLocaleString()}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block mb-0.5">Registered Date</span>
              <span className="font-semibold text-[#475569]">{new Date(asset.created_at).toLocaleDateString()}</span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[#64748B] block mb-0.5">Notes</span>
              <span className="text-[#475569]">{asset.notes || 'No notes specified.'}</span>
            </div>
          </div>
        </div>

        {/* Current Assignment Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
          <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3 mb-4">
            Current Assignment
          </h3>
          {activeAssignment ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#EEF2FF] rounded-2xl border border-[#C7D2FE]">
                <div className="font-bold text-[#0F172A]">{activeAssignment.employee_name}</div>
                <div className="text-[11px] text-[#4F46E5] font-mono">{activeAssignment.employee_code}</div>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Assigned Date</span>
                <span className="font-semibold text-[#0F172A]">{activeAssignment.assigned_date}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Handover Condition</span>
                <span className="font-semibold text-[#0F172A]">{activeAssignment.condition_assigned || 'Good'}</span>
              </div>
              {activeAssignment.notes && (
                <div>
                  <span className="text-[#64748B] block mb-0.5">Assignment Notes</span>
                  <span className="text-[#475569]">{activeAssignment.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#64748B]">
              <div className="w-10 h-10 rounded-2xl bg-[#F8FAFC] text-[#94A3B8] flex items-center justify-center mx-auto mb-2 border border-[#E2E8F0]">
                <User className="w-5 h-5" />
              </div>
              <p className="font-medium text-[#0F172A]">Unassigned</p>
              <p className="text-[11px] mt-1">This asset is currently in inventory.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assignment History */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
        <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3 mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-[#4F46E5]" />
          Custody & Assignment History
        </h3>
        {assignmentHistory.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-6">No previous assignment records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Assigned Date</th>
                  <th className="px-4 py-3">Returned Date</th>
                  <th className="px-4 py-3">Condition (Out / In)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {assignmentHistory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">
                      {item.employee_name} ({item.employee_code})
                    </td>
                    <td className="px-4 py-3">{item.assigned_date}</td>
                    <td className="px-4 py-3">{item.returned_date || <span className="text-[#16A34A] font-semibold">Active</span>}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {item.condition_assigned || 'Good'} / {item.condition_returned || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.returned_date ? 'approved' : 'present'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Maintenance History */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#4F46E5]" />
            Maintenance & Service Log
          </h3>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsMaintenanceModalOpen(true)}
          >
            Add Service Record
          </Button>
        </div>

        {maintenanceHistory.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-6">No maintenance records logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Date Range</th>
                  <th className="px-4 py-3">Issue Description</th>
                  <th className="px-4 py-3">Vendor / Tech</th>
                  <th className="px-4 py-3">Cost (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {maintenanceHistory.map((m: any) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#0F172A]">
                      {m.start_date} {m.end_date ? `to ${m.end_date}` : ''}
                    </td>
                    <td className="px-4 py-3 max-w-xs">{m.issue_description}</td>
                    <td className="px-4 py-3 text-[#64748B]">{m.vendor_name || 'In-House'}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">₹{Number(m.cost).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status === 'completed' ? 'approved' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.status === 'in_progress' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />}
                          onClick={() => completeMaintenanceMutation.mutate(m.id)}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Maintenance Modal */}
      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        title="Send Asset to Maintenance"
      >
        <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">Issue Description *</label>
            <textarea
              required
              value={maintenanceDesc}
              onChange={(e) => setMaintenanceDesc(e.target.value)}
              placeholder="e.g. Broken keyboard key, battery replacement, screen flicker..."
              rows={3}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Start Date</label>
              <input
                type="date"
                required
                value={maintenanceStartDate}
                onChange={(e) => setMaintenanceStartDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Vendor / Service Center</label>
              <input
                type="text"
                value={maintenanceVendor}
                onChange={(e) => setMaintenanceVendor(e.target.value)}
                placeholder="e.g. Apple Authorized Service"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                value={maintenanceCost}
                onChange={(e) => setMaintenanceCost(e.target.value)}
                placeholder="e.g. 4500"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setIsMaintenanceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={maintenanceMutation.isPending || !maintenanceDesc}>
              {maintenanceMutation.isPending ? 'Saving...' : 'Confirm Maintenance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetDetailPage;
