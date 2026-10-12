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
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
  updated_at: string;
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
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  created_at: string;
  updated_at: string;
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
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateInvoiceInput {
  client_id: number;
  project_id?: number | null;
  milestone_id?: number | null;
  issue_date: string;
  due_date: string;
  tax_percent?: number;
  notes?: string;
  terms?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  client_id?: number;
  project_id?: number | null;
  milestone_id?: number | null;
  issue_date?: string;
  due_date?: string;
  tax_percent?: number;
  notes?: string;
  terms?: string;
  items?: CreateInvoiceItemInput[];
}

export interface RecordPaymentInput {
  amount: number;
  payment_date: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface InvoiceQueryParams {
  client_id?: number;
  project_id?: number;
  status?: InvoiceStatus;
  due_before?: string;
  due_after?: string;
  search?: string;
  page?: number;
  limit?: number;
}
