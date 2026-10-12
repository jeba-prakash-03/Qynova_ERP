import PDFDocument from 'pdfkit';
import { invoicesRepository } from './invoices.repository';
import {
  Invoice,
  Payment,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryParams,
  RecordPaymentInput,
} from './invoices.types';
import db from '../../db/knex';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';

export class InvoicesService {
  private calculateTotals(items: { quantity: number; unit_price: number }[], taxPercent: number = 18.0) {
    const subtotal = items.reduce(
      (sum, item) => sum + Number((item.quantity * item.unit_price).toFixed(2)),
      0
    );
    const taxAmount = Number(((subtotal * taxPercent) / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    return {
      subtotal,
      tax_amount: taxAmount,
      total,
    };
  }

  public async getInvoices(params: InvoiceQueryParams): Promise<{ data: Invoice[]; total: number }> {
    return invoicesRepository.findAll(params);
  }

  public async getInvoiceById(id: number): Promise<Invoice> {
    const invoice = await invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  public async createInvoice(data: CreateInvoiceInput, userId?: number, ip?: string): Promise<Invoice> {
    // Verify client exists
    const client = await db('clients').where({ id: data.client_id }).whereNull('deleted_at').first();
    if (!client) {
      throw new BadRequestError('Referenced client does not exist or was deleted', [
        { field: 'client_id', message: 'Valid client is required' },
      ]);
    }

    if (data.project_id) {
      const project = await db('projects').where({ id: data.project_id }).whereNull('deleted_at').first();
      if (!project) {
        throw new BadRequestError('Referenced project does not exist', [
          { field: 'project_id', message: 'Project not found' },
        ]);
      }
    }

    const taxPercent = data.tax_percent !== undefined ? data.tax_percent : 18.0;
    const totals = this.calculateTotals(data.items, taxPercent);
    const invoiceNumber = await invoicesRepository.generateInvoiceNumber();

    const created = await invoicesRepository.create(data, totals, invoiceNumber, userId);

    await auditService.record({
      userId,
      action: 'invoices.create',
      entity: 'invoices',
      entityId: created.id,
      newValue: {
        invoice_number: created.invoice_number,
        total: created.total,
        client_id: created.client_id,
        status: created.status,
      },
      ip,
    });

    return created;
  }

  public async createFromMilestone(milestoneId: number, userId?: number, ip?: string): Promise<Invoice> {
    const milestone = await db('project_milestones as m')
      .join('projects as p', 'm.project_id', 'p.id')
      .where('m.id', milestoneId)
      .whereNull('p.deleted_at')
      .select('m.*', 'p.client_id', 'p.name as project_name')
      .first();

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== 'completed') {
      throw new BadRequestError('Invoices can only be pre-filled from completed milestones', [
        { field: 'milestone_id', message: `Milestone status is '${milestone.status}', must be 'completed'` },
      ]);
    }

    // Check if an invoice is already created for this milestone
    const existing = await db('invoices').where({ milestone_id: milestoneId }).first();
    if (existing) {
      throw new BadRequestError('An invoice has already been created for this milestone', [
        { field: 'milestone_id', message: `Invoice ${existing.invoice_number} already references this milestone` },
      ]);
    }

    const today = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 15);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const amount = Number(milestone.amount);
    const createData: CreateInvoiceInput = {
      client_id: Number(milestone.client_id),
      project_id: Number(milestone.project_id),
      milestone_id: milestoneId,
      issue_date: today,
      due_date: dueDate,
      tax_percent: 18.0,
      notes: `Invoice generated automatically from completed Milestone: ${milestone.title}`,
      terms: 'Payment due within 15 calendar days from date of invoice.',
      items: [
        {
          description: `Deliverable: ${milestone.title}`,
          quantity: 1,
          unit_price: amount,
        },
      ],
    };

    return this.createInvoice(createData, userId, ip);
  }

  public async updateInvoice(
    id: number,
    data: UpdateInvoiceInput,
    userId?: number,
    ip?: string
  ): Promise<Invoice> {
    const existing = await invoicesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Invoice with ID ${id} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestError(`Cannot edit invoice in status '${existing.status}'`, [
        { field: 'status', message: 'Only draft invoices can be edited' },
      ]);
    }

    const taxPercent = data.tax_percent !== undefined ? data.tax_percent : existing.tax_percent;
    const items = data.items || existing.items || [];
    const totals = this.calculateTotals(items, taxPercent);

    const updated = await invoicesRepository.update(id, data, totals);

    await auditService.record({
      userId,
      action: 'invoices.update',
      entity: 'invoices',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      ip,
    });

    return updated;
  }

