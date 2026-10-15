import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api';
import { projectsApi } from '../../projects/api';
import { useToast } from '../../../shared/context/ToastContext';
import { Modal } from '../../../shared/components/Modal';
import { Save, Receipt } from 'lucide-react';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: number;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [projectId, setProjectId] = useState<number | undefined>(defaultProjectId);
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: expensesApi.getCategories,
    enabled: isOpen,
  });

  const { data: projectsRes } = useQuery({
    queryKey: ['projects', 'form-select'],
    queryFn: () => projectsApi.getAll({ limit: 100 }),
    enabled: isOpen && !defaultProjectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return expensesApi.create({
        category_id: categoryId,
        project_id: projectId || null,
        amount: Number(amount),
        date,
        vendor: vendor.trim() || undefined,
        description: description.trim() || undefined,
        status: 'pending_approval',
      });
    },
    onSuccess: (saved) => {
      success(`Expense ${saved.expense_code} submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      onClose();
      // Reset form
      setCategoryId(undefined);
      setAmount('');
      setVendor('');
      setDescription('');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to submit expense');
    },
  });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Claim / Submit Expense"
      subtitle="Submit operational or project expenditure for managerial reimbursement"
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#c5d0be] rounded-xl text-xs font-semibold text-[#26301f] bg-[#e2e8dc] hover:bg-[#dbe2d5] transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={createMutation.isPending || !categoryId || !amount}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            {createMutation.isPending ? 'Submitting...' : 'Submit Claim'}
          </button>
        </>
      }
    >
      <form
        id="expense-form"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="space-y-4"
      >
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Expense Category *
          </label>
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            required
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project (optional) */}
        {!defaultProjectId && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Linked Project (Optional)
            </label>
            <select
              value={projectId || ''}
              onChange={(e) =>
                setProjectId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            >
              <option value="">General Company Expense</option>
              {projectsRes?.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 4500.00"
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Incurred Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
        </div>

        {/* Vendor */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Vendor / Merchant
          </label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. AWS, DLF Office, JetBrains, MakeMyTrip"
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Description / Business Justification
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Business justification and details of the expense..."
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseFormModal;
