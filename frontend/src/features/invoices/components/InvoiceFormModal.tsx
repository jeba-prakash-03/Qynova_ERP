import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import { clientsApi } from '../../clients/api';
import { projectsApi } from '../../projects/api';
import { useToast } from '../../../shared/context/ToastContext';
import { Modal } from '../../../shared/components/Modal';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/format.util';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: number;
  defaultProjectId?: number;
}

interface FormItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  defaultClientId,
  defaultProjectId,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [clientId, setClientId] = useState<number | undefined>(defaultClientId);
  const [projectId, setProjectId] = useState<number | undefined>(defaultProjectId);
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    'Payment due within 30 days of invoice date. Please quote invoice number on bank transfers.'
  );

  const [items, setItems] = useState<FormItem[]>([
    { description: 'Consulting & Engineering Services', quantity: 1, unit_price: 50000 },
  ]);

  // Sync defaults
  React.useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId);
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultClientId, defaultProjectId]);

  // Fetch clients for dropdown
  const { data: clientsRes } = useQuery({
    queryKey: ['clients', 'for-invoice-modal'],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
    enabled: isOpen,
  });

  // Fetch projects for dropdown
  const { data: projectsRes } = useQuery({
    queryKey: ['projects', 'for-invoice-modal', clientId],
    queryFn: () => projectsApi.getAll({ client_id: clientId, limit: 100 }),
    enabled: Boolean(clientId && isOpen),
  });

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof FormItem, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Please select a client');
      if (items.length === 0 || subtotal <= 0) {
        throw new Error('Please specify at least one billable item');
      }

      return invoicesApi.create({
        client_id: clientId,
        project_id: projectId || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_percent: taxPercent,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      });
    },
    onSuccess: (saved) => {
      success(`Invoice ${saved.invoice_number} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to create invoice');
    },
  });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate New Tax Invoice"
      subtitle="Create an official billing statement for client services or milestones"
      maxWidth="2xl"
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
            form="invoice-create-form"
            disabled={createMutation.isPending || !clientId || subtotal <= 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            {createMutation.isPending ? 'Generating...' : 'Generate Invoice'}
          </button>
        </>
      }
    >
      <form
        id="invoice-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="space-y-4"
      >
        {/* Client & Project Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Client *
            </label>
            <select
              value={clientId || ''}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : undefined)}
              required
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            >
              <option value="">Select Client</option>
              {clientsRes?.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_code} - {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Project (Optional)
            </label>
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            >
              <option value="">None / General Invoice</option>
              {projectsRes?.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates & Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Issue Date *
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              GST Tax %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              Invoice Line Items *
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-semibold text-[#14776b] hover:text-[#11655b] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 bg-[#dbe2d5]/60 rounded-xl border border-[#c5d0be]/50 shadow-2xs">
                <input
                  type="text"
                  required
                  placeholder="Item description..."
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-[#c5d0be]/60 rounded-lg clay-inset bg-[#e2e8dc] text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                  className="w-16 text-xs px-2 py-1.5 border border-[#c5d0be]/60 rounded-lg clay-inset bg-[#e2e8dc] text-right text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                />
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="Rate"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                  className="w-28 text-xs px-2 py-1.5 border border-[#c5d0be]/60 rounded-lg clay-inset bg-[#e2e8dc] text-right text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                />
                <span className="w-24 text-right font-mono text-xs font-semibold text-[#26301f]">
                  {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-[#6b7663] hover:text-[#c4643f] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="p-4 bg-[#dbe2d5]/60 rounded-2xl border border-[#c5d0be]/50 text-xs space-y-1.5 ml-auto max-w-xs shadow-2xs">
          <div className="flex justify-between text-[#6b7663]">
            <span>Subtotal:</span>
            <span className="font-semibold text-[#26301f] font-mono">
              {formatCurrency(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-[#6b7663]">
            <span>GST ({taxPercent}%):</span>
            <span className="font-semibold text-[#26301f] font-mono">
              {formatCurrency(taxAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-[#26301f] pt-1.5 border-t border-[#c5d0be]/40 font-mono">
            <span>Total Amount:</span>
            <span className="text-[#14776b]">
              {formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Payment Terms
            </label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Invoice Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceFormModal;
