# HealthPilot ERP: Multi-Branch Hospital Pharmacy

Candidate build for the **HealthPilot.ai ERP Application Build Challenge**.

A working ERP prototype that tracks a medicine from branch demand through purchasing, receiving, correction, supplier settlement, inter-branch transfer and dispensing, built on an append-only stock ledger.

**Live demo:** https://healthpilot-erp-psi.vercel.app/  
**Source:** https://github.com/Loki-07S/Healthpilot-ERP

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL (Supabase), shadcn/ui + Tailwind CSS, deployed on Vercel.

---

## Run it

### Hosted
Open the live demo. The database is already seeded with the challenge scenario. Use the **Act As** role switcher in the top bar, or the staff directory at `/login`, to change persona.

### Locally
Requires Node.js 20.9+ and a PostgreSQL database (Supabase or Neon).

```bash
git clone https://github.com/Loki-07S/Healthpilot-ERP.git
cd Healthpilot-ERP
npm install

cp .env.example .env
# edit .env: set DATABASE_URL (pooled) and DIRECT_URL (direct)

npx prisma generate
npx prisma migrate deploy
npx prisma db seed            # master data only; opening stock = 0 everywhere

npm run scenario:execute      # runs the full 7-step challenge scenario
npm run scenario              # asserts the final position (8 checks)
npm run dev                   # http://localhost:3000
```

`npm run scenario:execute` resets all transactional data and replays the scenario, so it is also the way to return the database to the baseline after experimenting.

---

## Test personas

There is no password login. The role switcher selects a persona, and the UI shows only the actions that role may perform.

| Persona | Role | Main actions |
|---|---|---|
| Dr. Priya Sharma | `PHARMACIST` | Raise requisitions, confirm transfer receipt, dispense |
| Rajesh Patel | `PURCHASE_MANAGER` | Approve requisitions, issue purchase orders |
| Vikram Singh | `STORE_KEEPER` | Post GRNs, reverse and amend GRNs, dispatch transfers |
| Ananya Iyer | `ACCOUNTS` | Record supplier invoices, three-way match, credit notes |
| System Admin | `ADMIN` | All actions |

Role restrictions are enforced in the UI only (see "Left out").

---

## ERP terminology used

| Business step in the brief | Standard term | In the app |
|---|---|---|
| Branches raise stock requirements | **Material Requisition** | `MR-xxxx`; statuses Draft, Submitted, Approved, Rejected; line shows requested vs fulfilled qty (Partially Fulfilled) |
| Central team places supplier order | **Purchase Order (PO)** | `PO-xxxx`, linked to the source requisition line |
| Supplier delivery is received | **Goods Receipt Note (GRN)** | `GRN-xxxx` against the PO, with supplier **Delivery Challan** reference, batch and expiry |
| 70 usable vials | **Accepted quantity** | Posted as `USABLE` stock |
| 20 damaged vials | **Rejected quantity / Quarantine (blocked) stock** | Posted as `QUARANTINE`; never pickable for dispensing or transfer |
| 10 missing vials | **Short receipt (short delivery)** | Recorded on the GRN line only; no ledger entry because the goods never arrived |
| Wrong receiving transaction corrected | **GRN reversal and amendment (contra entry)** | Original GRN set to `REVERSED`; equal-and-opposite ledger entries; new GRN linked by `amendedFromId` |
| Invoice does not match | **Supplier Invoice with three-way match (PO, GRN, Invoice)** | Statuses Matched, Discrepant, Approved, Paid |
| Supplier agrees to credit | **Supplier Credit Note** | `CN-xxxx`, linked to the invoice |
| Stock moves between locations | **Stock Transfer with Stock in Transit** | `ST-xxxx`; Dispatched, then Received |
| Sale against prescription | **Sales Invoice / Dispensing** with **Payment** | `SAL-xxxx`, FEFO batch pick, COGS at purchase cost |
| Movement history | **Stock Ledger (append-only)** | `StockLedgerEntry`, one row per movement |

Stock statuses: `USABLE`, `QUARANTINE`, `IN_TRANSIT`.

