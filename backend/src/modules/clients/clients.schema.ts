import { z } from 'zod';

export const clientStatusEnum = z.enum(['active', 'inactive', 'lead']);
export const addressTypeEnum = z.enum(['billing', 'office']);
export const communicationTypeEnum = z.enum(['call', 'email', 'meeting', 'note']);

export const clientIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Client ID must be a numeric integer'),
});

export const contactIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Client ID must be a numeric integer'),
  contactId: z.string().regex(/^\d+$/, 'Contact ID must be a numeric integer'),
});

export const addressIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Client ID must be a numeric integer'),
  addressId: z.string().regex(/^\d+$/, 'Address ID must be a numeric integer'),
});

export const commIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Client ID must be a numeric integer'),
  commId: z.string().regex(/^\d+$/, 'Communication ID must be a numeric integer'),
});

export const createContactSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters').max(255),
  designation: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional().nullable(),
  is_primary: z.boolean().default(false),
});

export const updateContactSchema = createContactSchema.partial();

export const createAddressSchema = z.object({
  type: addressTypeEnum.default('office'),
  line1: z.string().min(3, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  pincode: z.string().min(3, 'Pincode is required').max(20),
  country: z.string().min(2, 'Country is required').max(100).default('India'),
});

export const updateAddressSchema = createAddressSchema.partial();

export const createCommunicationSchema = z.object({
  type: communicationTypeEnum,
  summary: z.string().min(3, 'Summary is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const createClientSchema = z.object({
  company_name: z.string().min(2, 'Company name is required').max(255),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Invalid website URL').or(z.string().length(0)).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  status: clientStatusEnum.default('active'),
  notes: z.string().optional().nullable(),
  contacts: z.array(createContactSchema).optional(),
  addresses: z.array(createAddressSchema).optional(),
});

export const updateClientSchema = z.object({
  company_name: z.string().min(2, 'Company name is required').max(255).optional(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Invalid website URL').or(z.string().length(0)).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  status: clientStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

export const clientQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: clientStatusEnum.optional(),
  industry: z.string().optional(),
  sort: z.enum(['company_name', 'client_code', 'created_at', 'status', 'industry']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
