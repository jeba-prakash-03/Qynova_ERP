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

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
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
      const from = process.env.SMTP_FROM || 'no-reply@qynova-erp.com';
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
