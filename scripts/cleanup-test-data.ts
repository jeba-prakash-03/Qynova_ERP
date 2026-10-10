import dotenv from 'dotenv';
import path from 'path';
import knex from 'knex';
import knexConfig from '../backend/src/db/knexfile';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const db = knex(knexConfig.development);

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const mode = isApply ? 'APPLY MODE (PERFORMING DELETIONS)' : 'DRY RUN MODE (NO DATA WILL BE DELETED)';

  console.log(`\n==================================================`);
  console.log(`=== Qynova ERP Test Data Cleanup Script ===`);
  console.log(`=== ${mode} ===`);
  console.log(`==================================================\n`);

  try {
    // 1. Identify Target Users and Employees
    const targetUsers = await db('users')
      .where('email', 'like', 'test.emp.%@qynova.erp')
      .orWhere('email', 'like', 'candidate.%@qynova.erp')
      .select('id', 'email');

    const targetUserIds = targetUsers.map((u) => u.id);

    const targetEmployees = await db('employees')
      .whereIn('user_id', targetUserIds)
      .orWhere('email', 'like', 'test.emp.%@qynova.erp')
      .orWhere('email', 'like', 'candidate.%@qynova.erp')
      .select('id', 'email', 'first_name', 'last_name');

    const targetEmployeeIds = targetEmployees.map((e) => e.id);

    // 2. Identify Target Roles (non-seeded roles with 0 assigned users)
    const seededRoles = ['Admin', 'HR', 'Manager', 'Employee', 'Intern'];
    const assignedRoleIdsQuery = db('user_roles').distinct('role_id');
    
    const targetRoles = await db('roles')
      .whereNotIn('name', seededRoles)
      .whereNotIn('id', assignedRoleIdsQuery)
      .select('id', 'name');

    const targetRoleIds = targetRoles.map((r) => r.id);

    // 3. Count associated child records
    let attendanceCount = 0;
    let leaveRequestCount = 0;
    let leaveBalanceCount = 0;
    let timesheetCount = 0;
    let documentCount = 0;
    let lifecycleHistoryCount = 0;

    if (targetEmployeeIds.length > 0) {
      const attRes = await db('attendance').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      attendanceCount = Number(attRes?.cnt || 0);

      const lrRes = await db('leave_requests').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      leaveRequestCount = Number(lrRes?.cnt || 0);

      const lbRes = await db('leave_balances').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      leaveBalanceCount = Number(lbRes?.cnt || 0);

      const tsRes = await db('timesheets').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      timesheetCount = Number(tsRes?.cnt || 0);

      const docRes = await db('employee_documents').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      documentCount = Number(docRes?.cnt || 0);

      const lhRes = await db('employee_lifecycle_history').whereIn('employee_id', targetEmployeeIds).count('id as cnt').first();
      lifecycleHistoryCount = Number(lhRes?.cnt || 0);
    }

    // Notifications for target users OR orphaned notifications
    const targetNotifications = await db('notifications')
      .whereIn('user_id', targetUserIds)
      .orWhereNotIn('user_id', db('users').select('id'))
      .count('id as cnt')
      .first();
    const notificationCount = Number(targetNotifications?.cnt || 0);

    console.log('IDENTIFIED TEST DATA FOR CLEANUP:');
    console.log(`- Target Test Users:         ${targetUsers.length}`);
    console.log(`- Target Test Employees:     ${targetEmployees.length}`);
    console.log(`- Target Unassigned Roles:   ${targetRoles.length}`);
    console.log(`- Associated Attendance:     ${attendanceCount}`);
    console.log(`- Associated Leave Requests: ${leaveRequestCount}`);
    console.log(`- Associated Leave Balances: ${leaveBalanceCount}`);
    console.log(`- Associated Timesheets:     ${timesheetCount}`);
    console.log(`- Associated Documents:      ${documentCount}`);
    console.log(`- Associated Lifecycle Hist: ${lifecycleHistoryCount}`);
    console.log(`- Target/Orphaned Notifs:    ${notificationCount}\n`);

    if (!isApply) {
      console.log('DRY RUN COMPLETE. No data was modified.');
      console.log('To apply these deletions, re-run with: npx ts-node scripts/cleanup-test-data.ts --apply\n');
      return;
    }

    // Perform deletions in transaction
    await db.transaction(async (trx) => {
      if (targetEmployeeIds.length > 0) {
        await trx('attendance').whereIn('employee_id', targetEmployeeIds).delete();
        
        const reqs = await trx('leave_requests').whereIn('employee_id', targetEmployeeIds).select('id');
        const reqIds = reqs.map((r) => r.id);
        if (reqIds.length > 0) {
          await trx('leave_request_days').whereIn('leave_request_id', reqIds).delete();
        }
        await trx('leave_requests').whereIn('employee_id', targetEmployeeIds).delete();
        await trx('leave_balances').whereIn('employee_id', targetEmployeeIds).delete();

        const timesheets = await trx('timesheets').whereIn('employee_id', targetEmployeeIds).select('id');
        const tsIds = timesheets.map((t) => t.id);
        if (tsIds.length > 0) {
          await trx('timesheet_entries').whereIn('timesheet_id', tsIds).delete();
        }
        await trx('timesheets').whereIn('employee_id', targetEmployeeIds).delete();
        await trx('employee_documents').whereIn('employee_id', targetEmployeeIds).delete();
        await trx('employee_lifecycle_history').whereIn('employee_id', targetEmployeeIds).delete();
        await trx('employees').whereIn('id', targetEmployeeIds).delete();
      }

      if (targetUserIds.length > 0) {
        await trx('user_roles').whereIn('user_id', targetUserIds).delete();
        await trx('notifications').whereIn('user_id', targetUserIds).delete();
        await trx('users').whereIn('id', targetUserIds).delete();
      }

      // Delete orphaned notifications
      await trx('notifications').whereNotIn('user_id', trx('users').select('id')).delete();

      // Delete unassigned non-seeded roles
      if (targetRoleIds.length > 0) {
        await trx('role_permissions').whereIn('role_id', targetRoleIds).delete();
        await trx('roles').whereIn('id', targetRoleIds).delete();
      }
    });

    console.log('SUCCESSFULLY APPLIED CLEANUP DELETIONS!\n');
  } catch (err) {
    console.error('CRITICAL ERROR DURING CLEANUP:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
