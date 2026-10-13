import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 1. Ensure permissions for clients and projects are mapped to roles
  const roles = await knex('roles').select('id', 'name');
  const permissions = await knex('permissions').select('id', 'name');

  const roleMap: Record<string, number> = {};
  roles.forEach((r) => {
    roleMap[r.name] = r.id;
  });

  const permMap: Record<string, number> = {};
  permissions.forEach((p) => {
    permMap[p.name] = p.id;
  });

  const extraRolePerms: { role_name: string; perm_name: string }[] = [
    // Manager can view/create/edit clients and projects
    { role_name: 'Manager', perm_name: 'clients.view' },
    { role_name: 'Manager', perm_name: 'clients.create' },
    { role_name: 'Manager', perm_name: 'clients.edit' },
    { role_name: 'Manager', perm_name: 'projects.view_team' },
    { role_name: 'Manager', perm_name: 'projects.view_own' },
    { role_name: 'Manager', perm_name: 'projects.create' },
    { role_name: 'Manager', perm_name: 'projects.edit' },
    { role_name: 'Manager', perm_name: 'milestones.view' },
    { role_name: 'Manager', perm_name: 'milestones.create' },
    { role_name: 'Manager', perm_name: 'milestones.edit' },
    // HR can view clients and projects
    { role_name: 'HR', perm_name: 'clients.view' },
    { role_name: 'HR', perm_name: 'projects.view' },
    // Employee and Intern can view own projects
    { role_name: 'Employee', perm_name: 'projects.view_own' },
    { role_name: 'Intern', perm_name: 'projects.view_own' },
  ];

  // Clean up any previously inserted projects.view on Manager
  if (roleMap['Manager'] && permMap['projects.view']) {
    await knex('role_permissions')
      .where({ role_id: roleMap['Manager'], permission_id: permMap['projects.view'] })
      .del();
  }

  for (const item of extraRolePerms) {
    const roleId = roleMap[item.role_name];
    const permId = permMap[item.perm_name];
    if (roleId && permId) {
      const exists = await knex('role_permissions')
        .where({ role_id: roleId, permission_id: permId })
        .first();
      if (!exists) {
        await knex('role_permissions').insert({ role_id: roleId, permission_id: permId });
      }
    }
  }

  // 2. Fetch admin user id for created_by fields
  const adminUser = await knex('users').where({ email: 'admin@qynova.erp' }).first();
  const adminUserId = adminUser ? adminUser.id : 1;

  // 3. Clear existing clients and projects
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('project_milestones').del();
  await knex('project_members').del();
  await knex('projects').del();
  await knex('client_communications').del();
  await knex('client_addresses').del();
  await knex('client_contacts').del();
  await knex('clients').del();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  // 4. Seed 3 Clients
  // Client 1: Acme FinTech Solutions
  const [client1Id] = await knex('clients').insert({
    client_code: 'CL-0001',
    company_name: 'Acme FinTech Solutions',
    industry: 'Financial Services',
    website: 'https://acmefintech.example.com',
    gstin: '29AABCU9603R1Z7',
    status: 'active',
    notes: 'Strategic tier-1 enterprise client in banking & payments infrastructure.',
  });

  await knex('client_contacts').insert([
    {
      client_id: client1Id,
      name: 'Rajesh Sharma',
      designation: 'VP Technology & Platforms',
      email: 'rajesh.sharma@acmefintech.example.com',
      phone: '+91 98450 11223',
      is_primary: true,
    },
    {
      client_id: client1Id,
      name: 'Meera Nair',
      designation: 'Principal Architect',
      email: 'meera.nair@acmefintech.example.com',
      phone: '+91 98450 44556',
      is_primary: false,
    },
  ]);

  await knex('client_addresses').insert([
    {
      client_id: client1Id,
      type: 'office',
      line1: 'Prestige Tech Cloud, Phase 2',
      line2: 'Outer Ring Road, Bellandur',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India',
    },
    {
      client_id: client1Id,
      type: 'billing',
      line1: 'Level 4, World Trade Centre',
      line2: 'Malleswaram West',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560055',
      country: 'India',
    },
  ]);

  await knex('client_communications').insert([
    {
      client_id: client1Id,
      type: 'meeting',
      summary: 'Q3 Technology Architecture alignment with leadership team.',
      date: '2026-09-10',
      created_by: adminUserId,
    },
    {
      client_id: client1Id,
      type: 'email',
      summary: 'Shared updated compliance and security penetration testing protocols.',
      date: '2026-09-22',
      created_by: adminUserId,
    },
  ]);

  // Client 2: Nexus Healthcare Technologies
  const [client2Id] = await knex('clients').insert({
    client_code: 'CL-0002',
    company_name: 'Nexus Healthcare Technologies',
    industry: 'Healthcare & Life Sciences',
    website: 'https://nexushealth.example.com',
    gstin: '27AABCN8521Q1Z4',
    status: 'active',
    notes: 'Healthtech innovator developing patient portals and telemedicine backends.',
  });

  await knex('client_contacts').insert([
    {
      client_id: client2Id,
      name: 'Dr. Vikram Patel',
      designation: 'Chief Digital Officer',
      email: 'vikram.patel@nexushealth.example.com',
      phone: '+91 98200 99887',
      is_primary: true,
    },
  ]);

  await knex('client_addresses').insert([
    {
      client_id: client2Id,
      type: 'office',
      line1: 'Olympus Park, Tower B',
      line2: 'Hiranandani Estate, Ghodbunder Road',
      city: 'Thane',
      state: 'Maharashtra',
      pincode: '400607',
      country: 'India',
    },
  ]);

  await knex('client_communications').insert([
    {
      client_id: client2Id,
      type: 'call',
      summary: 'Bi-weekly sprint check-in regarding HIPAA readiness on mobile app.',
      date: '2026-10-01',
      created_by: adminUserId,
    },
  ]);

  // Client 3: Vortex Retail Global
  const [client3Id] = await knex('clients').insert({
    client_code: 'CL-0003',
    company_name: 'Vortex Retail Global',
    industry: 'E-Commerce & Retail',
    website: 'https://vortexretail.example.com',
    gstin: '07AABCV1234M1Z2',
    status: 'active',
    notes: 'Omni-channel apparel and lifestyle chain operating 240+ retail outlets.',
  });

  await knex('client_contacts').insert([
    {
      client_id: client3Id,
      name: 'Ananya Roy',
      designation: 'Head of Omni-Channel Supply',
      email: 'ananya.roy@vortexretail.example.com',
      phone: '+91 99111 22334',
      is_primary: true,
    },
  ]);

  await knex('client_addresses').insert([
    {
      client_id: client3Id,
      type: 'office',
      line1: 'Building 10C, Cyber City',
      line2: 'DLF Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      country: 'India',
    },
  ]);

  await knex('client_communications').insert([
    {
      client_id: client3Id,
      type: 'meeting',
      summary: 'Demonstrated initial Kafka inventory reconciliation throughput.',
      date: '2026-09-28',
      created_by: adminUserId,
    },
  ]);

  // 5. Fetch employee IDs for PM and Members
  const managerEmp = await knex('employees').where({ email: 'manager@qynova.erp' }).first();
  const devEmp = await knex('employees').where({ email: 'employee@qynova.erp' }).first();
  const hrEmp = await knex('employees').where({ email: 'hr@qynova.erp' }).first();
  const internEmp = await knex('employees').where({ email: 'intern@qynova.erp' }).first();

  const managerId = managerEmp ? managerEmp.id : null;
  const devId = devEmp ? devEmp.id : null;
  const hrId = hrEmp ? hrEmp.id : null;
  const internId = internEmp ? internEmp.id : null;

  // 6. Seed 4 Projects
  // Project 1
  const [proj1Id] = await knex('projects').insert({
    project_code: 'PRJ-0001',
    client_id: client1Id,
    name: 'FinTech Core Banking Gateway',
    description: 'High-availability payment orchestration and settlement gateway with ISO20022 compliance.',
    project_manager_id: managerId,
    start_date: '2026-08-01',
    end_date: '2027-02-28',
    budget: 850000.0,
    technologies: JSON.stringify(['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Redis']),
    priority: 'high',
    status: 'development',
  });

  if (managerId && devId) {
    await knex('project_members').insert([
      {
        project_id: proj1Id,
        employee_id: managerId,
        role: 'manager',
        allocation_percent: 50,
        joined_at: '2026-08-01',
      },
      {
        project_id: proj1Id,
        employee_id: devId,
        role: 'developer',
        allocation_percent: 100,
        joined_at: '2026-08-01',
      },
    ]);
  }

  await knex('project_milestones').insert([
    {
      project_id: proj1Id,
      title: 'Architecture & API Spec',
      description: 'Complete OpenAPI schemas, ledger design, and auth integration.',
      due_date: '2026-08-31',
      amount: 150000.0,
      status: 'completed',
      completed_at: '2026-08-29 17:00:00',
    },
    {
      project_id: proj1Id,
      title: 'Payment Gateway Integration',
      description: 'Webhook listeners, NPCI switch simulator, idempotency layer.',
      due_date: '2026-10-31',
      amount: 350000.0,
      status: 'in_progress',
    },
    {
      project_id: proj1Id,
      title: 'UAT & Compliance Sign-off',
      description: 'Security audit remediation, end-to-end load testing at 1000 TPS.',
      due_date: '2027-01-31',
      amount: 350000.0,
      status: 'pending',
    },
  ]);

  // Project 2
  const [proj2Id] = await knex('projects').insert({
    project_code: 'PRJ-0002',
    client_id: client2Id,
    name: 'Nexus EHR Patient Mobile App',
    description: 'Cross-platform iOS and Android app for telemedicine consults and lab record viewing.',
    project_manager_id: managerId,
    start_date: '2026-09-15',
    end_date: '2027-03-31',
    budget: 620000.0,
    technologies: JSON.stringify(['React Native', 'TypeScript', 'GraphQL', 'AWS', 'Tailwind']),
    priority: 'critical',
    status: 'planning',
  });

  if (managerId && internId) {
    await knex('project_members').insert([
      {
        project_id: proj2Id,
        employee_id: managerId,
        role: 'manager',
        allocation_percent: 30,
        joined_at: '2026-09-15',
      },
      {
        project_id: proj2Id,
        employee_id: internId,
        role: 'qa',
        allocation_percent: 100,
        joined_at: '2026-09-15',
      },
    ]);
  }

  await knex('project_milestones').insert([
    {
      project_id: proj2Id,
      title: 'UX Wireframes & User Journey',
      description: 'Figma prototypes and doctor appointment workflow verification.',
      due_date: '2026-09-30',
      amount: 120000.0,
      status: 'completed',
      completed_at: '2026-09-28 14:00:00',
    },
    {
      project_id: proj2Id,
      title: 'HIPAA Compliance Architecture',
      description: 'End-to-end encryption for video telemetry and lab pdf storage.',
      due_date: '2026-11-15',
      amount: 200000.0,
      status: 'pending',
    },
    {
      project_id: proj2Id,
      title: 'Beta Release on TestFlight',
      description: 'Pilot launch to 500 patient cohort across 3 hospital chains.',
      due_date: '2027-02-15',
      amount: 300000.0,
      status: 'pending',
    },
  ]);

  // Project 3
  const [proj3Id] = await knex('projects').insert({
    project_code: 'PRJ-0003',
    client_id: client3Id,
    name: 'Vortex Omni-Channel Inventory Sync',
    description: 'Real-time inventory broadcast system synchronizing e-commerce orders with brick-and-mortar ERPs.',
    project_manager_id: hrId,
    start_date: '2026-06-01',
    end_date: '2026-11-30',
    budget: 450000.0,
    technologies: JSON.stringify(['Python', 'FastAPI', 'Redis', 'Kafka', 'MySQL']),
    priority: 'medium',
    status: 'testing',
  });

  if (devId) {
    await knex('project_members').insert([
      {
        project_id: proj3Id,
        employee_id: devId,
        role: 'developer',
        allocation_percent: 50,
        joined_at: '2026-06-01',
      },
    ]);
  }

  await knex('project_milestones').insert([
    {
      project_id: proj3Id,
      title: 'Catalog Sync Engine',
      description: 'Microservice listening to warehouse event stream.',
      due_date: '2026-07-31',
      amount: 200000.0,
      status: 'completed',
      completed_at: '2026-07-28 12:00:00',
    },
    {
      project_id: proj3Id,
      title: 'Inventory Reconciliation Test',
      description: 'Concurrent race condition load test across 50 simulated POS nodes.',
      due_date: '2026-10-31',
      amount: 250000.0,
      status: 'in_progress',
    },
  ]);

  // Project 4
  const [proj4Id] = await knex('projects').insert({
    project_code: 'PRJ-0004',
    client_id: client1Id,
    name: 'Acme Wealth Management Portal',
    description: 'Client-facing web portal for portfolio analytics, mutual fund orders, and tax reports.',
    project_manager_id: managerId,
    start_date: '2026-11-01',
    end_date: '2027-04-30',
    budget: 320000.0,
    technologies: JSON.stringify(['React', 'TypeScript', 'Tailwind', 'Go']),
    priority: 'low',
    status: 'proposal',
  });

  await knex('project_milestones').insert([
    {
      project_id: proj4Id,
      title: 'Proposal Defense & Scope Approval',
      description: 'Deliver detailed SOW and tech stack architecture document.',
      due_date: '2026-11-15',
      amount: 50000.0,
      status: 'in_progress',
    },
    {
      project_id: proj4Id,
      title: 'Sprint 0 Environment Provisioning',
      description: 'CI/CD pipeline and cloud VPC setup.',
      due_date: '2026-12-15',
      amount: 270000.0,
      status: 'pending',
    },
  ]);
}
