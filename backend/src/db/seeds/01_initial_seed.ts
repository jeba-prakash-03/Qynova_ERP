import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { ALL_SYSTEM_PERMISSIONS } from '../../shared/constants/permissions';
import { SYSTEM_ROLES } from '../../shared/constants/roles';

export async function seed(knex: Knex): Promise<void> {
  // Temporarily disable foreign key checks for table truncate/del
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');

  await knex('employee_emergency_contacts').del();
  await knex('employee_bank_details').del();
  await knex('employees').del();
  await knex('designations').del();
  await knex('departments').del();
  await knex('user_roles').del();
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('roles').del();
  await knex('refresh_tokens').del();
  await knex('login_attempts').del();
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('users').del();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  // 1. Insert Roles
  const rolesData = [
    { name: SYSTEM_ROLES.ADMIN, description: 'Full system administrator with unrestricted access', is_system: true },
    { name: SYSTEM_ROLES.HR, description: 'Human Resources team with employee, department, and leave access', is_system: true },
    { name: SYSTEM_ROLES.MANAGER, description: 'Team managers with project, task, and team approval access', is_system: true },
    { name: SYSTEM_ROLES.EMPLOYEE, description: 'Standard employees with self-service view and action access', is_system: true },
    { name: SYSTEM_ROLES.INTERN, description: 'Interns with limited self-service and task tracking access', is_system: true },
  ];
  await knex('roles').insert(rolesData);
  const roles = await knex('roles').select('id', 'name');
  const roleMap: Record<string, number> = {};
  roles.forEach((r) => {
    roleMap[r.name] = Number(r.id);
  });

  // 2. Insert Permissions
  const permissionsToInsert = ALL_SYSTEM_PERMISSIONS.map((p) => ({
    module: p.module,
    action: p.action,
    name: p.name,
    description: p.description,
  }));
  await knex('permissions').insert(permissionsToInsert);
  const permissions = await knex('permissions').select('id', 'name', 'module', 'action');
  const permMap: Record<string, number> = {};
  permissions.forEach((p) => {
    permMap[p.name] = Number(p.id);
  });

  // 3. Assign Role Permissions
  // Admin gets ALL permissions
  const adminRolePerms = permissions.map((p) => ({
    role_id: roleMap[SYSTEM_ROLES.ADMIN],
    permission_id: Number(p.id),
  }));
  await knex('role_permissions').insert(adminRolePerms);

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
    'audit_logs.view',
    'notifications.view', 'notifications.create',
  ];
  const hrRolePerms = hrPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.HR],
      permission_id: permMap[name],
    }));
  await knex('role_permissions').insert(hrRolePerms);

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
    'payslips.view_own',
    'notifications.view',
  ];
  const managerRolePerms = managerPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.MANAGER],
      permission_id: permMap[name],
    }));
  await knex('role_permissions').insert(managerRolePerms);

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
    'payslips.view_own',
    'notifications.view',
  ];
  const employeeRolePerms = employeePermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.EMPLOYEE],
      permission_id: permMap[name],
    }));
  await knex('role_permissions').insert(employeeRolePerms);

  // Intern permissions
  const internPermNames = [
    'employees.view_own',
    'attendance.view_own', 'attendance.create',
    'leave.view_own', 'leave.create',
    'holidays.view',
    'tasks.view_own', 'tasks.edit',
    'notifications.view',
  ];
  const internRolePerms = internPermNames
    .filter((name) => permMap[name])
    .map((name) => ({
      role_id: roleMap[SYSTEM_ROLES.INTERN],
      permission_id: permMap[name],
    }));
  await knex('role_permissions').insert(internRolePerms);

  // 4. Insert Departments (Tree structure)
  // Development > Frontend, Backend, Mobile, QA; HR; Finance; Administration
  const [devDeptId] = await knex('departments').insert({
    name: 'Development',
    code: 'DEV',
    parent_id: null,
    description: 'Engineering and Product Development',
  });
  const [hrDeptId] = await knex('departments').insert({
    name: 'Human Resources',
    code: 'HR',
    parent_id: null,
    description: 'HR, Talent Acquisition and People Operations',
  });
  const [finDeptId] = await knex('departments').insert({
    name: 'Finance',
    code: 'FIN',
    parent_id: null,
    description: 'Accounting, Auditing and Finance Operations',
  });
  const [adminDeptId] = await knex('departments').insert({
    name: 'Administration',
    code: 'ADM',
    parent_id: null,
    description: 'General Administration, IT Infrastructure and Operations',
  });

  // Sub-departments under Development
  const [frontendDeptId] = await knex('departments').insert({
    name: 'Frontend',
    code: 'DEV-FE',
    parent_id: devDeptId,
    description: 'Web & UI Engineering',
  });
  const [backendDeptId] = await knex('departments').insert({
    name: 'Backend',
    code: 'DEV-BE',
    parent_id: devDeptId,
    description: 'Cloud & API Engineering',
  });
  const [mobileDeptId] = await knex('departments').insert({
    name: 'Mobile',
    code: 'DEV-MOB',
    parent_id: devDeptId,
    description: 'iOS & Android App Engineering',
  });
  const [qaDeptId] = await knex('departments').insert({
    name: 'QA',
    code: 'DEV-QA',
    parent_id: devDeptId,
    description: 'Quality Assurance and Automated Testing',
  });

  // 5. Insert Designations
  const designationsData = [
    { name: 'Software Engineer', code: 'SE', description: 'Mid-level Software Developer' },
    { name: 'Senior Software Engineer', code: 'SSE', description: 'Senior Software Developer' },
    { name: 'Tech Lead', code: 'TL', description: 'Technical Lead' },
    { name: 'Engineering Manager', code: 'EM', description: 'Engineering Manager' },
    { name: 'QA Engineer', code: 'QA-ENG', description: 'Quality Assurance Engineer' },
    { name: 'UI/UX Designer', code: 'UIDES', description: 'Product Designer' },
    { name: 'HR Executive', code: 'HREXEC', description: 'HR Operations Executive' },
    { name: 'HR Manager', code: 'HRMGR', description: 'Human Resources Manager' },
    { name: 'Finance Analyst', code: 'FINAN', description: 'Finance & Accounts Analyst' },
    { name: 'Operations Executive', code: 'OPSEXEC', description: 'General Operations' },
  ];
  await knex('designations').insert(designationsData);
  const designations = await knex('designations').select('id', 'code');
  const desigMap: Record<string, number> = {};
  designations.forEach((d) => {
    desigMap[d.code] = Number(d.id);
  });

  // 6. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);
  const hrHash = await bcrypt.hash('Hr@123', salt);
  const managerHash = await bcrypt.hash('Manager@123', salt);
  const employeeHash = await bcrypt.hash('Employee@123', salt);
  const internHash = await bcrypt.hash('Intern@123', salt);

  // Admin user (employeeId = null, system admin)
  const [adminUserId] = await knex('users').insert({
    email: 'admin@qynova.erp',
    password_hash: adminHash,
    status: 'active',
    must_change_password: false,
  });
  await knex('user_roles').insert({
    user_id: adminUserId,
    role_id: roleMap[SYSTEM_ROLES.ADMIN],
  });

  // HR User
  const [hrUserId] = await knex('users').insert({
    email: 'hr@qynova.erp',
    password_hash: hrHash,
    status: 'active',
    must_change_password: false,
  });
  await knex('user_roles').insert({
    user_id: hrUserId,
    role_id: roleMap[SYSTEM_ROLES.HR],
  });

  // Manager User
  const [managerUserId] = await knex('users').insert({
    email: 'manager@qynova.erp',
    password_hash: managerHash,
    status: 'active',
    must_change_password: false,
  });
  await knex('user_roles').insert({
    user_id: managerUserId,
    role_id: roleMap[SYSTEM_ROLES.MANAGER],
  });

  // Employee User
  const [employeeUserId] = await knex('users').insert({
    email: 'employee@qynova.erp',
    password_hash: employeeHash,
    status: 'active',
    must_change_password: false,
  });
  await knex('user_roles').insert({
    user_id: employeeUserId,
    role_id: roleMap[SYSTEM_ROLES.EMPLOYEE],
  });

  // Intern User
  const [internUserId] = await knex('users').insert({
    email: 'intern@qynova.erp',
    password_hash: internHash,
    status: 'active',
    must_change_password: false,
  });
  await knex('user_roles').insert({
    user_id: internUserId,
    role_id: roleMap[SYSTEM_ROLES.INTERN],
  });

  // 7. Seed Employees
  // Manager Employee
  const [managerEmpId] = await knex('employees').insert({
    employee_code: 'EMP-0001',
    user_id: managerUserId,
    first_name: 'Vikram',
    last_name: 'Sharma',
    email: 'manager@qynova.erp',
    phone: '+91 9876543210',
    date_of_birth: '1988-04-12',
    address: '42, Brigade Road, Bangalore, Karnataka',
    department_id: devDeptId,
    designation_id: desigMap['EM'],
    reporting_manager_id: null,
    joining_date: '2021-01-15',
    employment_type: 'full_time',
    status: 'active',
    lifecycle_stage: 'active',
    skills: JSON.stringify(['Node.js', 'React', 'Team Leadership', 'Architecture']),
    experience_years: 8.5,
  });

  // HR Employee
  const [hrEmpId] = await knex('employees').insert({
    employee_code: 'EMP-0002',
    user_id: hrUserId,
    first_name: 'Priya',
    last_name: 'Nair',
    email: 'hr@qynova.erp',
    phone: '+91 9876543211',
    date_of_birth: '1992-08-20',
    address: '15, Indiranagar 100ft Rd, Bangalore, Karnataka',
    department_id: hrDeptId,
    designation_id: desigMap['HRMGR'],
    reporting_manager_id: null,
    joining_date: '2022-03-01',
    employment_type: 'full_time',
    status: 'active',
    lifecycle_stage: 'active',
    skills: JSON.stringify(['Talent Management', 'HR Operations', 'Compliance']),
    experience_years: 6.0,
  });

  // Regular Employee (reports to Manager EMP-0001)
  const [employeeEmpId] = await knex('employees').insert({
    employee_code: 'EMP-0003',
    user_id: employeeUserId,
    first_name: 'Arjun',
    last_name: 'Kumar',
    email: 'employee@qynova.erp',
    phone: '+91 9876543212',
    date_of_birth: '1996-11-05',
    address: '88, Koramangala 4th Block, Bangalore, Karnataka',
    department_id: backendDeptId,
    designation_id: desigMap['SSE'],
    reporting_manager_id: managerEmpId,
    joining_date: '2023-06-10',
    employment_type: 'full_time',
    status: 'active',
    lifecycle_stage: 'confirmed',
    skills: JSON.stringify(['TypeScript', 'MySQL', 'Express', 'Redis']),
    experience_years: 3.5,
  });

  // Intern Employee (reports to Manager EMP-0001)
  const [internEmpId] = await knex('employees').insert({
    employee_code: 'EMP-0004',
    user_id: internUserId,
    first_name: 'Sneha',
    last_name: 'Patel',
    email: 'intern@qynova.erp',
    phone: '+91 9876543213',
    date_of_birth: '2002-05-18',
    address: '12, HSR Layout Sector 2, Bangalore, Karnataka',
    department_id: frontendDeptId,
    designation_id: desigMap['SE'],
    reporting_manager_id: managerEmpId,
    joining_date: '2024-01-08',
    employment_type: 'intern',
    status: 'active',
    lifecycle_stage: 'probation',
    skills: JSON.stringify(['React', 'TailwindCSS', 'JavaScript']),
    experience_years: 0.5,
  });

  // 8. Bank Details
  await knex('employee_bank_details').insert([
    {
      employee_id: managerEmpId,
      account_holder: 'Vikram Sharma',
      bank_name: 'HDFC Bank',
      account_number: '50100234567890',
      ifsc: 'HDFC0001234',
    },
    {
      employee_id: hrEmpId,
      account_holder: 'Priya Nair',
      bank_name: 'ICICI Bank',
      account_number: '001205001234',
      ifsc: 'ICIC0000012',
    },
    {
      employee_id: employeeEmpId,
      account_holder: 'Arjun Kumar',
      bank_name: 'State Bank of India',
      account_number: '204567890123',
      ifsc: 'SBIN0004567',
    },
    {
      employee_id: internEmpId,
      account_holder: 'Sneha Patel',
      bank_name: 'Axis Bank',
      account_number: '912345678901234',
      ifsc: 'UTIB0000234',
    },
  ]);

  // 9. Emergency Contacts
  await knex('employee_emergency_contacts').insert([
    {
      employee_id: managerEmpId,
      contact_name: 'Rohit Sharma',
      relationship: 'Brother',
      phone: '+91 9876500001',
      alt_phone: '+91 9876500002',
      address: 'Bangalore',
    },
    {
      employee_id: hrEmpId,
      contact_name: 'Ramesh Nair',
      relationship: 'Father',
      phone: '+91 9876500003',
      alt_phone: null,
      address: 'Kochi, Kerala',
    },
    {
      employee_id: employeeEmpId,
      contact_name: 'Sunita Kumar',
      relationship: 'Mother',
      phone: '+91 9876500004',
      alt_phone: null,
      address: 'Bangalore',
    },
    {
      employee_id: internEmpId,
      contact_name: 'Mahesh Patel',
      relationship: 'Father',
      phone: '+91 9876500005',
      alt_phone: null,
      address: 'Ahmedabad, Gujarat',
    },
  ]);

  // 10. Initial Notification
  await knex('notifications').insert([
    {
      user_id: adminUserId,
      event_key: 'system:init:welcome',
      type: 'info',
      title: 'Welcome to Qynova ERP',
      message: 'System foundation and core RBAC initialized successfully.',
      link: '/admin',
      is_read: false,
    },
  ]);
}
