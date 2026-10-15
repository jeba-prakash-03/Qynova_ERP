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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Deal as Lost"
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
            form="lost-reason-form"
            disabled={isLoading || !reason.trim()}
            className="px-4 py-2 bg-[#c4643f] hover:bg-[#af5533] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
          >
            {isLoading ? 'Saving...' : 'Confirm Lost Stage'}
          </button>
        </>
      }
    >
      <form id="lost-reason-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start space-x-3 rounded-2xl bg-[#f6dfd8] border border-[#e8beae] p-3 text-[#8a3114] text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#c4643f]" />
          <p>
            Please provide a specific lost reason for reporting and sales win/loss analysis.
            This deal will be closed with 0% probability.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Reason for Loss <span className="text-[#c4643f]">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Selected competitor due to lower pricing, client budget postponed to next FY..."
            className="w-full rounded-[14px] border border-[rgba(76,91,70,0.2)] bg-[#dbe2d5] p-3 text-xs text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
          />
          {error && <p className="mt-1 text-xs text-[#c4643f]">{error}</p>}
        </div>
      </form>
    </Modal>
  );
};