---

## Final position (verified by `npm run scenario`)

| Metric | Expected | Actual |
|---|---|---|
| Usable stock, Central Warehouse | 40 | 40 |
| Usable stock, Branch A | 25 | 25 |
| Sold and dispensed, Branch A | 5 | 5 |
| Quarantine (damaged), Central | 20 | 20 |
| Short receipt (missing) | 10 | 10 |
| Total ordered | 100 | 100 |
| Payable to supplier | ₹36,750 | ₹36,750 |
| Disputed amount | ₹15,750 | ₹15,750 |
| COGS on dispensing | ₹2,500 | ₹2,500 |

---

## Assumptions and design decisions

1. **Append-only stock ledger.** Stock is never updated or deleted in place. Each movement is an inserted row (item, location, batch, stock status, qty, unit cost, source document, user, posting date). On-hand quantity is the sum of qty. The ledger is single-entry; each movement affects one location and status.
2. **Corrections use reversal and re-posting.** The original GRN, its user, timestamp and incorrect quantities stay visible. The reversal and the amended GRN record the correcting user, time and reason in the audit log.
3. **Short receipts do not hit stock.** Missing goods were never in the warehouse, so only the GRN line records them. The three-way match uses them to dispute the invoice.
4. **Quarantine is isolated by status.** FEFO picking and transfers select `USABLE` stock only.
5. **Three-way match uses accepted quantity** from non-reversed GRNs: payable = accepted qty x unit cost x (1 + tax); the rest of the invoiced quantity is disputed.
6. **Two-stage transfers.** Dispatch moves stock from `USABLE` to `IN_TRANSIT` at the source; receipt moves it to `USABLE` at the destination. The goods remain the sender's responsibility until receipt is confirmed.
7. **FEFO dispensing.** Batches are picked by earliest expiry. COGS is the purchase unit cost of the batches issued.
8. **Posting date and system time are separate.** Documents carry the business date from the scenario (September 2026) and an immutable `createdAt`.
9. **Negative stock is rejected** inside the posting transaction.

---

## Sources studied

- ERPNext / Frappe stock module documentation (Material Request, Purchase Receipt, Stock Ledger Entry, cancel and amend)
- SAP MM goods receipt and reversal concepts, and stock transport orders with stock in transit
- NetSuite inventory and purchasing documentation
- Open-source hospital information system documentation (HMIS wiki) on GRN, GRN return, batch tracking and bin cards
- GS1 healthcare guidance on lot, expiry and traceability

---

## AI tools used

- **Google Antigravity** (coding assistant) for scaffolding, boilerplate and scenario scripting.
- **Claude** (Anthropic) for planning, terminology review and code review.
- All AI output was reviewed by me. Business logic was validated with the scripted scenario (`scripts/run-scenario.ts`), which asserts the final stock and money positions.

## Important third-party components

- **next-shadcn-dashboard-starter** by Kiranism (MIT) as the UI shell: layout, sidebar, data tables and theming.
- **Next.js, React, Tailwind CSS, shadcn/ui, TanStack Table and Query, Recharts, Zod**
- **Prisma** ORM with **PostgreSQL** on **Supabase**; hosting on **Vercel**
- **Tabler Icons**

---

## Features intentionally left out

- **Real authentication and authorization.** A role switcher stands in for login, and the APIs are not authenticated. Production would use SSO with server-side permission checks.
- **Requisition consolidation.** Each requisition is sourced independently into its own PO; merging several branch requests into one PO is not implemented.
- **Return-to-vendor and disposal documents.** Damaged stock stays in quarantine; the physical return or disposal transaction is not modelled.
- **Multi-line matching.** The three-way match assumes one item line per PO.
- **Supplier payment execution.** Invoices reach an approved payable amount, but the payment run is not modelled.
- **Concurrency controls.** There is no row locking; the negative-stock guard in the ledger is the safeguard.
- **Barcode (GS1) scanning, EDI, label printing and multi-currency or GST filing.** Not needed for this scenario.

---

## Licence

MIT. See `LICENSE`.
