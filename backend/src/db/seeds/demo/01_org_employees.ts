import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { SYSTEM_ROLES } from '../../../shared/constants/roles';

export async function seed(knex: Knex): Promise<void> {
  // 1. Insert Departments (Tree structure)
  // Development > Frontend, Backend, Mobile, QA; HR; Finance; Administration
  let devDept = await knex('departments').where({ code: 'DEV' }).first();
  let devDeptId = devDept ? devDept.id : null;
  if (!devDeptId) {
    const [id] = await knex('departments').insert({
      name: 'Development',
      code: 'DEV',
      parent_id: null,
      description: 'Engineering and Product Development',
    });
    devDeptId = id;
  }

  let hrDept = await knex('departments').where({ code: 'HR' }).first();
  let hrDeptId = hrDept ? hrDept.id : null;
  if (!hrDeptId) {
    const [id] = await knex('departments').insert({
      name: 'Human Resources',
      code: 'HR',
      parent_id: null,
      description: 'HR, Talent Acquisition and People Operations',
    });
    hrDeptId = id;
  }

  let finDept = await knex('departments').where({ code: 'FIN' }).first();
  let finDeptId = finDept ? finDept.id : null;
  if (!finDeptId) {
    const [id] = await knex('departments').insert({
      name: 'Finance',
      code: 'FIN',
      parent_id: null,
      description: 'Accounting, Auditing and Finance Operations',
    });
    finDeptId = id;
  }

  let adminDept = await knex('departments').where({ code: 'ADM' }).first();
  let adminDeptId = adminDept ? adminDept.id : null;
  if (!adminDeptId) {
    const [id] = await knex('departments').insert({
      name: 'Administration',
      code: 'ADM',
      parent_id: null,
      description: 'General Administration, IT Infrastructure and Operations',
    });
    adminDeptId = id;
  }

  // Sub-departments under Development
  const subDepts = [
    { name: 'Frontend', code: 'DEV-FE', parent_id: devDeptId, description: 'Web & UI Engineering' },
    { name: 'Backend', code: 'DEV-BE', parent_id: devDeptId, description: 'Cloud & API Engineering' },
    { name: 'Mobile', code: 'DEV-MOB', parent_id: devDeptId, description: 'iOS & Android App Engineering' },
    { name: 'QA', code: 'DEV-QA', parent_id: devDeptId, description: 'Quality Assurance and Automated Testing' },
  ];
  for (const sd of subDepts) {
    const exists = await knex('departments').where({ code: sd.code }).first();
    if (!exists) {
      await knex('departments').insert(sd);
    }
  }

  const departments = await knex('departments').select('id', 'code');
  const deptMap: Record<string, number> = {};
  departments.forEach((d) => {
    deptMap[d.code] = Number(d.id);
  });

  // 2. Insert Designations
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
  for (const d of designationsData) {
    const exists = await knex('designations').where({ code: d.code }).first();
    if (!exists) {
      await knex('designations').insert(d);
    }
  }

  const designations = await knex('designations').select('id', 'code');
  const desigMap: Record<string, number> = {};
  designations.forEach((d) => {
    desigMap[d.code] = Number(d.id);
  });

  // 3. Seed Demo Users
  const roles = await knex('roles').select('id', 'name');
  const roleMap: Record<string, number> = {};
  roles.forEach((r) => {
    roleMap[r.name] = Number(r.id);
  });

  const salt = await bcrypt.genSalt(10);
  const hrHash = await bcrypt.hash('Hr@123', salt);
  const managerHash = await bcrypt.hash('Manager@123', salt);
  const employeeHash = await bcrypt.hash('Employee@123', salt);
  const internHash = await bcrypt.hash('Intern@123', salt);

  // HR User
  let hrUser = await knex('users').where({ email: 'hr@qynova.erp' }).first();
  let hrUserId: number;
  if (!hrUser) {
    const [id] = await knex('users').insert({
      email: 'hr@qynova.erp',
      password_hash: hrHash,
      status: 'active',
      must_change_password: false,
    });
    hrUserId = Number(id);
  } else {
    hrUserId = Number(hrUser.id);
  }
  await knex('user_roles')
    .insert({ user_id: hrUserId, role_id: roleMap[SYSTEM_ROLES.HR] })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  // Manager User
  let managerUser = await knex('users').where({ email: 'manager@qynova.erp' }).first();
  let managerUserId: number;
  if (!managerUser) {
    const [id] = await knex('users').insert({
      email: 'manager@qynova.erp',
      password_hash: managerHash,
      status: 'active',
      must_change_password: false,
    });
    managerUserId = Number(id);
  } else {
    managerUserId = Number(managerUser.id);
  }
  await knex('user_roles')
    .insert({ user_id: managerUserId, role_id: roleMap[SYSTEM_ROLES.MANAGER] })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  // Employee User
  let employeeUser = await knex('users').where({ email: 'employee@qynova.erp' }).first();
  let employeeUserId: number;
  if (!employeeUser) {
    const [id] = await knex('users').insert({
      email: 'employee@qynova.erp',
      password_hash: employeeHash,
      status: 'active',
      must_change_password: false,
    });
    employeeUserId = Number(id);
  } else {
    employeeUserId = Number(employeeUser.id);
  }
  await knex('user_roles')
    .insert({ user_id: employeeUserId, role_id: roleMap[SYSTEM_ROLES.EMPLOYEE] })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  // Intern User
  let internUser = await knex('users').where({ email: 'intern@qynova.erp' }).first();
  let internUserId: number;
  if (!internUser) {
    const [id] = await knex('users').insert({
      email: 'intern@qynova.erp',
      password_hash: internHash,
      status: 'active',
      must_change_password: false,
    });
    internUserId = Number(id);
  } else {
    internUserId = Number(internUser.id);
  }
  await knex('user_roles')
    .insert({ user_id: internUserId, role_id: roleMap[SYSTEM_ROLES.INTERN] })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  // 4. Seed Employees
  // Manager Employee
  let managerEmp = await knex('employees').where({ employee_code: 'EMP-0001' }).first();
  let managerEmpId: number;
  if (!managerEmp) {
    const [id] = await knex('employees').insert({
      employee_code: 'EMP-0001',
      user_id: managerUserId,
      first_name: 'Vikram',
      last_name: 'Sharma',
      email: 'manager@qynova.erp',
      phone: '+91 9876543210',
      date_of_birth: '1988-04-12',
      address: '42, Brigade Road, Bangalore, Karnataka',
      department_id: deptMap['DEV'],
      designation_id: desigMap['EM'],
      reporting_manager_id: null,
      joining_date: '2021-01-15',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
      skills: JSON.stringify(['Node.js', 'React', 'Team Leadership', 'Architecture']),
      experience_years: 8.5,
    });
    managerEmpId = Number(id);
  } else {
    managerEmpId = Number(managerEmp.id);
  }

  // HR Employee
  let hrEmp = await knex('employees').where({ employee_code: 'EMP-0002' }).first();
  let hrEmpId: number;
  if (!hrEmp) {
    const [id] = await knex('employees').insert({
      employee_code: 'EMP-0002',
      user_id: hrUserId,
      first_name: 'Priya',
      last_name: 'Nair',
      email: 'hr@qynova.erp',
      phone: '+91 9876543211',
      date_of_birth: '1992-08-20',
      address: '15, Indiranagar 100ft Rd, Bangalore, Karnataka',
      department_id: deptMap['HR'],
      designation_id: desigMap['HRMGR'],
      reporting_manager_id: null,
      joining_date: '2022-03-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
      skills: JSON.stringify(['Talent Management', 'HR Operations', 'Compliance']),
      experience_years: 6.0,
    });
    hrEmpId = Number(id);
  } else {
    hrEmpId = Number(hrEmp.id);
  }

  // Regular Employee (reports to Manager EMP-0001)
  let employeeEmp = await knex('employees').where({ employee_code: 'EMP-0003' }).first();
  let employeeEmpId: number;
  if (!employeeEmp) {
    const [id] = await knex('employees').insert({
      employee_code: 'EMP-0003',
      user_id: employeeUserId,
      first_name: 'Arjun',
      last_name: 'Kumar',
      email: 'employee@qynova.erp',
      phone: '+91 9876543212',
      date_of_birth: '1996-11-05',
      address: '88, Koramangala 4th Block, Bangalore, Karnataka',
      department_id: deptMap['DEV-BE'],
      designation_id: desigMap['SSE'],
      reporting_manager_id: managerEmpId,
      joining_date: '2023-06-10',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'confirmed',
      skills: JSON.stringify(['TypeScript', 'MySQL', 'Express', 'Redis']),
      experience_years: 3.5,
    });
    employeeEmpId = Number(id);
  } else {
    employeeEmpId = Number(employeeEmp.id);
  }

  // Intern Employee (reports to Manager EMP-0001)
  let internEmp = await knex('employees').where({ employee_code: 'EMP-0004' }).first();
  let internEmpId: number;
  if (!internEmp) {
    const [id] = await knex('employees').insert({
      employee_code: 'EMP-0004',
      user_id: internUserId,
      first_name: 'Sneha',
      last_name: 'Patel',
      email: 'intern@qynova.erp',
      phone: '+91 9876543213',
      date_of_birth: '2002-05-18',
      address: '12, HSR Layout Sector 2, Bangalore, Karnataka',
      department_id: deptMap['DEV-FE'],
      designation_id: desigMap['SE'],
      reporting_manager_id: managerEmpId,
      joining_date: '2024-01-08',
      employment_type: 'intern',
      status: 'active',
      lifecycle_stage: 'probation',
      skills: JSON.stringify(['React', 'TailwindCSS', 'JavaScript']),
      experience_years: 0.5,
    });
    internEmpId = Number(id);
  } else {
    internEmpId = Number(internEmp.id);
  }

  // 5. Bank Details
  const bankDetails = [
    { employee_id: managerEmpId, account_holder: 'Vikram Sharma', bank_name: 'HDFC Bank', account_number: '50100234567890', ifsc: 'HDFC0001234' },
    { employee_id: hrEmpId, account_holder: 'Priya Nair', bank_name: 'ICICI Bank', account_number: '001205001234', ifsc: 'ICIC0000012' },
    { employee_id: employeeEmpId, account_holder: 'Arjun Kumar', bank_name: 'State Bank of India', account_number: '204567890123', ifsc: 'SBIN0004567' },
    { employee_id: internEmpId, account_holder: 'Sneha Patel', bank_name: 'Axis Bank', account_number: '912345678901234', ifsc: 'UTIB0000234' },
  ];
  for (const b of bankDetails) {
    const exists = await knex('employee_bank_details').where({ employee_id: b.employee_id }).first();
    if (!exists) {
      await knex('employee_bank_details').insert(b);
    }
  }

  // 6. Emergency Contacts
  const emergencyContacts = [
    { employee_id: managerEmpId, contact_name: 'Rohit Sharma', relationship: 'Brother', phone: '+91 9876500001', alt_phone: '+91 9876500002', address: 'Bangalore' },
    { employee_id: hrEmpId, contact_name: 'Ramesh Nair', relationship: 'Father', phone: '+91 9876500003', alt_phone: null, address: 'Kochi, Kerala' },
    { employee_id: employeeEmpId, contact_name: 'Sunita Kumar', relationship: 'Mother', phone: '+91 9876500004', alt_phone: null, address: 'Bangalore' },
    { employee_id: internEmpId, contact_name: 'Mahesh Patel', relationship: 'Father', phone: '+91 9876500005', alt_phone: null, address: 'Ahmedabad, Gujarat' },
  ];
  for (const c of emergencyContacts) {
    const exists = await knex('employee_emergency_contacts').where({ employee_id: c.employee_id }).first();
    if (!exists) {
      await knex('employee_emergency_contacts').insert(c);
    }
  }
}
