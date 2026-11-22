# HealthPilot ERP — Interview Defense & Demo Guide (15-Minute Playbook)

This guide prepares you to present, demonstrate, and defend your application during the interview review.

---

## 🎯 1. 30-Second Elevator Pitch

> *"HealthPilot ERP is a multi-branch hospital pharmacy management system designed around pharmaceutical cold-chain compliance and strict accounting auditability. Unlike typical CRUD apps, it features an **append-only stock ledger** where inventory is never modified in-place, an **immutable Reverse-and-Amend workflow** for receiving corrections, an automated **Three-Way Match** that safeguards hospital capital against delivery discrepancies, and strict **FEFO (First-Expiry-First-Out) batch picking** to protect patient safety."*

---

## ⏱️ 2. The 10-Minute Live Demo Flow

Follow this exact sequence when presenting the working prototype:

### Step 1: Baseline Position & Requisitions (2 mins)
1. Open **[Dashboard Overview](http://localhost:3000/dashboard/overview)**:
   - Point out the 6 target numbers: Central Usable (40), Branch A Usable (25), Quarantine (20), In-Transit (0), Dispensed (5), Short (10).
   - Point out Financials: Payable (₹36,750), Disputed (₹15,750), COGS (₹2,500).
2. Go to **Procurement → [Requisitions](http://localhost:3000/dashboard/requisitions)**:
   - Explain: *"Hospital branches don't buy directly from suppliers. They raise Material Requisitions. Here we see independent requests from Branch A (100), Branch B (40), and Branch C (60)."*
   - Act as **`PURCHASE_MANAGER`**: Click **`Approve`** on Branch B's request, then click **`Create PO`** to show live dynamic PO generation (`PO-0002`).

### Step 2: Receiving & The Error Correction Story (3 mins)
1. Go to **Procurement → [Purchase Orders](http://localhost:3000/dashboard/purchase-orders)**:
   - Explain: *"`PO-0001` was contracted with MediSupply for 100 vials @ ₹500 + 5% tax (₹52,500 total) delivered to Central Warehouse."*
2. Go to **Procurement → [Goods Receipt (GRN)](http://localhost:3000/dashboard/grn)**:
   - Show `GRN-0001` (Status: `REVERSED`) and `GRN-0002` (Status: `POSTED`, `Amended From: GRN-0001`).
   - Explain: *"The receiver initially made an error by recording all 100 vials as accepted. In healthcare GxP compliance, you never delete or silently edit a posted document. We executed a Reverse & Amend: the system posted a -100 reversal in the ledger and created GRN-0002 capturing the verified physical count: 70 Usable, 20 Quarantine due to temperature logger >8°C, and 10 Short delivery."*

### Step 3: Finance & Three-Way Match (2 mins)
1. Go to **Finance → [Supplier Invoices](http://localhost:3000/dashboard/invoices)**:
   - Explain: *"The supplier billed for 100 vials (₹52,500). The automated Three-Way Match compared the PO ordered quantity against physically accepted GRN stock (70 vials). It authorized ₹36,750 as Payable and quarantined ₹15,750 as Disputed with status `DISCREPANT`."*
2. Go to **Finance → [Credit Notes](http://localhost:3000/dashboard/credit-notes)**:
   - Show `CN-0001` where MediSupply credited the hospital ₹15,750 for the 30 non-viable vials, allowing accounts to approve the invoice.

### Step 4: Transfer & Dispensing (2 mins)
1. Go to **Inventory → [Stock Transfers](http://localhost:3000/dashboard/transfers)**:
   - Explain: *"To fulfill Branch A's requirement, 30 vials were dispatched. They were held in `IN_TRANSIT` status on the truck and converted to `USABLE` only after the Branch A Pharmacist confirmed receipt."*
2. Go to **Inventory → [Sales / Dispense](http://localhost:3000/dashboard/sales)**:
   - Show `SAL-0001`: *"5 vials dispensed against prescription RX-2026-8921. The FEFO engine picked the earliest-expiring batch (IG-SEP26-01). Revenue: ₹3,412.50. Cost of Goods Sold (COGS): ₹2,500 at purchase cost."*

### Step 5: Full Audit & Traceability (1 min)
1. Open **[Document Flow & Audit](http://localhost:3000/dashboard/traceability)**:
   - Show the end-to-end timeline tracing from Branch A's initial requisition all the way to patient dispensing with who acted and when.
2. Open **Inventory → [Stock Ledger](http://localhost:3000/dashboard/ledger)**:
   - Show the append-only ledger entries and running balances.

---

## 🛡️ 3. How to Answer Tough Interview Questions

### Q: "Why doesn't the Short Receipt (10 vials) show up in your stock ledger?"
> **Answer:** *"The stock ledger records physical asset movements. Because the 10 vials were never on the delivery vehicle, they never crossed the warehouse threshold. Posting an entry for non-existent stock would falsify physical inventory and asset valuation. Instead, the shortage is captured on `GoodsReceiptNoteLine.qtyShort` and used by the Three-Way Match engine to dispute the supplier invoice."*

### Q: "How do you guarantee damaged or quarantined stock is never given to a patient?"
> **Answer:** *"Isolation is enforced at two levels:
> 1. In the database, every stock movement carries a strict `StockStatus` enum (`USABLE`, `QUARANTINE`, `IN_TRANSIT`).
> 2. The `pickFEFO` algorithm and stock transfer engines filter exclusively for `stockStatus: 'USABLE'`. Any attempt to pick or dispense quarantined stock is rejected at the database transaction layer."*

### Q: "Why an append-only stock ledger instead of updating an `inventory` table?"
> **Answer:** *"In pharmaceutical ERPs, an in-place `UPDATE inventory SET qty = 40` destroys history. You cannot prove who changed the stock, why it changed, or detect inventory shrink/theft. An append-only ledger treats inventory like a bank account: balance is always calculated as `SUM(qty)`. Every change is an immutable entry tied to a source document and user."*

### Q: "If you had 2 more weeks, what would you add next?"
> **Answer:** *"Three things:
> 1. Batch barcode / GS1 DataMatrix scanning for receiving and bedside dispensing verification.
> 2. Automated email notifications and automated EDI 850/810 integration with pharmaceutical suppliers.
> 3. Production RBAC with SSO/SAML integration for hospital Active Directory."*

---

## 🛠️ Emergency Reset Command
If during testing you clicked buttons that changed the numbers, simply click the amber button on the Overview page:
**`↺ Reset to Challenge Baseline`**
Or run in terminal:
```bash
npx tsx scripts/execute-full-scenario.ts
```
It resets everything back to the exact 40/25/20/10 target state in under 5 seconds!
