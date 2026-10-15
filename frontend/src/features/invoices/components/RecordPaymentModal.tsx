import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import { Invoice, PaymentMethod } from '../types';
import { useToast } from '../../../shared/context/ToastContext';
import { Modal } from '../../../shared/components/Modal';
import { DollarSign, Check } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/format.util';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const balanceDue = invoice?.balance_due ?? 0;
  const [amount, setAmount] = useState<number | ''>(balanceDue);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Update default amount when modal opens with new invoice
  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance_due ?? 0);
    }
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoice) return;
      return invoicesApi.recordPayment(invoice.id, {
        amount: Number(amount),
        payment_date: paymentDate,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      success(`Payment of ${formatCurrency(amount)} recorded for ${invoice?.invoice_number}`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice?.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to record payment');
    },
  });

  if (!isOpen || !invoice) return null;

  const isOverpayment = Number(amount) > balanceDue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment (${invoice.invoice_number})`}
      subtitle={`Client: ${invoice.client_name || 'Account billing'}`}
      maxWidth="md"
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
            form="record-payment-form"
            disabled={mutation.isPending || !amount || isOverpayment}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </>
      }
    >
      <form
        id="record-payment-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {/* Balance info card */}
        <div className="p-4 bg-[#dbe2d5]/60 rounded-2xl border border-[#c5d0be]/50 text-xs space-y-1.5 shadow-2xs">
          <div className="flex justify-between text-[#6b7663]">
            <span>Invoice Total:</span>
            <span className="font-semibold text-[#26301f] font-mono">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-[#6b7663]">
            <span>Already Paid:</span>
            <span className="font-semibold text-[#14776b] font-mono">
              {formatCurrency(invoice.amount_paid)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-[#26301f] pt-1.5 border-t border-[#c5d0be]/40 font-mono">
            <span>Balance Due:</span>
            <span className="text-[#c4643f]">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Payment Amount (₹ INR) *
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            max={balanceDue}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
            className={`w-full text-xs px-3 py-2 border rounded-xl clay-inset focus:outline-none focus:ring-2 ${
              isOverpayment
                ? 'border-[#c4643f] ring-2 ring-[#c4643f]/30 bg-[#f8e5df] text-[#9e3a1b]'
                : 'border-[#c5d0be]/60 bg-[#e2e8dc] text-[#26301f] focus:ring-[#14776b]/30'
            }`}
          />
          {isOverpayment && (
            <p className="text-[11px] text-[#c4643f] mt-1 font-semibold">
              Overpayment blocked! Amount cannot exceed balance due of {formatCurrency(balanceDue)}.
            </p>
          )}
        </div>

        {/* Payment Date & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Method *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 capitalize"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Credit Card</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Reference / UTR */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Transaction Reference / UTR
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. HDFC-NEFT-9988221144"
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Internal Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes regarding the clearance..."
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>
      </form>
    </Modal>
  );
};

export default RecordPaymentModal;
