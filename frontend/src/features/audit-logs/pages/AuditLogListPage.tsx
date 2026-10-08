import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { DataTable, Column } from '../../../shared/components/DataTable';
import { Modal } from '../../../shared/components/Modal';
import { FileText, Eye, Clock, Shield, Search } from 'lucide-react';

export const AuditLogListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeDiffLog, setActiveDiffLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, actionFilter, entityFilter, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await axiosClient.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">
            {new Date(row.created_at).toLocaleDateString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Entity & Target ID',
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 capitalize">{row.entity}</span>
          {row.entity_id && (
            <span className="ml-1 text-[11px] font-mono text-slate-400">#{row.entity_id}</span>
          )}
        </div>
      ),
    },
    {
      header: 'User',
      cell: (row) => (
        <div>
          <div className="font-bold text-xs text-slate-800">
            {row.user_full_name?.trim() || row.user_email?.split('@')[0] || 'System'}
          </div>
          <div className="text-[11px] text-slate-400">{row.user_email || 'internal'}</div>
        </div>
      ),
    },
    {
      header: 'IP Address',
      accessorKey: 'ip',
      cell: (row) => (
        <span className="font-mono text-[11px] text-slate-500">{row.ip || '—'}</span>
      ),
    },
    {
      header: 'Data Diff',
      cell: (row) => (
        <button
          onClick={() => setActiveDiffLog(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
        >
          <Eye className="w-3.5 h-3.5" />
          View Changes
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Audit Trail</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Immutable log of operational and financial activities across all departments and modules.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyTitle="No audit logs found"
        emptyDescription="No events match your current filter criteria."
        page={page}
        totalPages={data?.meta?.totalPages || 1}
        totalRecords={data?.meta?.total}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by entity (e.g. employees)..."
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <input
              type="text"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by action..."
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              title="Start Date"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              title="End Date"
            />
          </div>
        }
      />

      {/* Diff Inspection Modal */}
      <Modal
        isOpen={Boolean(activeDiffLog)}
        onClose={() => setActiveDiffLog(null)}
        title={`Audit Event: ${activeDiffLog?.action}`}
        subtitle={`Recorded on ${activeDiffLog?.created_at} by ${activeDiffLog?.user_email || 'System'}`}
        maxWidth="2xl"
        footer={
          <button
            onClick={() => setActiveDiffLog(null)}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Close
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Old Value Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Previous State (Old Value)
              </span>
              <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto max-h-64">
                {activeDiffLog?.old_value
                  ? JSON.stringify(activeDiffLog.old_value, null, 2)
                  : '<None / Newly Created>'}
              </pre>
            </div>

            {/* New Value Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Updated State (New Value)
              </span>
              <pre className="text-xs font-mono text-slate-800 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto max-h-64">
                {activeDiffLog?.new_value
                  ? JSON.stringify(activeDiffLog.new_value, null, 2)
                  : '<None / Deleted>'}
              </pre>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogListPage;
