# HealthPilot ERP — Multi-Branch Hospital Pharmacy

> **HealthPilot.ai Candidate Build Challenge**  
> An enterprise-grade, append-only pharmacy ERP tracking medicines from branch demand through procurement, receiving, immutable error correction, three-way match supplier settlement, inter-branch transfer, and FEFO dispensing.

---

## 🚀 Quick Start & Run Instructions

### Prerequisites
- **Node.js**: v20+ (`>= 20.9.0`)
- **Database**: PostgreSQL (Supabase / Neon connection string)

### 1. Installation & Environment
```bash
# Clone the repository and navigate into the app
cd healthpilot-erp

# Copy environment template
cp .env.example .env
# Ensure DATABASE_URL and DIRECT_URL are configured in .env
```

### 2. Database Migration & Baseline Seed
```bash
# Generate Prisma Client & apply schema migrations
npx prisma generate
npx prisma migrate dev

# Seed foundational master records (opening stock = 0 at all locations)
npx prisma db seed
```

### 3. Run Scenario & Automated Verification (8/8 Checks)
```bash
# Execute the full challenge scenario (MR -> PO -> GRN -> Reversal/Amend -> Invoice -> Transfer -> Dispense)
npx tsx scripts/execute-full-scenario.ts

# Run the automated 8-point challenge assertion test suite
npx tsx scripts/run-scenario.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👥 Demo Staff Personas & Credentials

The application includes a staff role switcher in the top navigation bar and a dedicated authentication directory at **`/login`** to demonstrate role segregation:

| Staff Member | Persona Role | Authorized ERP Operations | Forbidden Actions |
|---|---|---|---|
| **Dr. Priya Sharma** | `PHARMACIST` | Create Requisitions (`MR-XXXX`), Confirm Transfer Receipt, Dispense Prescriptions (`SAL-XXXX`) | Cannot approve MRs, issue POs, receive supplier GRNs, or approve invoices |
| **Rajesh Patel** | `PURCHASE_MANAGER` | Review & Approve Branch Requisitions, Issue Supplier Purchase Orders (`PO-XXXX`) | Cannot record GRN deliveries or dispense medicines |
| **Vikram Singh** | `STORE_KEEPER` | Receive Goods Receipt Notes (`GRN-XXXX`), Reverse & Amend Receipts, Dispatch Stock Transfers | Cannot approve purchase orders or dispense prescriptions |
| **Ananya Iyer** | `ACCOUNTS` | Three-Way Match Verification, Record Supplier Invoices (`SI-XXXX`), Issue Credit Notes (`CN-XXXX`) | Cannot physically receive, transfer, or dispense stock |
| **System Admin** | `ADMIN` | All operations + System Configuration + One-Click Challenge Baseline Reset | Unrestricted |

---

## 📖 Standard ERP Terminology Mapping (Challenge 40% Weight)

The challenge prompt intentionally uses plain language for business operations. The table below maps each business step to standard industry ERP terminology:

| Challenge Plain Language | Standard ERP Document / Concept | System Code & Implementation |
|---|---|---|
| *"Hospital branches raise stock requirements"* | **Material Requisition (MR)** | `MR-0001` to `MR-0006` |
| *"Central team places supplier order"* | **Purchase Order (PO)** | `PO-0001` (linked to source MR) |
| *"Supplier delivery arrives"* | **Goods Receipt Note (GRN)** | `GRN-0001` (Delivery Challan reference) |
| *"Completed receiving transaction is wrong"* | **Reverse & Amend / Contra Ledger** | Equal-and-opposite ledger entry (`-100`) + Amended `GRN-0002` |
| *"Damaged vials"* | **Quarantine Inventory (Hold)** | `QUARANTINE` status (isolated from dispensing) |
| *"Missing from delivery"* | **Short Delivery / Discrepancy** | Tracked on GRN; excluded from physical stock ledger |
| *"Supplier invoice does not match"* | **Three-Way Match Discrepancy** | Automated formula: PO qty ↔ GRN accepted qty ↔ Invoice |
| *"Supplier agrees to credit note"* | **Credit Note (Supplier AP Memo)** | `CN-0001` (offsets accounts payable discrepancy) |
| *"Vials move between locations"* | **Inter-Branch Stock Transfer (ST)** | `ST-0001` with explicit `IN_TRANSIT` status |
| *"Sell and dispense against prescription"* | **Sales Invoice / Prescription Dispense** | `SAL-0001` with **FEFO** batch selection & COGS recognition |
| *"Movement history & balance"* | **Stock Ledger (Double-Entry / Append-Only)** | `StockLedgerEntry` table (`SUM(qty)`) |

---

## 📊 End-to-End Scenario Reconciliation (Target vs Actual)

| Inventory / Financial Metric | Challenge Target Specification | Actual Verified System State | Status |
|---|---|---|---|
| **Central Warehouse — Usable Stock** | 40 vials | **40 vials** | ✅ MATCH |
| **Central Warehouse — Quarantine Stock** | 20 vials | **20 vials** | ✅ MATCH |
| **Central Warehouse — In-Transit Stock** | 0 vials | **0 vials** | ✅ MATCH |
| **Branch A — Usable Stock** | 25 vials | **25 vials** | ✅ MATCH |
| **Branch A — Dispensed Stock** | 5 vials | **5 vials** | ✅ MATCH |
| **Short Delivery (Missing)** | 10 vials | **10 vials** | ✅ MATCH |
| **Total Vials Accounted For** | **100 vials** | **100 vials** | ✅ MATCH |
| **Supplier Invoice Total** | ₹52,500 | **₹52,500** | ✅ MATCH |
| **Payable to Supplier** | ₹36,750 | **₹36,750** | ✅ MATCH |
| **Disputed Supplier Amount** | ₹15,750 | **₹15,750** | ✅ MATCH |
| **Credit Note Issued** | ₹15,750 | **₹15,750** | ✅ MATCH |
| **COGS Recognized at Dispensing** | ₹2,500 | **₹2,500** | ✅ MATCH |

---

## 🔍 Assumptions & Architecture Decisions

1. **Append-Only Immutable Ledger**: Stock balances are never modified using SQL `UPDATE` or `DELETE`. Every movement is an immutable insert (`StockLedgerEntry`). The on-hand balance for any item, location, or batch is calculated as `SUM(qty)`.
2. **Reverse & Amend Pattern**: Corrections to completed transactions post equal-and-opposite contra entries (`qty = -100`), preserving the full historical audit trail including original creator, timestamps, error reason, and correcting officer.
3. **Short Delivery Accounting**: Missing vials (10 vials) are documented on the GRN document record but do not generate physical ledger entries since goods were never physically present in the warehouse.
4. **Cold-Chain Quarantine Isolation**: Damaged vials (temperature breach > 8°C) are registered under `QUARANTINE` status and strictly isolated so they cannot be picked by FEFO or dispatched on inter-branch transfers.
5. **FEFO (First-Expiry, First-Out)**: Dispensing queries batches ordered by `expiryDate ASC` and automatically prevents dispensing from non-usable stock statuses.
6. **Two-Stage Stock Transfers**: Inter-branch transfers transition through an explicit `IN_TRANSIT` state between central dispatch and branch receipt to eliminate phantom stock.

---

## 📚 Sources Studied
- **SAP ERP & NetSuite Inventory Management**: Standard documentation on Goods Receipt PO matching, Return-to-Vendor, and Stock Transport Orders (STO).
- **ERPNext / Frappe Framework**: Core design patterns for immutable `Stock Ledger Entry`, Reverse & Amend document workflows, and Three-Way Match verification.
- **GS1 Healthcare Standards**: Best practices for pharmaceutical traceability, lot/batch tracking, expiry date management, and cold-chain temperature control.

---

## 🤖 AI Tools Used
- **Google Antigravity Agentic AI Assistant**: Architecture formulation, scaffolding, TypeScript validation, and scenario execution testing.
- **Validation**: All AI-assisted code was tested and confirmed using automated determinism scripts (`scripts/run-scenario.ts`) ensuring 100% compliance with business calculations.

---

## 📦 Important Third-Party Components
- **Next.js 16 (App Router) & React 19**: Server Component architecture and streaming.
- **Prisma ORM 6**: Schema-first modeling with relations, database migrations, and transactional batching.
- **Tailwind CSS & shadcn/ui**: Modern, accessible ERP component primitives.
- **@tabler/icons-react**: Clean, consistent icon set for actions, document workflows, and audit statuses.

---

## 🛠️ AI Tools & Disclosure
- Developed with assistance from **Google Antigravity Agentic AI Assistant**.
- All business logic, ledger rules, and financial calculations were validated against the challenge specification and confirmed by deterministic assertion suites.
