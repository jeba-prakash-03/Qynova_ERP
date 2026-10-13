# Qynova ERP – Remaining Future Integration Items (TODO)

This document tracks future integration items and cross-module enhancements retained in the codebase after the Phase 3 code hygiene pass.

| # | File | Component | Description | Priority |
|---|------|-----------|-------------|----------|
| 1 | `backend/src/modules/invoices/invoices.service.ts:193` | Finance / Invoicing | Connect invoice dispatch directly to `emailService.sendInvoiceEmail(invoice)` for automated external client billing notifications when client portal is expanded. | Medium |
| 2 | `backend/src/modules/employees/employees.service.ts:215` | HR / Payroll Integration | Automatic salary structure initialization hook upon employee creation once payroll salary structure defaults are configured per designation grade. | Low |
