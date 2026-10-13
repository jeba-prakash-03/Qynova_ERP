import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 1. Assign Role Permissions for Tasks
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
    { role_name: 'Manager', perm_name: 'tasks.view' },
    { role_name: 'Manager', perm_name: 'tasks.view_team' },
    { role_name: 'Manager', perm_name: 'tasks.view_own' },
    { role_name: 'Manager', perm_name: 'tasks.create' },
    { role_name: 'Manager', perm_name: 'tasks.edit' },
    { role_name: 'Manager', perm_name: 'tasks.delete' },
    { role_name: 'Manager', perm_name: 'tasks.assign' },
    { role_name: 'Employee', perm_name: 'tasks.view' },
    { role_name: 'Employee', perm_name: 'tasks.view_own' },
    { role_name: 'Employee', perm_name: 'tasks.edit' },
    { role_name: 'Intern', perm_name: 'tasks.view_own' },
    { role_name: 'Intern', perm_name: 'tasks.edit' },
  ];

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

  // 2. Fetch Projects and Employees
  const proj1 = await knex('projects').where({ project_code: 'PRJ-0001' }).first();
  const proj2 = await knex('projects').where({ project_code: 'PRJ-0002' }).first();
  if (!proj1 || !proj2) return;

  const managerEmp = await knex('employees').where({ email: 'manager@qynova.erp' }).first();
  const devEmp = await knex('employees').where({ email: 'employee@qynova.erp' }).first();
  const internEmp = await knex('employees').where({ email: 'intern@qynova.erp' }).first();
  const adminUser = await knex('users').where({ email: 'admin@qynova.erp' }).first();

  const managerId = managerEmp ? managerEmp.id : null;
  const devId = devEmp ? devEmp.id : null;
  const internId = internEmp ? internEmp.id : null;
  const adminUserId = adminUser ? adminUser.id : 1;

  // Clear existing tasks
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('task_history').del();
  await knex('task_comments').del();
  await knex('tasks').del();
  await knex('project_modules').del();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  // 3. Seed Modules
  const [mod1Id] = await knex('project_modules').insert({
    project_id: proj1.id,
    name: 'Security & Token Authentication',
    description: 'OAuth2/JWT token exchange and mTLS validation.',
  });

  const [mod2Id] = await knex('project_modules').insert({
    project_id: proj1.id,
    name: 'ISO20022 Message Parser',
    description: 'XML to JSON transformation engine for SWIFT payments.',
  });

  const [mod3Id] = await knex('project_modules').insert({
    project_id: proj2.id,
    name: 'WebRTC Consultation Engine',
    description: 'Peer-to-peer audio/video streaming room with chat.',
  });

  // 4. Seed Tasks for Project 1 (PRJ-0001)
  // Task 1: Parent task - todo
  const [task1Id] = await knex('tasks').insert({
    task_code: 'TASK-1001',
    project_id: proj1.id,
    module_id: mod1Id,
    title: 'Implement mTLS handshake for banking API gateway',
    description: 'Configure client certificate authentication and validation against CA trust store.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-10-25',
    estimated_hours: 24.0,
    created_by: adminUserId,
  });

  // Task 1.1: Subtask
  await knex('tasks').insert({
    task_code: 'TASK-1002',
    project_id: proj1.id,
    module_id: mod1Id,
    parent_task_id: task1Id,
    title: 'Generate test root and client certificate keystores',
    description: 'Create automated bash script to generate mock X.509 certs for local unit testing.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'medium',
    status: 'completed',
    due_date: '2026-10-18',
    estimated_hours: 8.0,
    created_by: adminUserId,
  });

  // Task 1.2: Subtask
  await knex('tasks').insert({
    task_code: 'TASK-1003',
    project_id: proj1.id,
    module_id: mod1Id,
    parent_task_id: task1Id,
    title: 'Add reverse proxy nginx configuration for TLS client verify',
    description: 'Inject SSL client verification headers into upstream backend requests.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-10-22',
    estimated_hours: 12.0,
    created_by: adminUserId,
  });

  // Task 2: Code Review state
  const [task2Id] = await knex('tasks').insert({
    task_code: 'TASK-1004',
    project_id: proj1.id,
    module_id: mod2Id,
    title: 'Pacs.008 customer credit transfer schema parser',
    description: 'Validate and extract credit transfer transaction fields into domain model.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'critical',
    status: 'code_review',
    due_date: '2026-10-20',
    estimated_hours: 16.0,
    created_by: adminUserId,
  });

  // Task 3: Testing state
  await knex('tasks').insert({
    task_code: 'TASK-1005',
    project_id: proj1.id,
    module_id: mod2Id,
    title: 'Kafka event publishing on transaction received',
    description: 'Ensure incoming payment transactions emit idempotent events to kafka topic.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'medium',
    status: 'testing',
    due_date: '2026-10-28',
    estimated_hours: 10.0,
    created_by: adminUserId,
  });

  // Task 4: Backlog
  await knex('tasks').insert({
    task_code: 'TASK-1006',
    project_id: proj1.id,
    module_id: mod2Id,
    title: 'Automated ISO20022 benchmark test suite',
    description: 'Load test message parser with 50,000 transactions per second benchmark.',
    assignee_id: devId,
    reviewer_id: managerId,
    priority: 'low',
    status: 'backlog',
    due_date: '2026-11-15',
    estimated_hours: 20.0,
    created_by: adminUserId,
  });

  // Task 5 for Project 2 (PRJ-0002) - assigned to intern
  await knex('tasks').insert({
    task_code: 'TASK-1007',
    project_id: proj2.id,
    module_id: mod3Id,
    title: 'Setup WebRTC STUN/TURN server configuration',
    description: 'Deploy coturn docker container for NAT traversal testing in staging environment.',
    assignee_id: internId,
    reviewer_id: managerId,
    priority: 'high',
    status: 'todo',
    due_date: '2026-10-24',
    estimated_hours: 14.0,
    created_by: adminUserId,
  });

  // 5. Seed Comments & History
  await knex('task_comments').insert([
    {
      task_id: task2Id,
      user_id: adminUserId,
      comment: 'Branch feature/pacs-008 ready for PR review. Unit tests pass with 96% coverage.',
    },
    {
      task_id: task1Id,
      user_id: adminUserId,
      comment: 'Initial certificate keystores generated and validated.',
    },
  ]);

  await knex('task_history').insert([
    {
      task_id: task1Id,
      user_id: adminUserId,
      field_changed: 'status',
      old_value: 'todo',
      new_value: 'in_progress',
    },
    {
      task_id: task2Id,
      user_id: adminUserId,
      field_changed: 'status',
      old_value: 'in_progress',
      new_value: 'code_review',
    },
  ]);
}

