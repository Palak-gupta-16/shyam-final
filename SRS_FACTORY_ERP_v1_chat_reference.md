# Software Requirements Specification (SRS)

## Project
Factory ERP Management System (SHYAM Super App)

## Source of Truth
Requirements consolidated from shared reference chat:
- https://chatgpt.com/share/69a0ab0b-2240-8010-9b23-110b758dc307

## 1. Purpose
Build a factory ERP that digitizes dispatch, purchase, gate management, mill operations, inventory, store lifecycle, user/role control, billing, and analytics.

## 2. Scope
The system must provide:
- End-to-end dispatch and purchase workflows from order to vehicle exit.
- Mandatory fare capture before invoice/exit based on final clarified business rule.
- Dispatch-only invoice generation.
- Inventory reservation, shortage detection, blocked-order handling, and needed-items automation.
- Mill hourly and daily production with inventory adjustments.
- Store issue lifecycle including return, repair, and scrap/depreciation outcomes.
- Gate pass workflow with approval, entry, and exit tracking plus notifications.
- Role-based access and director-led user management.
- Reports and analytics with filtering/export.

## 3. Roles
- Guard
- Loading Supervisor
- Unloading Supervisor
- Weighbridge Operator
- Mill Supervisor
- Accounting
- Stock Manager
- Store Keeper
- General Manager
- Director

### 3.1 Role highlights
- Director: full access, user management (create/edit/delete/reset/deactivate).
- General Manager + Director: approvals (gate pass, oversight), reports view.
- Guard: create gate pass request, mark entered/exited after approval.
- Accounting: fare and invoice operations.
- Stock Manager: inventory and needed items.
- Store Keeper: store items and store request lifecycle.
- Mill Supervisor: hourly and daily mill reports.

## 4. Functional Requirements

## 4.1 Authentication and User Management
- Login fields: email, password, factory name.
- Director-only user creation fields:
  - full name, alias, email, role, password, confirm password, factory.
- User listing with filters by name/email/role/status/factory.
- Soft deactivate preferred over hard delete.
- Inactive users must be blocked from login.

## 4.2 Orders: Dispatch and Purchase
- Order creation without mandatory vehicle details at creation time.
- Add/edit vehicle details after order creation:
  - vehicle number, driver name, driver contact.
- Dispatch and purchase status transitions must be controlled and validated.

### 4.2.1 Dispatch flow
1. Order created
2. Vehicle approved/entered
3. Initial weight + unique slip no
4. Ready for loading
5. Loading accepted (supervisor)
6. Loading completed with bundle details
7. Final weight (slip prefilled)
8. Fare captured
9. Invoice generated (dispatch only)
10. Exit

### 4.2.2 Purchase flow
1. Order created
2. Initial weight + unique slip no
3. Ready for unloading
4. Unloading accepted
5. Unloading completed
6. Final weight
7. Fare captured
8. Exit

## 4.3 Weighbridge and Bundle Logic
- Slip number uniqueness.
- Dispatch net weight = final - initial.
- Purchase net weight = initial - final.
- Bundle-level capture supports multiple entries with size/weight.
- Quantity semantics for steel flow:
  - Quantity is in MT.
  - Pieces are bundle count.
  - Bundle weights drive loaded weight totals.
- Validation:
  - remaining = ordered MT - loaded MT.
  - remaining == 0 allow next; >0 warning; loaded > ordered error.
  - Optional tolerance (e.g., +- 50 KG) for weighbridge mismatch warnings.

## 4.4 Fare and Invoice
- Fare is mandatory in dispatch and purchase before completion.
- Fare fields:
  - fareAmount (required > 0)
  - paidBy (our_side/other_party)
  - paymentStatus (paid/unpaid)
  - notes (optional)
- Invoice rules:
  - only for dispatch orders.
  - no invoice for purchase.
  - invoice uses net weight MT, rate per MT, GST split (CGST/SGST), HSN, totals.

## 4.5 Inventory
- Types: finished_product, raw_material, waste_material.
- Fields include item name, description, size (conditional), quantity (MT), pieces, thresholds/status.
- Finished products: size-aware stock handling.
- Auto updates:
  - dispatch decreases finished stock.
  - purchase increases raw stock.
  - mill daily submission updates raw/finished/waste appropriately.
- Needed items should be system-calculated from low/out-of-stock/shortage.
- Reserved quantity must prevent overbooking.

## 4.6 Blocked Orders
- If dispatch cannot be fulfilled from available stock:
  - mark order blocked.
  - show blocked reason.
  - no process actions should be available while blocked.

## 4.7 Mill Operations
- Hourly report supports multiple entries per day.
- Hourly captures:
  - start/end time, shift (optional)
  - raw material used (size, pieces, weight per piece, total)
  - finished produced (size, pieces, weight per piece, total)
  - waste (miss rolls, cold miss rolls, etc.)
  - furnace timing
- Electricity meter readings should be daily (one time/day): start/end and consumption.
- Daily report auto-aggregates hourly values, remains editable until submitted, then lock.
- Daily submission triggers inventory adjustments.

## 4.8 Store Management
- Add item: name, specification, dimension, quantity, unit.
- Raise request: item/spec/dimension/qty/team/requestedBy/reason.
- Manager actions: approve/edit qty/reject based on stock check.
- Issue reduces stock.
- Post-issue lifecycle:
  - returned (adds stock)
  - under_repair -> repaired (stock flow per policy)
  - deprecated/scrapped (no stock return)
- Item history trail required.

## 4.9 Gate Management
- Guard can create gate pass request with:
  - vehicle no, driver name, driver contact, purpose, optional related order id.
- Approval by GM/Director.
- Status flow:
  - pending_approval -> approved/rejected -> inside_factory -> exited.
- Guard should mark entered/exited.
- Notify GM/Director by email on new request.

## 4.10 Reports and Analytics
- Domains:
  - production
  - inventory
  - dispatch/sales
  - purchase
  - store
  - gate
  - financial
  - electricity/furnace
- Filters:
  - date range, shift, size, customer, supplier, team, status
- Exports:
  - excel, pdf, print, email report

## 5. Non-Functional Requirements
- Secure auth (JWT), hashed passwords.
- Role checks on every protected API.
- Input validation and error handling.
- Activity logging/auditability.
- Scalable module structure.

## 6. Data Model Expectations
- users
- orders
- order history
- bundles/product loads
- inventory + inventory ledger
- gate_pass
- mill_hourly_report + daily_summary
- store items/requests/history
- fare/invoice fields in order or linked entities

## 7. Clarified Rule Precedence
When requirement statements conflict, use latest explicit business correction:
1. Fare is mandatory in both dispatch and purchase before completion.
2. Invoice is dispatch-only.
3. Dispatch stock shortage must block order and disable actions.

## 8. Acceptance Criteria (High-Level)
- Every module action respects role permissions and status transitions.
- Dispatch/purchase cannot complete without mandatory fare.
- Dispatch shortage creates blocked order with no executable actions.
- Gate requests capture contact and can progress through inside/exited states.
- Reports reflect actual backend data (not static mock values).
- Daily mill submission updates inventory correctly.
