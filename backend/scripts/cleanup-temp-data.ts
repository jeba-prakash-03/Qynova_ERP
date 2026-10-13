import dotenv from 'dotenv';
import path from 'path';
import knex from 'knex';
import knexConfig from '../src/db/knexfile';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;
const db = knex(config);

const SYSTEM_ROLES = ['Admin', 'HR', 'Manager', 'Employee', 'Intern'];

export async function runCleanup(isApply = false) {
  const mode = isApply ? 'APPLY MODE (PERFORMING DELETIONS)' : 'DRY RUN MODE (NO DATA MODIFIED)';

  console.log(`\n==================================================`);
  console.log(`=== Qynova ERP Temporary & Unwanted Data Cleanup ===`);
  console.log(`=== ${mode} ===`);
  console.log(`=== Database: ${(config.connection as any)?.database || process.env.DB_NAME} ===`);
  console.log(`==================================================\n`);

  try {
    // 1. Target users (emails matching test.emp.%, candidate.%, %@example.com)
    // NEVER delete Admin user (or users with Admin role)
    const adminRole = await db('roles').where({ name: 'Admin' }).first();
    const adminUserIds = adminRole
      ? (await db('user_roles').where({ role_id: adminRole.id }).select('user_id')).map((r) => r.user_id)
      : [];

    const targetUsers = await db('users')
      .where(function () {
        this.where('email', 'like', 'test.emp.%')
          .orWhere('email', 'like', 'candidate.%')
          .orWhere('email', 'like', '%@example.com');
      })
      .whereNotIn('id', adminUserIds)
      .select('id', 'email');

    const targetUserIds = targetUsers.map((u) => u.id);

    // 2. Target employees (by user_id or direct email match)
    const targetEmployees = await db('employees')
      .where(function () {
        if (targetUserIds.length > 0) {
          this.whereIn('user_id', targetUserIds);
        }
        this.orWhere('email', 'like', 'test.emp.%')
          .orWhere('email', 'like', 'candidate.%')
          .orWhere('email', 'like', '%@example.com');
      })
      .select('id', 'email', 'first_name', 'last_name');

    const targetEmployeeIds = targetEmployees.map((e) => e.id);

    // 3. Non-system roles with zero users (never touch the 5 system roles)
    const assignedRoleIdsQuery = db('user_roles').distinct('role_id');
    const targetRoles = await db('roles')
      .where('is_system', false)
      .whereNotIn('name', SYSTEM_ROLES)
      .whereNotIn('id', assignedRoleIdsQuery)
      .select('id', 'name');

    const targetRoleIds = targetRoles.map((r) => r.id);

    // 4. Orphan checks
    const validUserIdsQuery = db('users').select('id');
    const orphanNotifications = await db('notifications')
      .whereNotIn('user_id', validUserIdsQuery)
      .orWhereIn('user_id', targetUserIds)
      .select('id');

    const validEmpIdsQuery = db('employees').select('id');
    let orphanBankDetailsCount = 0;
    if (await db.schema.hasTable('employee_bank_details')) {
      const res = await db('employee_bank_details')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      orphanBankDetailsCount = Number(res?.cnt || 0);
    }

    let orphanEmergencyContactsCount = 0;
    if (await db.schema.hasTable('employee_emergency_contacts')) {
      const res = await db('employee_emergency_contacts')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      orphanEmergencyContactsCount = Number(res?.cnt || 0);
    }

    let attendanceCount = 0;
    if (await db.schema.hasTable('attendance')) {
      const res = await db('attendance')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      attendanceCount = Number(res?.cnt || 0);
    }

    let leaveRequestCount = 0;
    if (await db.schema.hasTable('leave_requests')) {
      const res = await db('leave_requests')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      leaveRequestCount = Number(res?.cnt || 0);
    }

    let leaveBalanceCount = 0;
    if (await db.schema.hasTable('leave_balances')) {
      const res = await db('leave_balances')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      leaveBalanceCount = Number(res?.cnt || 0);
    }

    let timesheetCount = 0;
    if (await db.schema.hasTable('timesheets')) {
      const res = await db('timesheets')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      timesheetCount = Number(res?.cnt || 0);
    }

    let documentCount = 0;
    if (await db.schema.hasTable('employee_documents')) {
      const res = await db('employee_documents')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      documentCount = Number(res?.cnt || 0);
    }

    let offerLettersCount = 0;
    if (await db.schema.hasTable('offer_letters')) {
      const res = await db('offer_letters')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      offerLettersCount = Number(res?.cnt || 0);
    }

    let lifecycleHistoryCount = 0;
    if (await db.schema.hasTable('employee_lifecycle_history')) {
      const res = await db('employee_lifecycle_history')
        .whereNotIn('employee_id', validEmpIdsQuery)
        .orWhereIn('employee_id', targetEmployeeIds)
        .count('id as cnt')
        .first();
      lifecycleHistoryCount = Number(res?.cnt || 0);
    }

    console.log('CLEANUP AUDIT COUNTS:');
    console.log(`- Target Test Users (test.emp.%, candidate.%, %@example.com): ${targetUsers.length}`);
    console.log(`- Target Test Employees:                                        ${targetEmployees.length}`);
    console.log(`- Non-System Roles With 0 Users:                                ${targetRoles.length}`);
    console.log(`- Target / Orphaned Notifications:                              ${orphanNotifications.length}`);
    console.log(`- Orphan / Target Bank Details:                                 ${orphanBankDetailsCount}`);
    console.log(`- Orphan / Target Emergency Contacts:                           ${orphanEmergencyContactsCount}`);
    console.log(`- Orphan / Target Attendance Records:                           ${attendanceCount}`);
    console.log(`- Orphan / Target Leave Requests:                               ${leaveRequestCount}`);
    console.log(`- Orphan / Target Leave Balances:                               ${leaveBalanceCount}`);
    console.log(`- Orphan / Target Timesheet Entries:                            ${timesheetCount}`);
    console.log(`- Orphan / Target Documents:                                    ${documentCount}`);
    console.log(`- Orphan / Target Offer Letters:                                ${offerLettersCount}`);
    console.log(`- Orphan / Target Lifecycle History:                            ${lifecycleHistoryCount}\n`);

    if (!isApply) {
      console.log('=> DRY RUN COMPLETED. No database modifications were made.');
      console.log('To apply these deletions, run: npm run cleanup:data -- --apply\n');
      return {
        targetUsers: targetUsers.length,
        targetEmployees: targetEmployees.length,
        targetRoles: targetRoles.length,
        orphanNotifications: orphanNotifications.length,
        orphanBankDetailsCount,
        orphanEmergencyContactsCount,
        attendanceCount,
        leaveRequestCount,
        leaveBalanceCount,
        timesheetCount,
        documentCount,
        offerLettersCount,
        lifecycleHistoryCount,
      };
    }

    // Apply deletions
    await db.transaction(async (trx) => {
      if (targetEmployeeIds.length > 0) {
        if (await trx.schema.hasTable('employee_bank_details')) {
          await trx('employee_bank_details')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('employee_emergency_contacts')) {
          await trx('employee_emergency_contacts')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('attendance')) {
          await trx('attendance')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('leave_requests')) {
          const reqs = await trx('leave_requests')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .select('id');
          const reqIds = reqs.map((r) => r.id);
          if (reqIds.length > 0 && (await trx.schema.hasTable('leave_request_days'))) {
            await trx('leave_request_days').whereIn('leave_request_id', reqIds).delete();
          }
          await trx('leave_requests')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('leave_balances')) {
          await trx('leave_balances')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('timesheets')) {
          const timesheets = await trx('timesheets')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .select('id');
          const tsIds = timesheets.map((t) => t.id);
          if (tsIds.length > 0 && (await trx.schema.hasTable('timesheet_entries'))) {
            await trx('timesheet_entries').whereIn('timesheet_id', tsIds).delete();
          }
          await trx('timesheets')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('offer_letters')) {
          await trx('offer_letters')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('employee_documents')) {
          await trx('employee_documents')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        if (await trx.schema.hasTable('employee_lifecycle_history')) {
          await trx('employee_lifecycle_history')
            .whereIn('employee_id', targetEmployeeIds)
            .orWhereNotIn('employee_id', validEmpIdsQuery)
            .delete();
        }
        await trx('employees').whereIn('id', targetEmployeeIds).delete();
      }

      if (targetUserIds.length > 0) {
        if (await trx.schema.hasTable('user_roles')) {
          await trx('user_roles').whereIn('user_id', targetUserIds).delete();
        }
        if (await trx.schema.hasTable('refresh_tokens')) {
          await trx('refresh_tokens').whereIn('user_id', targetUserIds).delete();
        }
        if (await trx.schema.hasTable('device_tokens')) {
          await trx('device_tokens').whereIn('user_id', targetUserIds).delete();
        }
        if (await trx.schema.hasTable('notification_preferences')) {
          await trx('notification_preferences').whereIn('user_id', targetUserIds).delete();
        }
        if (await trx.schema.hasTable('password_reset_tokens')) {
          await trx('password_reset_tokens').whereIn('user_id', targetUserIds).delete();
        }
        await trx('notifications').whereIn('user_id', targetUserIds).delete();
        await trx('users').whereIn('id', targetUserIds).delete();
      }

      await trx('notifications').whereNotIn('user_id', trx('users').select('id')).delete();

      if (targetRoleIds.length > 0) {
        if (await trx.schema.hasTable('role_permissions')) {
          await trx('role_permissions').whereIn('role_id', targetRoleIds).delete();
        }
        await trx('roles').whereIn('id', targetRoleIds).delete();
      }
    });

    console.log('=> APPLY COMPLETED. Selected temporary and unwanted data removed successfully!\n');
    return null;
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  const isApply = process.argv.includes('--apply');
  runCleanup(isApply).catch((err) => {
    console.error('[CLEANUP_FATAL_ERROR]', err);
    process.exit(1);
  });
}
