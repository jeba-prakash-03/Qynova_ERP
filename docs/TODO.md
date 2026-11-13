# Qynova ERP – Remaining Future Integration Items (TODO)

This document tracks future integration items and cross-module enhancements retained in the codebase after the Phase 3 code hygiene pass.

## Completed Sprint Items (Verified & Tested)

| # | File | Component | Description | Status | Verification |
|---|------|-----------|-------------|--------|--------------|
| 1 | `backend/src/modules/invoices/invoices.service.ts` | Finance / Invoicing | Connect invoice dispatch directly to `emailService.sendInvoiceEmail(invoice)` for automated external client billing notifications. | **Completed** | Verified via `tests/finance.test.ts`: queues invoice email in `email_outbox` with recipient, subject, and status `pending`. |
| 2 | `backend/src/modules/employees/employees.service.ts` | HR / Payroll Integration | Automatic salary structure initialization hook upon employee creation inside Knex transaction (with fallback to accepted offer letter monthly gross). | **Completed** | Verified via `tests/employees.test.ts`: initializes `salary_structures` atomically with base salary and effective date. |

## Open Future Enhancements

*All documented baseline TODO items have been fully remediated and verified with automated integration tests.*     