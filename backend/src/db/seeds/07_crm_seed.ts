import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing crm data
  await knex('lead_activities').del();
  await knex('leads').del();

  const employee = await knex('employees').first();
  const salespersonId = employee ? employee.id : null;
  const adminUser = await knex('users').first();
  const createdBy = adminUser ? adminUser.id : null;

  // Insert seed leads across stages
  const insertedLeads = await knex('leads').insert([
    {
      lead_code: 'LD-2026-0001',
      company_name: 'Tata Consultancy Services - AI Lab',
      contact_name: 'Vikram Malhotra',
      email: 'vikram.m@tcs-ailab.example.com',
      phone: '+91 98201 11223',
      source: 'LinkedIn',
      requirement: 'Enterprise Computer Vision pipeline deployment on AWS GovCloud for automated defects inspection.',
      estimated_value: 1250000.00,
      probability_percent: 80,
      expected_closing_date: '2026-11-15',
      salesperson_id: salespersonId,
      stage: 'negotiation',
      created_by: createdBy,
    },
    {
      lead_code: 'LD-2026-0002',
      company_name: 'Razorpay Financial Technologies',
      contact_name: 'Pooja Agarwal',
      email: 'pooja.agarwal@razorpay.example.com',
      phone: '+91 98450 33445',
      source: 'Referral',
      requirement: 'Core banking microservices audit, low-latency transaction processing refactor.',
      estimated_value: 850000.00,
      probability_percent: 60,
      expected_closing_date: '2026-11-30',
      salesperson_id: salespersonId,
      stage: 'proposal',
      created_by: createdBy,
    },
    {
      lead_code: 'LD-2026-0003',
      company_name: 'Zomato HyperPure Supply Chain',
      contact_name: 'Karan Mehra',
      email: 'karan.m@hyperpure.example.com',
      phone: '+91 99100 55667',
      source: 'Website',
      requirement: 'Cold storage IoT telematics and real-time fleet GPS dispatcher dashboard.',
      estimated_value: 620000.00,
      probability_percent: 30,
      expected_closing_date: '2026-12-10',
      salesperson_id: salespersonId,
      stage: 'requirement',
      created_by: createdBy,
    },
    {
      lead_code: 'LD-2026-0004',
      company_name: 'Freshworks SaaS Solutions',
      contact_name: 'Divya Krishnan',
      email: 'divya.k@freshworks.example.com',
      phone: '+91 94440 77889',
      source: 'Trade Show',
      requirement: 'Customer journey telemetry and real-time anomaly detection stream processing.',
      estimated_value: 450000.00,
      probability_percent: 10,
      expected_closing_date: '2026-12-20',
      salesperson_id: salespersonId,
      stage: 'lead',
      created_by: createdBy,
    },
    {
      lead_code: 'LD-2026-0005',
      company_name: 'Ola Electric Mobility',
      contact_name: 'Aditya Sen',
      email: 'aditya.sen@olaelectric.example.com',
      phone: '+91 98765 43210',
      source: 'Cold Outreach',
      requirement: 'Battery BMS firmware telematics gateway and MQTT data broker optimization.',
      estimated_value: 950000.00,
      probability_percent: 0,
      expected_closing_date: '2026-10-01',
      salesperson_id: salespersonId,
      stage: 'lost',
      lost_reason: 'Client selected internal OEM tooling and postponed third-party software procurement.',
      created_by: createdBy,
    },
  ]);

  // Insert initial lead activities
  const firstLead = await knex('leads').where({ lead_code: 'LD-2026-0001' }).first();
  if (firstLead) {
    await knex('lead_activities').insert([
      {
        lead_id: firstLead.id,
        type: 'meeting',
        title: 'Initial Discovery Call',
        description: 'Met with VP of Engineering to review high-level requirements and cloud security posture.',
        performed_by: createdBy,
      },
      {
        lead_id: firstLead.id,
        type: 'email',
        title: 'Sent Proposal & Architecture SOW',
        description: 'Sent commercial proposal outlining deliverables, milestone dates, and payment tranches.',
        performed_by: createdBy,
      },
    ]);
  }
}
