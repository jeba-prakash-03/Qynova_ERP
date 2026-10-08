import { Knex } from 'knex';
import { db } from '../../db/knex';
import {
  Client,
  ClientContact,
  ClientAddress,
  ClientCommunication,
  ClientWithDetails,
  ClientQueryParams,
} from './clients.types';
import {
  CreateClientInput,
  UpdateClientInput,
  CreateContactInput,
  UpdateContactInput,
  CreateAddressInput,
  UpdateAddressInput,
  CreateCommunicationInput,
} from './clients.schema';

export class ClientsRepository {
  private knex: Knex;

  constructor(knexInstance: Knex = db) {
    this.knex = knexInstance;
  }

  public async getNextClientCode(): Promise<string> {
    const lastClient = await this.knex('clients')
      .select('client_code')
      .where('client_code', 'like', 'CL-%')
      .orderBy('id', 'desc')
      .first();

    if (!lastClient || !lastClient.client_code) {
      return 'CL-0001';
    }

    const matches = lastClient.client_code.match(/CL-(\d+)/);
    if (!matches) {
      return 'CL-0001';
    }

    const nextNum = parseInt(matches[1], 10) + 1;
    return `CL-${String(nextNum).padStart(4, '0')}`;
  }

  public async findMany(params: ClientQueryParams): Promise<{ clients: any[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      industry,
      sort = 'created_at',
      order = 'desc',
    } = params;

    const offset = (Number(page) - 1) * Number(limit);

    let query = this.knex('clients')
      .whereNull('clients.deleted_at')
      .leftJoin('client_contacts', function () {
        this.on('clients.id', '=', 'client_contacts.client_id').andOn(
          'client_contacts.is_primary',
          '=',
          db.raw('?', [true])
        );
      })
      .select(
        'clients.*',
        'client_contacts.name as primary_contact_name',
        'client_contacts.email as primary_contact_email',
        'client_contacts.phone as primary_contact_phone'
      );

    let countQuery = this.knex('clients').whereNull('deleted_at');

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      const searchClause = (qb: Knex.QueryBuilder) => {
        qb.whereRaw('LOWER(company_name) LIKE ?', [term])
          .orWhereRaw('LOWER(client_code) LIKE ?', [term])
          .orWhereRaw('LOWER(gstin) LIKE ?', [term])
          .orWhereRaw('LOWER(industry) LIKE ?', [term]);
      };
      query = query.where(searchClause);
      countQuery = countQuery.where(searchClause);
    }

    if (status) {
      query = query.where('clients.status', status);
      countQuery = countQuery.where('status', status);
    }

    if (industry) {
      query = query.where('clients.industry', industry);
      countQuery = countQuery.where('industry', industry);
    }

    const [{ total }] = await countQuery.count({ total: '*' });

    const clients = await query
      .orderBy(`clients.${sort}`, order)
      .limit(Number(limit))
      .offset(offset);

