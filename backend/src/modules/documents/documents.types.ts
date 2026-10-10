export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'resume'
  | 'offer_letter'
  | 'joining_letter'
  | 'experience_letter'
  | 'salary_document'
  | 'certificate'
  | 'other';

export const SENSITIVE_DOCUMENT_TYPES: DocumentType[] = [
  'aadhaar',
  'pan',
  'salary_document',
];

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  type: DocumentType;
  file_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
  is_sensitive?: boolean;
}

export interface UploadDocumentDto {
  type: DocumentType;
}

export interface GenerateOfferLetterDto {
  joining_date?: string;
  designation_name?: string;
  salary_ctc?: string;
}
