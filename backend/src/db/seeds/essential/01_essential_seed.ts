import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { ALL_SYSTEM_PERMISSIONS } from '../../../shared/constants/permissions';
import { SYSTEM_ROLES } from '../../../shared/constants/roles';

const WEAK_PASSWORDS = [
  'admin',
  'password',
  '123456',
  'admin123',
  'Password@123',
  'Admin@123',
];

export async function seed(knex: Knex): Promise<void> {
  // 1. Roles (Idempotent)
  const systemRoles = [
    { name: SYSTEM_ROLES.ADMIN, description: 'Full system administrator with unrestricted access', is_system: true },
    { name: SYSTEM_ROLES.HR, description: 'Human Resources team with employee, department, and leave access', is_system: true },
    { name: SYSTEM_ROLES.MANAGER, description: 'Team managers with project, task, and team approval access', is_system: true },
    { name: SYSTEM_ROLES.EMPLOYEE, description: 'Standard employees with self-service view and action access', is_system: true },
    { name: SYSTEM_ROLES.INTERN, description: 'Interns with limited self-service and task tracking access', is_system: true },
  ];

  for (const r of systemRoles) {
    const existing = await knex('roles').where({ name: r.name }).first();
    if (!existing) {
      await knex('roles').insert(r);
    }
  }

  const allRoles = await knex('roles').select('id', 'name');
  const roleMap: Record<string, number> = {};
  allRoles.forEach((r) => {
    roleMap[r.name] = Number(r.id);
  });

  // 2. Permissions (Idempotent)
  for (const p of ALL_SYSTEM_PERMISSIONS) {
    const existing = await knex('permissions').where({ name: p.name }).first();
    if (!existing) {
      await knex('permissions').insert({
        module: p.module,
        action: p.action,
        name: p.name,
        description: p.description,
      });
    }
  }

  const allPermissions = await knex('permissions').select('id', 'name');
  const permMap: Record<string, number> = {};
  allPermissions.forEach((p) => {
    permMap[p.name] = Number(p.id);
  });

  // 3. Assign Role Permissions (Idempotent)
  // Admin gets ALL permissions
  const adminPermInserts = allPermissions.map((p) => ({
    role_id: roleMap[SYSTEM_ROLES.ADMIN],
    permission_id: Number(p.id),
  }));
  if (adminPermInserts.length > 0) {
    await knex('role_permissions').insert(adminPermInserts).onConflict(['role_id', 'permission_id']).ignore();
  }

  // HR permissions
  const hrPermNames = [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.export', 'employees.view_own',
    'departments.view', 'departments.create', 'departments.edit',
    'designations.view', 'designations.create', 'designations.edit',
    'documents.view', 'documents.view_own', 'documents.create', 'documents.edit',
    'attendance.view', 'attendance.edit', 'attendance.approve', 'attendance.export', 'attendance.view_own',
    'leave.view', 'leave.approve', 'leave.export', 'leave.create', 'leave.view_own',
    'holidays.view', 'holidays.create', 'holidays.edit',
    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.approve', 'payroll.run', 'payroll.export', 'payroll.view_own',
    'payslips.view', 'payslips.create', 'payslips.export', 'payslips.view_own',
    'timesheets.view_own', 'timesheets.create',
    'assets.view', 'assets.create', 'assets.edit', 'assets.delete', 'assets.assign', 'assets.view_own',
    'clients.view', 'projects.view',
    'reports.view',
    'settings.view',
    'offer_letters.view', 'offer_letters.create', 'offer_letters.edit', 'offer_letters.send', 'offer_letter_templates.manage',
    'notifications.view', 'notifications.create',
  ];
  const hrRolePerms = hrPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.HR],
      permission_id: permMap[name],
    }));
  if (hrRolePerms.length > 0) {
    await knex('role_permissions').insert(hrRolePerms).onConflict(['role_id', 'permission_id']).ignore();
  }

  // Manager permissions
  const managerPermNames = [
    'employees.view_team', 'employees.view_own',
    'departments.view',
    'designations.view',
    'documents.view_team', 'documents.view_own', 'documents.create',
    'attendance.view_team', 'attendance.view_own', 'attendance.create', 'attendance.approve',
    'leave.view_team', 'leave.view_own', 'leave.create', 'leave.approve',
    'holidays.view',
    'timesheets.view_team', 'timesheets.view_own', 'timesheets.approve', 'timesheets.create',
    'projects.view_team', 'projects.view_own', 'projects.create', 'projects.edit',
    'tasks.view_team', 'tasks.view_own', 'tasks.create', 'tasks.edit', 'tasks.assign',
    'milestones.view', 'milestones.create', 'milestones.edit',
    'expenses.view_team', 'expenses.view_own', 'expenses.approve', 'expenses.create',
    'crm.view', 'crm.view_own', 'crm.create', 'crm.edit',
    'payroll.view_own', 'payslips.view_own',
    'assets.view_own',
    'offer_letters.view_own',
    'notifications.view',
  ];
  const managerRolePerms = managerPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.MANAGER],
      permission_id: permMap[name],
    }));
  if (managerRolePerms.length > 0) {
    await knex('role_permissions').insert(managerRolePerms).onConflict(['role_id', 'permission_id']).ignore();
  }

  // Employee permissions
  const employeePermNames = [
    'employees.view_own',
    'documents.view_own', 'documents.create',
    'attendance.view_own', 'attendance.create',
    'leave.view_own', 'leave.create',
    'holidays.view',
    'timesheets.view_own', 'timesheets.create',
    'projects.view_own',
    'tasks.view_own', 'tasks.edit',
    'expenses.view_own', 'expenses.create',
    'payroll.view_own', 'payslips.view_own',
    'assets.view_own',
    'offer_letters.view_own',
    'notifications.view',
  ];
  const employeeRolePerms = employeePermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.EMPLOYEE],
      permission_id: permMap[name],
    }));
  if (employeeRolePerms.length > 0) {
    await knex('role_permissions').insert(employeeRolePerms).onConflict(['role_id', 'permission_id']).ignore();
  }

  // Intern permissions
  const internPermNames = [
    'employees.view_own',
    'attendance.view_own', 'attendance.create',
    'leave.view_own', 'leave.create',
    'holidays.view',
    'timesheets.view_own', 'timesheets.create',
    'projects.view_own',
    'tasks.view_own', 'tasks.edit',
    'payroll.view_own', 'payslips.view_own',
    'assets.view_own',
    'offer_letters.view_own',
    'notifications.view',
  ];
  const internRolePerms = internPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.INTERN],
      permission_id: permMap[name],
    }));
  if (internRolePerms.length > 0) {
    await knex('role_permissions').insert(internRolePerms).onConflict(['role_id', 'permission_id']).ignore();
  }

  // 4. Leave Types (Idempotent)
  const leaveTypesData = [
    {
      name: 'Casual Leave',
      code: 'CL',
      yearly_quota: 12.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Sick Leave',
      code: 'SL',
      yearly_quota: 12.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Earned Leave',
      code: 'EL',
      yearly_quota: 15.0,
      is_paid: true,
      carry_forward: true,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Loss of Pay',
      code: 'LOP',
      yearly_quota: 0.0,
      is_paid: false,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Permission',
      code: 'PERM',
      yearly_quota: 24.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Work From Home',
      code: 'WFH',
      yearly_quota: 30.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
  ];

  for (const lt of leaveTypesData) {
    const existing = await knex('leave_types').where({ code: lt.code }).first();
    if (!existing) {
      await knex('leave_types').insert(lt);
    } else {
      await knex('leave_types').where({ code: lt.code }).update(lt);
    }
  }

  // 5. Work Settings (Idempotent)
  const existingSettings = await knex('work_settings').first();
  if (!existingSettings) {
    await knex('work_settings').insert({
      weekly_off_days: JSON.stringify([0, 6]),
      shift_start: '09:30',
      shift_end: '18:30',
      late_grace_minutes: 10,
      min_hours_full_day: 8.0,
      min_hours_half_day: 4.0,
    });
  }

  // 6. Offer Letter Template (Idempotent)
  const existingDefaultTemplate = await knex('offer_letter_templates').where({ is_default: true }).first();
  if (!existingDefaultTemplate) {
    const defaultTemplateHtml = `<p>Dear <strong>{{employee_name}}</strong>,</p>

<p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong>. We were thoroughly impressed by your credentials, expertise, and background, and we are excited about the prospect of you joining our team.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">1. Appointment & Commencement of Employment</h3>
<p>Your employment with {{company_name}} will commence on <strong>{{joining_date}}</strong>. This is a <strong>{{employment_type}}</strong> appointment based at our office in <strong>{{work_location}}</strong>. Your standard working hours will be <strong>{{working_hours}}</strong>, Monday through Friday, subject to company operational requirements.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">2. Reporting & Responsibilities</h3>
<p>In this role, you will report directly to <strong>{{reporting_manager}}</strong>. You will be responsible for the duties and tasks associated with the designation of {{designation}}, along with other assignments delegated to you from time to time.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">3. Compensation & Benefits</h3>
<p>You will receive a Monthly Gross Salary of <strong>{{monthly_gross}}</strong>, corresponding to an Annual Cost to Company (CTC) of <strong>{{annual_ctc}}</strong>. The detailed breakup of your compensation structure is provided below:</p>

{{salary_breakup_table}}

<p>All compensation and allowances are subject to statutory deductions including Income Tax (TDS), Provident Fund (PF), and Professional Tax in accordance with applicable laws.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">4. Probation & Confirmation</h3>
<p>You will be on probation for a period of <strong>{{probation_months}} months</strong> from your date of joining. Upon successful completion of your probation period and satisfactory performance assessment, your employment will be confirmed in writing. During the probation period, either party may terminate the employment with written notice as per company policy.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">5. Notice Period</h3>
<p>Following confirmation, either party may terminate the employment relationship by providing <strong>{{notice_period_days}} days</strong> prior written notice or basic salary in lieu thereof, subject to company approval and handover completion.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">6. Acceptance of Offer</h3>
<p>This offer is valid until <strong>{{offer_valid_until}}</strong>. Please confirm your acceptance by signing this letter and returning a scanned copy, or through our digital acceptance portal.</p>

<p>We look forward to welcoming you aboard and achieving great milestones together!</p>

<p>Sincerely,<br/>
<strong>{{signatory_name}}</strong><br/>
{{signatory_designation}}<br/>
{{company_name}}</p>`;

    await knex('offer_letter_templates').insert({
      name: 'Standard Professional Offer Letter',
      subject: 'Offer of Employment - {{designation}} at {{company_name}}',
      body_html: defaultTemplateHtml,
      is_default: true,
      created_by: null,
    });
  }

  // 7. ONE Admin User from Environment Variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@qynova.erp';
  let adminPassword = process.env.ADMIN_PASSWORD;

  // Weak password guard
  if (process.env.NODE_ENV !== 'test') {
    if (!adminPassword || adminPassword.length < 8 || WEAK_PASSWORDS.includes(adminPassword)) {
      throw new Error(
        `[FATAL] Refusing to seed admin: ADMIN_PASSWORD is missing, shorter than 8 characters, or matches a known weak default value.`
      );
    }
  } else {
    // In test environment, fallback to test credentials if unset
    if (!adminPassword) {
      adminPassword = 'Admin@123';
    }
  }

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminPassword, salt);

  const existingAdmin = await knex('users').where({ email: adminEmail }).first();
  let adminUserId: number;

  if (!existingAdmin) {
    const [insertedId] = await knex('users').insert({
      email: adminEmail,
      password_hash: adminHash,
      status: 'active',
      must_change_password: true,
    });
    adminUserId = Number(insertedId);
  } else {
    adminUserId = Number(existingAdmin.id);
  }

  // Ensure Admin user has Admin role
  await knex('user_roles')
    .insert({
      user_id: adminUserId,
      role_id: roleMap[SYSTEM_ROLES.ADMIN],
    })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  // 8. Notification event types / preferences (Idempotent)
  if (await knex.schema.hasTable('notification_preferences')) {
    const standardEventTypes = [
      'leave_request',
      'leave_status',
      'payroll_run',
      'employee_joined',
      'timesheet_decision',
    ];
    for (const evt of standardEventTypes) {
      await knex('notification_preferences')
        .insert({
          user_id: adminUserId,
          event_type: evt,
          email_enabled: true,
          in_app_enabled: true,
          push_enabled: true,
        })
        .onConflict(['user_id', 'event_type'])
        .ignore();
    }
  }
}
