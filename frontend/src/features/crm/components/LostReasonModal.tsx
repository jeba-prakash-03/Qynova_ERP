import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';

interface LostReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason for marking this deal as lost is required.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Deal as Lost">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start space-x-3 rounded-lg bg-rose-50 p-3 text-rose-700 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
          <p>
            Please provide a specific lost reason for reporting and sales win/loss analysis.
            This deal will be closed with 0% probability.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Reason for Loss <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Selected competing competitor due to lower pricing, client budget postponed to next FY..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !reason.trim()}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Confirm Lost Stage'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
