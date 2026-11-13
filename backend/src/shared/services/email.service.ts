import nodemailer, { Transporter } from 'nodemailer';
import db from '../../db/knex';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  eventKey?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  /**
   * Queue email to email_outbox table with deduplication support via event_key
   */
  public async queueEmail(options: SendMailOptions): Promise<{ id?: number; queued: boolean; reason?: string }> {
    try {
      if (options.eventKey) {
        const existing = await db('email_outbox').where({ event_key: options.eventKey }).first();
        if (existing) {
          return { queued: false, reason: 'Duplicate event_key' };
        }
      }

      const [id] = await db('email_outbox').insert({
        to: options.to,
        subject: options.subject,
        html: options.html,
        status: 'pending',
        attempts: 0,
        event_key: options.eventKey || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Trigger background outbox dispatch asynchronously without blocking caller
      if (this.isConfigured && process.env.NODE_ENV !== 'test') {
        this.processOutbox().catch((err) => {
          console.error('[EMAIL_ASYNC_DISPATCH_ERROR]', err);
        });
      }

      return { id: Number(id), queued: true };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        return { queued: false, reason: 'Duplicate event_key' };
      }
      console.error('[EMAIL_QUEUE_ERROR]', err);
      throw err;
    }
  }

  /**
   * Sends email directly via transporter, or fallback console logging
   */
  public async sendEmailDirectly(to: string, subject: string, html: string): Promise<boolean> {
    if (this.isConfigured && this.transporter) {
      const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@qynova-erp.com';
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      return true;
    } else {
      // Fallback console logging when SMTP not configured (e.g. local dev / test)
      console.log(`[EMAIL_DEV_FALLBACK] To: ${to} | Subject: ${subject}`);
      return true;
    }
  }

  /**
   * Dispatches invoice notification email to client via email outbox
   */
  public async sendInvoiceEmail(invoice: {
    id: number;
    invoice_number: string;
    client_name?: string | null;
    client_email?: string | null;
    total: number;
    balance_due: number;
    due_date: string;
  }): Promise<{ queued: boolean; reason?: string }> {
    if (!invoice.client_email) {
      return { queued: false, reason: 'Client has no email address' };
    }

    const companySettings = await db('company_settings').where({ id: 1 }).first();
    const companyName = companySettings?.company_name || 'Qynova Technologies';

    const subject = `Invoice ${invoice.invoice_number} from ${companyName}`;
    const formattedTotal = Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const formattedBalance = Number(invoice.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px;">
        <h2 style="color: #0f172a;">Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.client_name || 'Valued Client'},</p>
        <p>Your invoice <strong>${invoice.invoice_number}</strong> from <strong>${companyName}</strong> has been generated and dispatched.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 40%;">Invoice Number:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Total Amount:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">₹${formattedTotal}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Balance Due:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #b91c1c; font-weight: bold;">₹${formattedBalance}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Payment Due Date:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.due_date}</td>
          </tr>
        </table>
        <p>Please ensure payment is remitted on or before the due date.</p>
        <p>Thank you for partnering with us!</p>
        <p>Best regards,<br/><strong>${companyName} Finance Operations</strong></p>
      </div>
    `;

    return this.queueEmail({
      to: invoice.client_email,
      subject,
      html,
      eventKey: `invoice-sent-${invoice.id}`,
    });
  }

  /**
   * Worker to process pending outbox emails with retry logic (max 3 attempts)
   */
  public async processOutbox(limit: number = 20): Promise<{ processed: number; sent: number; failed: number }> {
    const pendingEmails = await db('email_outbox')
      .where('status', 'pending')
      .where('attempts', '<', 3)
      .orderBy('id', 'asc')
      .limit(limit);

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        await this.sendEmailDirectly(email.to, email.subject, email.html);

        await db('email_outbox')
          .where({ id: email.id })
          .update({
            status: 'sent',
            attempts: email.attempts + 1,
            last_error: null,
            updated_at: db.fn.now(),
          });
        sent++;
      } catch (error: any) {
        const attempts = email.attempts + 1;
        const status = attempts >= 3 ? 'failed' : 'pending';

        await db('email_outbox')
          .where({ id: email.id })
          .update({
            status,
            attempts,
            last_error: error?.message || String(error),
            updated_at: db.fn.now(),
          });
        failed++;
      }
    }

    return { processed: pendingEmails.length, sent, failed };
  }
}

export const emailService = new EmailService();
export default emailService;
