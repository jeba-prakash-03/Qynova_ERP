import { clientsRepository } from './clients.repository';
import { auditService } from '../../shared/services/audit.service';
import { NotFoundError } from '../../shared/errors/app-error';
import {
  CreateClientInput,
  UpdateClientInput,
  CreateContactInput,
  UpdateContactInput,
  CreateAddressInput,
  UpdateAddressInput,
  CreateCommunicationInput,
} from './clients.schema';
import { ClientQueryParams } from './clients.types';

export class ClientsService {
  public async getClients(params: ClientQueryParams) {
    return clientsRepository.findMany(params);
  }

  public async getClientById(id: number) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }
    return client;
  }

  public async createClient(data: CreateClientInput, userId?: number, ip?: string) {
    const created = await clientsRepository.create(data);

    await auditService.record({
      userId,
      action: 'clients.create',
      entity: 'clients',
      entityId: created.id,
      newValue: {
        company_name: created.company_name,
        client_code: created.client_code,
        status: created.status,
      },
      ip,
    });

    return created;
  }

  public async updateClient(id: number, data: UpdateClientInput, userId?: number, ip?: string) {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }

    const updated = await clientsRepository.update(id, data);

    await auditService.record({
      userId,
      action: 'clients.edit',
      entity: 'clients',
      entityId: id,
      oldValue: {
        company_name: existing.company_name,
        status: existing.status,
        industry: existing.industry,
      },
      newValue: data,
      ip,
    });

    return updated;
  }

  public async deleteClient(id: number, userId?: number, ip?: string) {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Client with ID ${id} not found`);
    }

    await clientsRepository.softDelete(id);

    await auditService.record({
      userId,
      action: 'clients.delete',
      entity: 'clients',
      entityId: id,
      oldValue: {
        client_code: existing.client_code,
        company_name: existing.company_name,
      },
      ip,
    });

    return true;
  }

  // Contact operations
  public async addContact(clientId: number, data: CreateContactInput, userId?: number, ip?: string) {
    const existing = await clientsRepository.findById(clientId);
    if (!existing) {
      throw new NotFoundError(`Client with ID ${clientId} not found`);
    }

    const contact = await clientsRepository.addContact(clientId, data);

    await auditService.record({
      userId,
      action: 'clients.contact_add',
      entity: 'client_contacts',
      entityId: contact.id,
      newValue: { clientId, name: contact.name, email: contact.email },
      ip,
    });

    return contact;
  }

  public async updateContact(
    clientId: number,
    contactId: number,
    data: UpdateContactInput,
    userId?: number,
    ip?: string
  ) {
    const contact = await clientsRepository.findContactById(contactId);
    if (!contact || contact.client_id !== clientId) {
      throw new NotFoundError(`Contact with ID ${contactId} not found for this client`);
    }

    const updated = await clientsRepository.updateContact(contactId, data);

    await auditService.record({
      userId,
      action: 'clients.contact_edit',
      entity: 'client_contacts',
      entityId: contactId,
      oldValue: contact,
      newValue: data,
      ip,
    });

    return updated;
  }

  public async deleteContact(clientId: number, contactId: number, userId?: number, ip?: string) {
    const contact = await clientsRepository.findContactById(contactId);
    if (!contact || contact.client_id !== clientId) {
      throw new NotFoundError(`Contact with ID ${contactId} not found for this client`);
    }

    await clientsRepository.deleteContact(contactId);

    await auditService.record({
      userId,
      action: 'clients.contact_delete',
      entity: 'client_contacts',
      entityId: contactId,
      oldValue: contact,
      ip,
    });

    return true;
  }

  // Address operations
  public async addAddress(clientId: number, data: CreateAddressInput, userId?: number, ip?: string) {
    const existing = await clientsRepository.findById(clientId);
    if (!existing) {
      throw new NotFoundError(`Client with ID ${clientId} not found`);
    }

    const address = await clientsRepository.addAddress(clientId, data);

    await auditService.record({
      userId,
      action: 'clients.address_add',
      entity: 'client_addresses',
      entityId: address.id,
      newValue: { clientId, type: address.type, city: address.city },
      ip,
    });

    return address;
  }

  public async updateAddress(
    clientId: number,
    addressId: number,
    data: UpdateAddressInput,
    userId?: number,
    ip?: string
  ) {
    const address = await clientsRepository.findAddressById(addressId);
    if (!address || address.client_id !== clientId) {
      throw new NotFoundError(`Address with ID ${addressId} not found for this client`);
    }

    const updated = await clientsRepository.updateAddress(addressId, data);

    await auditService.record({
      userId,
      action: 'clients.address_edit',
      entity: 'client_addresses',
      entityId: addressId,
      oldValue: address,
      newValue: data,
      ip,
    });

    return updated;
  }

  public async deleteAddress(clientId: number, addressId: number, userId?: number, ip?: string) {
    const address = await clientsRepository.findAddressById(addressId);
    if (!address || address.client_id !== clientId) {
      throw new NotFoundError(`Address with ID ${addressId} not found for this client`);
    }

    await clientsRepository.deleteAddress(addressId);

    await auditService.record({
      userId,
      action: 'clients.address_delete',
      entity: 'client_addresses',
      entityId: addressId,
      oldValue: address,
      ip,
    });

    return true;
  }

  // Communication operations
  public async addCommunication(
    clientId: number,
    data: CreateCommunicationInput,
    userId: number,
    ip?: string
  ) {
    const existing = await clientsRepository.findById(clientId);
    if (!existing) {
      throw new NotFoundError(`Client with ID ${clientId} not found`);
    }

    const comm = await clientsRepository.addCommunication(clientId, data, userId);

    await auditService.record({
      userId,
      action: 'clients.communication_add',
      entity: 'client_communications',
      entityId: comm.id,
      newValue: { clientId, type: comm.type, date: comm.date },
      ip,
    });

    return comm;
  }

  public async deleteCommunication(clientId: number, commId: number, userId?: number, ip?: string) {
    const comm = await clientsRepository.findCommunicationById(commId);
    if (!comm || comm.client_id !== clientId) {
      throw new NotFoundError(`Communication log with ID ${commId} not found for this client`);
    }

    await clientsRepository.deleteCommunication(commId);

    await auditService.record({
      userId,
      action: 'clients.communication_delete',
      entity: 'client_communications',
      entityId: commId,
      oldValue: comm,
      ip,
    });

    return true;
  }
}

export const clientsService = new ClientsService();
