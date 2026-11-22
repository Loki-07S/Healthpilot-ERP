# HealthPilot ERP — Project Context

## Stack

- **App:** Next.js 16 (App Router) + TypeScript + React 19
- **UI:** shadcn/ui (Base UI) + Tailwind CSS v4 — from next-shadcn-dashboard-starter
- **DB:** Postgres (Neon preferred, or Supabase as DB-only)
- **ORM:** Prisma
- **Auth:** Demo role switcher (no Clerk) — roles for review, not production security
- **Host:** Vercel
- **Package manager:** npm (Node 20+)

## Naming conventions

- UI and docs use **standard ERP terms** (not plain-English labels alone).
- Document numbers: `MR-0001`, `PO-0001`, `GRN-0001`, `SI-0001`, `CN-0001`, `ST-0001`, `SAL-0001`.
- Money in INR (₹). Quantities in vials. Dates as posting dates on documents.
- Stock statuses: `USABLE` | `QUARANTINE` | `IN_TRANSIT`.
- Ledger is **append-only** (insert only; corrections via reverse + amend).

## Terminology glossary (stub — expand Phase 1)

| Term | Meaning in this app |
|---|---|
| Material Requisition | Branch request for stock (store, item, qty, date, requester, reason, status) |
| Purchase Order (PO) | Formal supplier order linked to approved requisition line(s) |
| Goods Receipt Note (GRN) | Receiving document against PO; splits accepted / rejected / short |
| Short Receipt | Qty on supplier challan but not physically present (no stock posted) |
| Quarantine | Damaged / non-compliant stock present but not dispensable |
| Reverse & Amend | Correct a posted GRN without deleting history |
| Three-Way Match | Compare PO ↔ GRN (accepted) ↔ Supplier Invoice |
| Credit Note | Supplier credit for disputed / rejected / short qty |
| Stock Transfer | Inter-location move with Dispatch (In-Transit) and Receive |
| FEFO | First-Expiry-First-Out batch picking |
| COGS | Cost of goods sold at purchase unit cost when dispensing |
| Stock Ledger Entry | Immutable qty movement row by item/location/batch/status |

## Scenario anchor product

- Item: Insulin Glargine 100 IU/ml — unit Vial — refrigerated 2–8°C — purchase ₹500 — tax 5%
- Supplier: MediSupply Pharmaceuticals Pvt. Ltd.
- Locations: Central Pharmacy Warehouse, Branch A, Branch B, Branch C
- Opening stock: zero everywhere

## Cut order if behind

Polish → extra validation → Branch B/C beyond visibility → credit-note UI detail.  
**Never cut:** ledger, GRN reverse/amend, three-way match numbers, transfer states, dispense + COGS, document chain.
