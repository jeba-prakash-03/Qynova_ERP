export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod =
  | 'bank_transfer'
  | 'upi'
  | 'credit_card'
  | 'cheque'
  | 'cash'
  | 'other';

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_gstin?: string;
  project_id?: number | null;
  project_name?: string | null;
  project_code?: string | null;
  milestone_id?: number | null;
  milestone_title?: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  notes?: string | null;
  terms?: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface CreateInvoicePayload {
  client_id: number;
  project_id?: number | null;
  milestone_id?: number | null;
  issue_date: string;
  due_date: string;
  tax_percent?: number;
  notes?: string;
  terms?: string;
  items: { description: string; quantity: number; unit_price: number }[];
}

export interface RecordPaymentPayload {
  amount: number;
  payment_date: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', color: 'text-slate-700', border: 'border-slate-200' },
  sent: { label: 'Sent', bg: 'bg-sky-50', color: 'text-sky-700', border: 'border-sky-200' },
  viewed: { label: 'Viewed', bg: 'bg-indigo-50', color: 'text-indigo-700', border: 'border-indigo-200' },
  partially_paid: { label: 'Partially Paid', bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  paid: { label: 'Fully Paid', bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
  overdue: { label: 'Overdue', bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-200', color: 'text-slate-600', border: 'border-slate-300' },
};