  public async updateStatus(id: number, status: string, userId?: number, ip?: string): Promise<Invoice> {
    const existing = await invoicesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Invoice with ID ${id} not found`);
    }

    await invoicesRepository.updateStatus(id, status);
    const updated = (await invoicesRepository.findById(id))!;

    await auditService.record({
      userId,
      action: 'invoices.status_change',
      entity: 'invoices',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      ip,
    });

    if (status === 'sent') {
      // TODO: Call Dev A's email outbox service when implemented (e.g. emailService.sendInvoiceEmail(invoice))
    }

    return updated;
  }

  public async recordPayment(
    invoiceId: number,
    data: RecordPaymentInput,
    userId?: number,
    ip?: string
  ): Promise<{ payment: Payment; invoice: Invoice }> {
    const payment = await db.transaction(async (trx) => {
      // Fetch invoice row with row-level lock
      const invoiceRow = await trx('invoices').where({ id: invoiceId }).forUpdate().first();
      if (!invoiceRow) {
        throw new NotFoundError(`Invoice with ID ${invoiceId} not found`);
      }

      if (invoiceRow.status === 'paid') {
        throw new BadRequestError('Invoice is already fully paid', [
          { field: 'amount', message: 'Invoice has zero balance due' },
        ]);
      }

      if (invoiceRow.status === 'cancelled') {
        throw new BadRequestError('Cannot record payment for a cancelled invoice', [
          { field: 'status', message: 'Invoice is cancelled' },
        ]);
      }

      const total = Number(invoiceRow.total);
      const currentPaid = Number(invoiceRow.amount_paid);
      const remainingBalance = Number((total - currentPaid).toFixed(2));

      // Overpayment check
      if (data.amount > remainingBalance) {
        throw new BadRequestError(
          `Payment amount ₹${data.amount} exceeds remaining balance due of ₹${remainingBalance}`,
          [
            {
              field: 'amount',
              message: `Payment exceeds balance due of ₹${remainingBalance}`,
            },
          ]
        );
      }

      const newAmountPaid = Number((currentPaid + data.amount).toFixed(2));
      const newStatus = newAmountPaid >= total ? 'paid' : 'partially_paid';

      const paymentNumber = await invoicesRepository.generatePaymentNumber(trx);

      const payment = await invoicesRepository.recordPayment(
        data,
        paymentNumber,
        invoiceId,
        userId,
        newAmountPaid,
        newStatus,
        trx
      );

      await auditService.record({
        userId,
        action: 'payments.create',
        entity: 'payments',
        entityId: payment.id,
        newValue: {
          payment_number: payment.payment_number,
          invoice_id: invoiceId,
          amount: payment.amount,
          invoice_new_status: newStatus,
        },
        ip,
      });

      return payment;
    });

    const updatedInvoice = await this.getInvoiceById(invoiceId);
    return { payment, invoice: updatedInvoice };
  }

  public async getPayments(invoiceId: number): Promise<Payment[]> {
    return invoicesRepository.findPaymentsByInvoiceId(invoiceId);
  }

  public async deleteInvoice(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await invoicesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Invoice with ID ${id} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestError('Only draft invoices can be deleted', [
        { field: 'status', message: 'Cannot delete invoice that has been issued or paid' },
      ]);
    }

    await invoicesRepository.delete(id);

    await auditService.record({
      userId,
      action: 'invoices.delete',
      entity: 'invoices',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }

  public async generatePdf(invoiceId: number): Promise<Buffer> {
    const invoice = await this.getInvoiceById(invoiceId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Brand
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#4338CA')
        .text('QYNOVA TECHNOLOGIES', 40, 40);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Enterprise Cloud & Banking Solutions Private Limited', 40, 68)
        .text('Tech Park, Guindy, Chennai, Tamil Nadu - 600032', 40, 80)
        .text('GSTIN: 33AAACQ1234F1Z5 | finance@qynova.erp', 40, 92);

      // Invoice Header Box
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('TAX INVOICE', 380, 40, { align: 'right' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Invoice Number: ${invoice.invoice_number}`, 380, 65, { align: 'right' })
        .text(`Issue Date: ${invoice.issue_date}`, 380, 78, { align: 'right' })
        .text(`Due Date: ${invoice.due_date}`, 380, 91, { align: 'right' })
        .text(`Status: ${invoice.status.toUpperCase()}`, 380, 104, { align: 'right' });

