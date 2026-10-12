import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Tasks Module & Server Workflow (Task 3)', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let internToken: string;
  let projectId: number;
  let devId: number;
  let managerId: number;

  beforeAll(async () => {
    await db('login_attempts').truncate();

    const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    const managerLogin = await request(app).post('/api/v1/auth/login').send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    const empLogin = await request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    const internLogin = await request(app).post('/api/v1/auth/login').send({ email: 'intern@qynova.erp', password: 'Intern@123' });

    adminToken = adminLogin.body?.data?.accessToken;
    managerToken = managerLogin.body?.data?.accessToken;
    employeeToken = empLogin.body?.data?.accessToken;
    internToken = internLogin.body?.data?.accessToken;

    const proj = await db('projects').where({ project_code: 'PRJ-0001' }).first();
    projectId = proj?.id || 1;

    const devEmp = await db('employees').where({ email: 'employee@qynova.erp' }).first();
    const managerEmp = await db('employees').where({ email: 'manager@qynova.erp' }).first();
    devId = devEmp?.id || 2;
    managerId = managerEmp?.id || 1;
  });

  describe('1. Task Creation & Constraints', () => {
    it('should create a task with TASK-xxxx code and assignee', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          project_id: projectId,
          title: 'Implement ISO20022 camt.053 statement parser',
          description: 'Parse bank-to-customer statement XML format.',
          assignee_id: devId,
          reviewer_id: managerId,
          priority: 'high',
          status: 'backlog',
          estimated_hours: 16,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task_code).toMatch(/^TASK-\d{4}$/);
      expect(res.body.data.status).toBe('backlog');
    });

    it('should REJECT assignment if employee is not a project member with 400 naming assignee_id', async () => {
      // HR is not assigned to PRJ-0001
      const hrEmp = await db('employees').where({ email: 'hr@qynova.erp' }).first();

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          project_id: projectId,
          title: 'Unauthorized assignment task',
          assignee_id: hrEmp.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.errors || res.body)).toContain('assignee_id');
    });
  });

  describe('2. Server-Enforced Workflow Lifecycle', () => {
    let testTaskId: number;

    beforeEach(async () => {
      // Create fresh task in backlog
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: projectId,
          title: 'Workflow progression test task',
          assignee_id: devId,
          reviewer_id: managerId,
          priority: 'medium',
          status: 'backlog',
        });
      testTaskId = res.body.data.id;
    });

    it('should REJECT invalid jump (backlog -> code_review) with 400 naming allowed next statuses', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'code_review' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Allowed next statuses');
      expect(res.body.message).toContain('todo');
    });

    it('should complete valid forward workflow: backlog > todo > in_progress > code_review > testing > qa_passed > completed', async () => {
      // 1. backlog -> todo (done by manager)
      const res1 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'todo' });
      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('todo');

      // 2. todo -> in_progress (done by assignee dev)
      const res2 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });
      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('in_progress');

      // 3. in_progress -> code_review (done by assignee dev)
      const res3 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'code_review' });
      expect(res3.status).toBe(200);
      expect(res3.body.data.status).toBe('code_review');

      // 4. code_review -> testing (done by reviewer manager)
      const res4 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'testing' });
      expect(res4.status).toBe(200);
      expect(res4.body.data.status).toBe('testing');

      // 5. testing -> qa_passed (done by reviewer manager)
      const res5 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'qa_passed' });
      expect(res5.status).toBe(200);
      expect(res5.body.data.status).toBe('qa_passed');

      // 6. qa_passed -> completed
      const res6 = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'completed' });
      expect(res6.status).toBe(200);
      expect(res6.body.data.status).toBe('completed');
    });

    it('should support rejection flow: code_review -> changes_required -> in_progress', async () => {
      // Advance to in_progress
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'todo' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${employeeToken}`).send({ status: 'in_progress' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${employeeToken}`).send({ status: 'code_review' });

      // Reviewer requests changes
      const rejectRes = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'changes_required', comment: 'Missing unit test coverage for edge cases.' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('changes_required');

      // Assignee moves back to in_progress
      const resumeRes = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'in_progress' });

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe('in_progress');
    });

    it('should block non-assignee employee from submitting task to code_review (403)', async () => {
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'todo' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'in_progress' });

      // Intern (not the assignee) tries to submit to code_review
      const res = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${internToken}`)
        .send({ status: 'code_review' });

      expect(res.status).toBe(403);
    });

    it('should block non-reviewer employee from moving task to testing or changes_required (403)', async () => {
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'todo' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${employeeToken}`).send({ status: 'in_progress' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${employeeToken}`).send({ status: 'code_review' });

      // Assignee cannot approve their own code review
      const res = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'testing' });

      expect(res.status).toBe(403);
    });

    it('should BLOCK parent task completion if subtasks are incomplete with 400', async () => {
      // Create subtask under testTaskId
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: projectId,
          parent_task_id: testTaskId,
          title: 'Incomplete subtask',
          status: 'in_progress',
        });

      // Try to complete parent task directly
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'todo' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'in_progress' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'code_review' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'testing' });
      await request(app).patch(`/api/v1/tasks/${testTaskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'qa_passed' });

      const completeRes = await request(app)
        .patch(`/api/v1/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(completeRes.status).toBe(400);
      expect(completeRes.body.message).toContain('subtask');
    });
  });

  describe('3. Comments, History & My Tasks', () => {
    it('should add comment and fetch task history timeline', async () => {
      const task = await db('tasks').where({ project_id: projectId }).first();

      const commentRes = await request(app)
        .post(`/api/v1/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comment: 'Fixing edge cases discovered in staging testing.' });

      expect(commentRes.status).toBe(201);
      expect(commentRes.body.data.comment).toContain('Fixing edge cases');

      // Fetch task details with comments and history
      const detailRes = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.comments.length).toBeGreaterThanOrEqual(1);
      expect(detailRes.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('should return employee assigned tasks on /api/v1/tasks/my', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/my')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
