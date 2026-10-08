import { Request, Response } from 'express';
import { clientsService } from './clients.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';

export class ClientsController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const queryParams: any = req.query;
    const { clients, total } = await clientsService.getClients(queryParams);
    const limit = Number(queryParams.limit) || 20;
    const page = Number(queryParams.page) || 1;

    return sendSuccess(res, clients, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const client = await clientsService.getClientById(id);
    return sendSuccess(res, client, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const client = await clientsService.createClient(req.body, req.user?.userId, ip);
    return sendCreated(res, client, `Client ${client.client_code} created successfully`);
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const client = await clientsService.updateClient(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, client, 200, undefined, 'Client updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await clientsService.deleteClient(id, req.user?.userId, ip);
    return sendSuccess(res, { id }, 200, undefined, 'Client deleted successfully');
  });

  // Contacts
  public addContact = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const contact = await clientsService.addContact(clientId, req.body, req.user?.userId, ip);
    return sendCreated(res, contact, 'Contact added successfully');
  });

  public updateContact = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const contactId = Number(req.params.contactId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const contact = await clientsService.updateContact(
      clientId,
      contactId,
      req.body,
      req.user?.userId,
      ip
    );
    return sendSuccess(res, contact, 200, undefined, 'Contact updated successfully');
  });

  public deleteContact = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const contactId = Number(req.params.contactId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await clientsService.deleteContact(clientId, contactId, req.user?.userId, ip);
    return sendSuccess(res, { contactId }, 200, undefined, 'Contact deleted successfully');
  });

  // Addresses
  public addAddress = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const address = await clientsService.addAddress(clientId, req.body, req.user?.userId, ip);
    return sendCreated(res, address, 'Address added successfully');
  });

  public updateAddress = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const addressId = Number(req.params.addressId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const address = await clientsService.updateAddress(
      clientId,
      addressId,
      req.body,
      req.user?.userId,
      ip
    );
    return sendSuccess(res, address, 200, undefined, 'Address updated successfully');
  });

  public deleteAddress = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const addressId = Number(req.params.addressId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await clientsService.deleteAddress(clientId, addressId, req.user?.userId, ip);
    return sendSuccess(res, { addressId }, 200, undefined, 'Address deleted successfully');
  });

  // Communications
  public addCommunication = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const comm = await clientsService.addCommunication(
      clientId,
      req.body,
      req.user!.userId,
      ip
    );
    return sendCreated(res, comm, 'Communication logged successfully');
  });

  public deleteCommunication = asyncHandler(async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);
    const commId = Number(req.params.commId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await clientsService.deleteCommunication(clientId, commId, req.user?.userId, ip);
    return sendSuccess(res, { commId }, 200, undefined, 'Communication removed successfully');
  });
}

export const clientsController = new ClientsController();
