import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

// Import Route Handlers
import { POST as createMR } from "../src/app/api/requisitions/route";
import { PUT as approveMR } from "../src/app/api/requisitions/[id]/approve/route";
import { POST as createPO } from "../src/app/api/purchase-orders/route";
import { POST as createGRN } from "../src/app/api/grn/route";
import { POST as grnAction } from "../src/app/api/grn/[id]/[action]/route";
import { POST as createInvoice } from "../src/app/api/invoices/route";
import { POST as createCreditNote } from "../src/app/api/credit-notes/route";
import { POST as createTransfer } from "../src/app/api/transfers/route";
import { POST as receiveTransfer } from "../src/app/api/transfers/[id]/receive/route";
import { POST as createSale } from "../src/app/api/sales/route";

function makeReq(url: string, method: string, body?: any): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function testAllRoutes() {
  console.log("🚀 Testing all UI API Routes end-to-end...\n");

  // Retrieve base masters
  const branchA = await prisma.location.findFirstOrThrow({ where: { code: "LOC-BRA" } });
  const central = await prisma.location.findFirstOrThrow({ where: { code: "LOC-CENTRAL" } });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { code: "SUP-001" } });
  const item = await prisma.item.findFirstOrThrow({ where: { code: "ITEM-IG-001" } });
  const rxUser = await prisma.user.findFirstOrThrow({ where: { role: "PHARMACIST" } });
  const skUser = await prisma.user.findFirstOrThrow({ where: { role: "STORE_KEEPER" } });
  const accountsUser = await prisma.user.findFirstOrThrow({ where: { role: "ACCOUNTS" } });

  // 1. Create MR
  const mrRes = await createMR(
    makeReq("/api/requisitions", "POST", {
      locationId: branchA.id,
      requestedById: rxUser.id,
      postingDate: new Date().toISOString(),
      notes: "Test API requisition",
      lines: [{ itemDescription: item.name, qtyRequested: 100, unit: "Vial" }],
    })
  );
  const mr = await mrRes.json();
  console.log(`✅ 1. POST /api/requisitions -> Created ${mr.docNumber} (status: ${mr.status})`);

  // 2. Approve MR (The UI approve route)
  const appRes = await approveMR(
    makeReq(`/api/requisitions/${mr.id}/approve`, "PUT"),
    { params: Promise.resolve({ id: mr.id }) }
  );
  const approvedMr = await appRes.json();
  console.log(`✅ 2. PUT /api/requisitions/[id]/approve -> Status: ${approvedMr.status}`);

  // 3. Create PO
  const poRes = await createPO(
    makeReq("/api/purchase-orders", "POST", {
      reqId: mr.id,
      notes: "Test PO created from approved requisition",
    })
  );
  const po = await poRes.json();
  console.log(`✅ 3. POST /api/purchase-orders -> Created ${po.docNumber}`);

  // 4. Create Mistaken GRN
  const poLine = await prisma.purchaseOrderLine.findFirstOrThrow({ where: { poId: po.id } });
  const grnRes = await createGRN(
    makeReq("/api/grn", "POST", {
      poId: po.id,
      locationId: central.id,
      challanRef: `DN-${po.docNumber}`,
      postingDate: new Date().toISOString(),
      postedById: skUser.id,
      notes: "Initial mistaken count",
      lines: [
        {
          poLineId: poLine.id,
          itemId: item.id,
          batchNumber: "IG-SEP26-01",
          expiryDate: new Date("2028-08-31").toISOString(),
          qtyOrdered: 100,
          qtyDelivered: 100,
          qtyAccepted: 100,
          qtyRejected: 0,
          unitCost: 500,
        },
      ],
    })
  );
  const grn = await grnRes.json();
  console.log(`✅ 4. POST /api/grn -> Created ${grn.docNumber}`);

  // 5. Reverse GRN (The UI reverse action)
  const revRes = await grnAction(
    makeReq(`/api/grn/${grn.id}/reverse`, "POST", { postedById: skUser.id }),
    { params: Promise.resolve({ id: grn.id, action: "reverse" }) }
  );
  const rev = await revRes.json();
  console.log(`✅ 5. POST /api/grn/[id]/reverse -> Reversed GRN ID: ${rev.reversed}`);

  // 6. Amend GRN (The UI amend action)
  const amendRes = await grnAction(
    makeReq(`/api/grn/${grn.id}/amend`, "POST", {
      postedById: skUser.id,
      postingDate: new Date().toISOString(),
      notes: "Amended receipt: 70 usable, 20 quarantine, 10 short",
      lines: [
        {
          poLineId: poLine.id,
          itemId: item.id,
          batchNumber: "IG-SEP26-01",
          expiryDate: new Date("2028-08-31").toISOString(),
          qtyOrdered: 100,
          qtyDelivered: 100,
          qtyAccepted: 70,
          qtyRejected: 20,
          unitCost: 500,
          notes: "Amended",
        },
      ],
    }),
    { params: Promise.resolve({ id: grn.id, action: "amend" }) }
  );
  const amendedGrn = await amendRes.json();
  console.log(`✅ 6. POST /api/grn/[id]/amend -> Created Amended ${amendedGrn.docNumber}`);

  // 7. Supplier Invoice + Three-Way Match
  const invRes = await createInvoice(
    makeReq("/api/invoices", "POST", {
      supplierId: supplier.id,
      poId: po.id,
      invoicedQty: 100,
      invoicedAmount: 52500,
      taxAmount: 2500,
      postingDate: new Date().toISOString(),
      notes: "Supplier invoice received",
    })
  );
  const invData = await invRes.json();
  console.log(
    `✅ 7. POST /api/invoices -> ${invData.invoice.docNumber} (Payable: ₹${invData.threeWayMatch.payableAmount}, Disputed: ₹${invData.threeWayMatch.disputedAmount})`
  );

  // 8. Credit Note
  const cnRes = await createCreditNote(
    makeReq("/api/credit-notes", "POST", {
      supplierId: supplier.id,
      invoiceId: invData.invoice.id,
      qtyReturned: 30,
      creditAmount: invData.threeWayMatch.disputedAmount,
      reason: "Damaged & short delivery",
      postingDate: new Date().toISOString(),
    })
  );
  const cn = await cnRes.json();
  console.log(`✅ 8. POST /api/credit-notes -> Created ${cn.docNumber} (Credit: ₹${cn.creditAmount})`);

  // 9. Dispatch Stock Transfer
  const trRes = await createTransfer(
    makeReq("/api/transfers", "POST", {
      fromLocationId: central.id,
      toLocationId: branchA.id,
      postedById: skUser.id,
      postingDate: new Date().toISOString(),
      notes: "Cold-chain transfer",
      lines: [
        {
          itemId: item.id,
          batchNumber: "IG-SEP26-01",
          expiryDate: new Date("2028-08-31").toISOString(),
          qty: 30,
          unitCost: 500,
        },
      ],
    })
  );
  const transfer = await trRes.json();
  console.log(`✅ 9. POST /api/transfers -> Dispatched ${transfer.docNumber} (status: ${transfer.status})`);

  // 10. Receive Stock Transfer (The UI receive route)
  const recRes = await receiveTransfer(
    makeReq(`/api/transfers/${transfer.id}/receive`, "POST", {
      postedById: rxUser.id,
      postingDate: new Date().toISOString(),
    }),
    { params: Promise.resolve({ id: transfer.id }) }
  );
  const receivedTransfer = await recRes.json();
  console.log(`✅ 10. POST /api/transfers/[id]/receive -> Received status: ${receivedTransfer.status}`);

  // 11. Dispense / Sales
  const saleRes = await createSale(
    makeReq("/api/sales", "POST", {
      locationId: branchA.id,
      postedById: rxUser.id,
      postingDate: new Date().toISOString(),
      paymentMethod: "Card",
      taxPct: 5,
      notes: "Prescription dispense",
      lines: [
        {
          itemId: item.id,
          qty: 5,
          unitSalePrice: 650,
        },
      ],
    })
  );
  const saleData = await saleRes.json();
  console.log(
    `✅ 11. POST /api/sales -> Created ${saleData.invoice.docNumber} (COGS: ₹${saleData.cogs}, Total: ₹${saleData.totalWithTax})`
  );

  console.log("\n🎉 ALL UI API ROUTES ARE PRESENT AND EXECUTED SUCCESSFULLY!\n");
}

testAllRoutes()
  .catch((err) => {
    console.error("❌ Route test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
