import cron from 'node-cron';
import db from '../../db/knex';
import { invoicesRepository } from './invoices.repository';
import { notificationService } from '../../shared/services/notification.service';

export const checkOverdueInvoices = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const overdueInvoices = await invoicesRepository.findOverdueInvoices(today);

  for (const inv of overdueInvoices) {
    await db('invoices').where({ id: inv.id }).update({ status: 'overdue' });

    // Find admin and billing users to notify
    const admins = await db('users as u')
      .join('user_roles as ur', 'u.id', 'ur.user_id')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('r.name', 'Admin')
      .select('u.id');

    for (const admin of admins) {
      await notificationService.notify({
        userIds: admin.id,
        title: `Invoice ${inv.invoice_number} is Overdue`,
        message: `Invoice ${inv.invoice_number} for client ${inv.client_id} was due on ${inv.due_date} and is now overdue. Total: ₹${inv.total}, Pending: ₹${inv.total - inv.amount_paid}.`,
        type: 'warning',
        eventKey: `invoice-overdue-${inv.id}-${today}`,
      });
    }
  }

  return overdueInvoices.length;
};

// Daily cron job at 09:00 AM Asia/Kolkata
export const initInvoicesCron = () => {
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const count = await checkOverdueInvoices();
        if (count > 0) {
          console.log(`[INVOICE_CRON] Marked ${count} invoices as overdue.`);
        }
      } catch (err) {
        console.error('[INVOICE_CRON_ERROR]', err);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );
};
