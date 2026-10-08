import { Router } from 'express';
import { clientsController } from './clients.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  clientIdParamSchema,
  contactIdParamSchema,
  addressIdParamSchema,
  commIdParamSchema,
  clientQuerySchema,
  createClientSchema,
  updateClientSchema,
  createContactSchema,
  updateContactSchema,
  createAddressSchema,
  updateAddressSchema,
  createCommunicationSchema,
} from './clients.schema';

const router = Router();

router.use(authenticate);

// List Clients
router.get(
  '/',
  requirePermission('clients.view'),
  validate({ query: clientQuerySchema }),
  clientsController.getAll
);

// Get Client Details
router.get(
  '/:id',
  requirePermission('clients.view'),
  validate({ params: clientIdParamSchema }),
  clientsController.getById
);

// Create Client
router.post(
  '/',
  requirePermission('clients.create'),
  validate({ body: createClientSchema }),
  clientsController.create
);

// Update Client
router.put(
  '/:id',
  requirePermission('clients.edit'),
  validate({ params: clientIdParamSchema, body: updateClientSchema }),
  clientsController.update
);

// Delete (Soft) Client
router.delete(
  '/:id',
  requirePermission('clients.delete'),
  validate({ params: clientIdParamSchema }),
  clientsController.delete
);

// --- Contacts ---
router.post(
  '/:id/contacts',
  requirePermission('clients.edit'),
  validate({ params: clientIdParamSchema, body: createContactSchema }),
  clientsController.addContact
);

router.put(
  '/:id/contacts/:contactId',
  requirePermission('clients.edit'),
  validate({ params: contactIdParamSchema, body: updateContactSchema }),
  clientsController.updateContact
);

router.delete(
  '/:id/contacts/:contactId',
  requirePermission('clients.edit'),
  validate({ params: contactIdParamSchema }),
  clientsController.deleteContact
);

// --- Addresses ---
router.post(
  '/:id/addresses',
  requirePermission('clients.edit'),
  validate({ params: clientIdParamSchema, body: createAddressSchema }),
  clientsController.addAddress
);

router.put(
  '/:id/addresses/:addressId',
  requirePermission('clients.edit'),
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  clientsController.updateAddress
);

router.delete(
  '/:id/addresses/:addressId',
  requirePermission('clients.edit'),
  validate({ params: addressIdParamSchema }),
  clientsController.deleteAddress
);

// --- Communications ---
router.post(
  '/:id/communications',
  requirePermission('clients.edit'),
  validate({ params: clientIdParamSchema, body: createCommunicationSchema }),
  clientsController.addCommunication
);

router.delete(
  '/:id/communications/:commId',
  requirePermission('clients.edit'),
  validate({ params: commIdParamSchema }),
  clientsController.deleteCommunication
);

export default router;
