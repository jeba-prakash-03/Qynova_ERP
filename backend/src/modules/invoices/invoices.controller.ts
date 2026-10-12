import { Request, Response } from 'express';
import { invoicesService } from './invoices.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { InvoiceQueryParams } from './invoices.types';

export class InvoicesController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const params: InvoiceQueryParams = {
      client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
      project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
      status: req.query.status as any,
      due_before: req.query.due_before as string,
      due_after: req.query.due_after as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const result = await invoicesService.getInvoices(params);
    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: params.page || 1,
      limit: params.limit || 50,
      totalPages: Math.ceil(result.total / (params.limit || 50)),
    });
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const invoice = await invoicesService.getInvoiceById(id);
    return sendSuccess(res, invoice);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const created = await invoicesService.createInvoice(req.body, req.user?.userId, ip);
    return sendCreated(res, created, 'Invoice generated successfully');
  });

  public createFromMilestone = asyncHandler(async (req: Request, res: Response) => {
    const milestoneId = Number(req.params.milestoneId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const created = await invoicesService.createFromMilestone(milestoneId, req.user?.userId, ip);
    return sendCreated(res, created, `Invoice generated from milestone: ${created.invoice_number}`);
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await invoicesService.updateInvoice(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, updated, 200, undefined, 'Invoice updated successfully');
  });

  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await invoicesService.updateStatus(id, req.body.status, req.user?.userId, ip);
    return sendSuccess(res, updated, 200, undefined, `Invoice status updated to ${updated.status}`);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await invoicesService.deleteInvoice(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Invoice deleted successfully');
  });

  public recordPayment = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const result = await invoicesService.recordPayment(id, req.body, req.user?.userId, ip);
    return sendCreated(
      res,
      result,
      `Payment of ₹${result.payment.amount} recorded successfully. Invoice status: ${result.invoice.status}`
    );
  });

  public getPayments = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const payments = await invoicesService.getPayments(id);
    return sendSuccess(res, payments);
  });

  public getPdf = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const pdfBuffer = await invoicesService.generatePdf(id);
    const invoice = await invoicesService.getInvoiceById(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  });
}

export const invoicesController = new InvoicesController();
