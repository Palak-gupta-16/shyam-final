# Parity Gap Analysis vs Chat Reference

## Baseline
Compared codebase implementation against SRS requirements derived from:
- SRS_FACTORY_ERP_v1_chat_reference.md
- https://chatgpt.com/share/69a0ab0b-2240-8010-9b23-110b758dc307

## Legend
- Done: implemented and wired.
- Partial: exists but incomplete/incorrect behavior.
- Missing: not implemented.

## 1. Authentication and Users
- Login and JWT auth: Done.
- Director role exists: Done.
- Director-only user lifecycle controls (full create/edit/deactivate/reset policy): Partial.
  - Current auth APIs provide create/edit/delete but not full status/soft-deactivate flow.

## 2. Orders (Dispatch/Purchase)
- Order without mandatory vehicle at creation: Done.
- Add vehicle details later: Done.
- Fare mandatory before invoice/exit: Done.
- Dispatch-only invoice generation: Done.
- Block order if insufficient dispatch inventory and no actions: Partial.
  - Backend blocks and reserves rollback implemented.
  - Frontend action suppression for blocked status not fully universal across all views.

## 3. Inventory / Needed Items
- Type-based inventory, size-aware finished product: Done/Partial.
- Needed items computed from shortage/low stock: Partial.
- Reserved quantity logic: Partial.
- Inventory ledger completeness: Partial/Missing.

## 4. Mill Operations
- Hourly report with categorized final/raw/waste backend processing: Done.
- Hourly frontend UX with required business fields and validations: Done/Partial.
- Daily report auto-aggregation/edit/submit lock behavior: Done.
- Electricity one-time-per-day constraints: Done.
- Inventory adjustments from mill daily submit: Partial (core logic present, policy details incomplete).

## 5. Store Management
- Current module is store issuance-oriented: Partial.
- Required request lifecycle (raised -> approved -> issued -> returned/repair/scrap): Missing/Partial.
- Repair/deprecated lifecycle states and history integration: Missing.

## 6. Gate Management
- Gate pass request/approve/reject exists: Done.
- Guard should create gate request: Done.
- Driver contact field capture: Done.
- Entry confirmation and exit tracking statuses (inside_factory/exited): Done.
- Email notifications to GM/Director on request: Partial.
  - SMTP-based hook implemented.
  - Actual email delivery depends on SMTP env configuration.

## 7. Reports and Analytics
- Reports page currently mostly static placeholders: Missing.
- Required analytics domains and computed metrics: Missing/Partial.
- Filtered backend-powered reports + export-ready datasets: Missing.

## 8. Current Priority Plan (Module-by-Module)

### Module 1 (Completed): Gate Refinements
- Added driver contact and optional related order id.
- Added status lifecycle support: pending_approval -> approved/rejected -> inside_factory -> exited.
- Added endpoints for mark entered and mark exited.
- Updated route role access: guard create and lifecycle actions; GM/Director approve/reject.
- Added SMTP email notification hook for approval request.
- Updated frontend gate pass page, API client, and TypeScript types.

### Module 2 (Completed): Store Lifecycle
- Added request-first lifecycle model with status states:
  - raised -> approved/rejected -> issued -> returned/under_repair -> repaired/scrapped.
- Added backend lifecycle endpoints:
  - approve, reject, issue, return, under-repair, repair, scrap.
- Added status transition checks and stock-safe inventory movement rules.
- Added request history tracking and expanded stats by status.
- Updated frontend store page, API service, and TypeScript types for live lifecycle actions.

### Module 3 (Completed): Mill Completion
- Added backend daily submission lock lifecycle:
  - draft -> submitted (locked from further edits).
- Added electricity meter capture model and API with one-time-per-day enforcement per daily summary.
- Added daily submission endpoint and route for lock semantics.
- Added daily auto-aggregation fallback from hourly reports for pieces, production hours, and breakdown summary.
- Updated frontend mill page/types/api for:
  - electricity reading capture on daily summary form,
  - daily status display (Draft/Submitted),
  - submit action from daily table.

### Module 4: Reports Analytics
- Build data-backed KPI endpoints and wire reports UI.
- Add filters and domain tabs using live metrics.

## 9. Notes
- This parity file will be updated after each module implementation pass.