    return { clients, total: Number(total) };
  }

  public async findById(id: number): Promise<ClientWithDetails | null> {
    const client = await this.knex('clients')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!client) return null;

    const [contacts, addresses, communications, projectsCountResult] = await Promise.all([
      this.knex('client_contacts')
        .where({ client_id: id })
        .orderBy('is_primary', 'desc')
        .orderBy('created_at', 'asc'),
      this.knex('client_addresses')
        .where({ client_id: id })
        .orderBy('type', 'asc'),
      this.knex('client_communications')
        .leftJoin('users', 'client_communications.created_by', 'users.id')
        .leftJoin('employees', 'users.id', 'employees.user_id')
        .where({ 'client_communications.client_id': id })
        .select(
          'client_communications.*',
          this.knex.raw(
            "COALESCE(CONCAT(employees.first_name, ' ', employees.last_name), users.email) as creator_name"
          )
        )
        .orderBy('client_communications.date', 'desc')
        .orderBy('client_communications.created_at', 'desc'),
      this.knex('projects')
        .where({ client_id: id })
        .whereNull('deleted_at')
        .count({ count: '*' })
        .first(),
    ]);

    return {
      ...client,
      contacts,
      addresses,
      communications,
      projects_count: Number(projectsCountResult?.count || 0),
    };
  }

  public async create(data: CreateClientInput): Promise<ClientWithDetails> {
    return this.knex.transaction(async (trx) => {
      const client_code = await this.getNextClientCode();
      const { contacts, addresses, ...clientDetails } = data;

      const [clientId] = await trx('clients').insert({
        client_code,
        company_name: clientDetails.company_name,
        industry: clientDetails.industry || null,
        website: clientDetails.website || null,
        gstin: clientDetails.gstin || null,
        status: clientDetails.status || 'active',
        notes: clientDetails.notes || null,
      });

      if (contacts && contacts.length > 0) {
        const contactInserts = contacts.map((c, index) => ({
          client_id: clientId,
          name: c.name,
          designation: c.designation || null,
          email: c.email,
          phone: c.phone || null,
          is_primary: c.is_primary ?? index === 0,
        }));
        await trx('client_contacts').insert(contactInserts);
      }

      if (addresses && addresses.length > 0) {
        const addressInserts = addresses.map((a) => ({
          client_id: clientId,
          type: a.type,
          line1: a.line1,
          line2: a.line2 || null,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          country: a.country || 'India',
        }));
        await trx('client_addresses').insert(addressInserts);
      }

      const created = await trx('clients').where({ id: clientId }).first();
      const createdContacts = await trx('client_contacts').where({ client_id: clientId });
      const createdAddresses = await trx('client_addresses').where({ client_id: clientId });

      return {
        ...created,
        contacts: createdContacts,
        addresses: createdAddresses,
        communications: [],
        projects_count: 0,
      };
    });
  }

  public async update(id: number, data: UpdateClientInput): Promise<Client | null> {
    await this.knex('clients')
      .where({ id })
      .whereNull('deleted_at')
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });

    return this.knex('clients').where({ id }).first();
  }

  public async softDelete(id: number): Promise<boolean> {
    const updated = await this.knex('clients')
      .where({ id })
      .whereNull('deleted_at')
      .update({
        deleted_at: this.knex.fn.now(),
      });
    return updated > 0;
  }

  // Contact Operations
  public async addContact(clientId: number, data: CreateContactInput): Promise<ClientContact> {
    return this.knex.transaction(async (trx) => {
      if (data.is_primary) {
        await trx('client_contacts')
          .where({ client_id: clientId })
          .update({ is_primary: false });
      }

      const [id] = await trx('client_contacts').insert({
        client_id: clientId,
        name: data.name,
        designation: data.designation || null,
        email: data.email,
        phone: data.phone || null,
        is_primary: data.is_primary || false,
      });

      return trx('client_contacts').where({ id }).first();
    });
  }

  public async updateContact(contactId: number, data: UpdateContactInput): Promise<ClientContact | null> {
    return this.knex.transaction(async (trx) => {
      const contact = await trx('client_contacts').where({ id: contactId }).first();
      if (!contact) return null;

      if (data.is_primary) {
        await trx('client_contacts')
          .where({ client_id: contact.client_id })
          .update({ is_primary: false });
      }

      await trx('client_contacts').where({ id: contactId }).update({
        ...data,
        updated_at: trx.fn.now(),
      });

      return trx('client_contacts').where({ id: contactId }).first();
    });
  }

  public async deleteContact(contactId: number): Promise<boolean> {
    const count = await this.knex('client_contacts').where({ id: contactId }).delete();
    return count > 0;
  }

  public async findContactById(contactId: number): Promise<ClientContact | null> {
    return this.knex('client_contacts').where({ id: contactId }).first();
  }

  // Address Operations
  public async addAddress(clientId: number, data: CreateAddressInput): Promise<ClientAddress> {
    const [id] = await this.knex('client_addresses').insert({
      client_id: clientId,
      type: data.type,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country || 'India',
    });

    return this.knex('client_addresses').where({ id }).first();
  }

  public async updateAddress(addressId: number, data: UpdateAddressInput): Promise<ClientAddress | null> {
    await this.knex('client_addresses').where({ id: addressId }).update({
      ...data,
      updated_at: this.knex.fn.now(),
    });

    return this.knex('client_addresses').where({ id: addressId }).first();
  }

  public async deleteAddress(addressId: number): Promise<boolean> {
    const count = await this.knex('client_addresses').where({ id: addressId }).delete();
    return count > 0;
  }

  public async findAddressById(addressId: number): Promise<ClientAddress | null> {
    return this.knex('client_addresses').where({ id: addressId }).first();
  }

  // Communication Operations
  public async addCommunication(
    clientId: number,
    data: CreateCommunicationInput,
    userId: number
  ): Promise<ClientCommunication> {
    const [id] = await this.knex('client_communications').insert({
      client_id: clientId,
      type: data.type,
      summary: data.summary,
      date: data.date,
      created_by: userId,
    });

    return this.knex('client_communications')
      .leftJoin('users', 'client_communications.created_by', 'users.id')
      .leftJoin('employees', 'users.id', 'employees.user_id')
      .where({ 'client_communications.id': id })
      .select(
        'client_communications.*',
        this.knex.raw(
          "COALESCE(CONCAT(employees.first_name, ' ', employees.last_name), users.email) as creator_name"
        )
      )
      .first();
  }

  public async deleteCommunication(commId: number): Promise<boolean> {
    const count = await this.knex('client_communications').where({ id: commId }).delete();
    return count > 0;
  }

  public async findCommunicationById(commId: number): Promise<ClientCommunication | null> {
    return this.knex('client_communications').where({ id: commId }).first();
  }
}

export const clientsRepository = new ClientsRepository();
