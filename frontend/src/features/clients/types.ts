export type ClientStatus = 'active' | 'inactive' | 'lead';
export type AddressType = 'billing' | 'office';
export type CommunicationType = 'call' | 'email' | 'meeting' | 'note';

export interface ClientContact {
  id: number;
  client_id: number;
  name: string;
  designation?: string | null;
  email: string;
  phone?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientAddress {
  id: number;
  client_id: number;
  type: AddressType;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCommunication {
  id: number;
  client_id: number;
  type: CommunicationType;
  summary: string;
  date: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  client_code: string;
  company_name: string;
  industry?: string | null;
  website?: string | null;
  gstin?: string | null;
  status: ClientStatus;
  notes?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ClientWithDetails extends Client {
  contacts: ClientContact[];
  addresses: ClientAddress[];
  communications: ClientCommunication[];
  projects_count?: number;
}