      // Horizontal Divider
      doc.moveTo(40, 125).lineTo(570, 125).strokeColor('#E2E8F0').stroke();

      // Billed To & Project info
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155').text('BILLED TO:', 40, 140);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#1E293B')
        .text(invoice.client_company || 'Client', 40, 155)
        .text(invoice.client_email ? `Email: ${invoice.client_email}` : '', 40, 168)
        .text(invoice.client_gstin ? `GSTIN: ${invoice.client_gstin}` : '', 40, 181);

      if (invoice.project_name) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155').text('PROJECT DETAILS:', 340, 140);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#1E293B')
          .text(`${invoice.project_code || 'PRJ'} - ${invoice.project_name}`, 340, 155);
        if (invoice.milestone_title) {
          doc.text(`Milestone: ${invoice.milestone_title}`, 340, 168);
        }
      }

      // Line items table
      const tableTop = 210;
      doc.rect(40, tableTop, 530, 22).fillColor('#F8FAFC').fill();
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('DESCRIPTION', 50, tableTop + 6)
        .text('QTY', 340, tableTop + 6, { width: 40, align: 'right' })
        .text('UNIT RATE (INR)', 390, tableTop + 6, { width: 80, align: 'right' })
        .text('AMOUNT (INR)', 480, tableTop + 6, { width: 80, align: 'right' });

      let currentY = tableTop + 28;
      const items = invoice.items || [];

      items.forEach((item) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#1E293B')
          .text(item.description, 50, currentY, { width: 280 })
          .text(String(item.quantity), 340, currentY, { width: 40, align: 'right' })
          .text(Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 390, currentY, {
            width: 80,
            align: 'right',
          })
          .text(Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 480, currentY, {
            width: 80,
            align: 'right',
          });

        currentY += 24;
      });

      doc.moveTo(40, currentY).lineTo(570, currentY).strokeColor('#E2E8F0').stroke();
      currentY += 15;

      // Totals Summary Box
      const summaryX = 350;
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal:', summaryX, currentY)
        .text(`₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY, {
          align: 'right',
          width: 90,
        });

      currentY += 16;
      doc
        .text(`GST (${invoice.tax_percent}%):`, summaryX, currentY)
        .text(`₹${invoice.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY, {
          align: 'right',
          width: 90,
        });

      currentY += 18;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('Total Amount:', summaryX, currentY)
        .text(`₹${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY, {
          align: 'right',
          width: 90,
        });

      currentY += 18;
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#059669')
        .text('Amount Paid:', summaryX, currentY)
        .text(`₹${invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY, {
          align: 'right',
          width: 90,
        });

      currentY += 16;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(invoice.balance_due > 0 ? '#DC2626' : '#059669')
        .text('Balance Due:', summaryX, currentY)
        .text(`₹${invoice.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, currentY, {
          align: 'right',
          width: 90,
        });

      // Notes & Payment terms
      if (invoice.notes || invoice.terms) {
        currentY = Math.max(currentY + 30, 480);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B').text('TERMS & CONDITIONS', 40, currentY);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#475569')
          .text(invoice.terms || 'Payment due as specified. Late payments subject to interest.', 40, currentY + 12);
        if (invoice.notes) {
          doc.text(`Notes: ${invoice.notes}`, 40, currentY + 26);
        }
      }

      // Footer
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('This is a computer-generated tax invoice and requires no physical signature.', 40, 750, {
          align: 'center',
          width: 530,
        });

      doc.end();
    });
  }
}

export const invoicesService = new InvoicesService();
