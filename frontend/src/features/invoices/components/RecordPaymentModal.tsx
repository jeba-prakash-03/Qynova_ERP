import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import { Invoice, PaymentMethod } from '../types';
import { useToast } from '../../../shared/context/ToastContext';
import { X, DollarSign, Check } from 'lucide-react';

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

  const balanceDue = invoice?.balance_due || 0;
  const [amount, setAmount] = useState<number | ''>(balanceDue);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Update default amount when modal opens with new invoice
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance_due);
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
    onSuccess: (data) => {
      success(`Payment of ₹${amount} recorded for ${invoice?.invoice_number}`);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">
              Record Payment ({invoice.invoice_number})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          {/* Balance info card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Invoice Total:</span>
              <span className="font-semibold text-slate-800">₹{invoice.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Already Paid:</span>
              <span className="font-semibold text-emerald-600">
                ₹{invoice.amount_paid.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Balance Due:</span>
              <span className="text-rose-600">₹{balanceDue.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
              className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                isOverpayment
                  ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50'
                  : 'border-slate-300 focus:ring-emerald-500'
              }`}
            />
            {isOverpayment && (
              <p className="text-[11px] text-rose-600 mt-1">
                Overpayment blocked! Amount cannot exceed balance due of ₹{balanceDue}.
              </p>
            )}
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white capitalize"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Transaction Reference / UTR
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. HDFC-NEFT-9988221144"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes regarding the clearance..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !amount || isOverpayment}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
