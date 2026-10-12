import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetsApi } from '../api';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Laptop, ShieldCheck, Calendar, Tag } from 'lucide-react';

export const MyAssetsPage: React.FC = () => {
  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['assets', 'my'],
    queryFn: () => assetsApi.getMyAssets(),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Employee Self-Service
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Assigned Assets</h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            View company-issued hardware, laptops, and peripheral equipment assigned under your custody.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Loader text="Loading your assigned assets..." />
      ) : isError ? (
        <ErrorState title="Failed to load your assets" onRetry={refetch} />
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Laptop className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">No Equipment Assigned</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            You do not currently have any company equipment or hardware checked out to you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((item: any) => (
            <div
              key={item.assignment_id}
              className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
                    {item.asset_tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0F172A] mb-1">{item.asset_name}</h3>
                <p className="text-xs text-[#64748B] mb-4">
                  Category: <span className="capitalize font-semibold text-[#0F172A]">{item.category}</span>
                  {item.model && ` • ${item.model}`}
                </p>

                <div className="space-y-2 text-xs border-t border-[#E2E8F0] pt-4">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Serial Number:</span>
                    <span className="font-mono font-medium text-[#0F172A]">{item.serial_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Assigned Date:</span>
                    <span className="font-medium text-[#0F172A]">{item.assigned_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Handover Condition:</span>
                    <span className="font-medium text-[#0F172A]">{item.condition_assigned || 'Good'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                <div className="flex items-center gap-1.5 text-[#16A34A] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>In Your Custody</span>
                </div>
                <StatusBadge status="present" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssetsPage;
