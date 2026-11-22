/**
 * HealthPilot ERP — Scenario Assertion Harness
 * Run: npx tsx scripts/run-scenario.ts
 */

import { PrismaClient } from "@prisma/client";
import { getBalance, getLedger } from "../src/lib/ledger";

const prisma = new PrismaClient();

type AssertResult = { name: string; passed: boolean; detail: string };
const results: AssertResult[] = [];

function assert(name: string, actual: number, expected: number) {
  const passed = actual === expected;
  results.push({
    name,
    passed,
    detail: passed ? `✅ ${actual}` : `❌ got ${actual}, want ${expected}`,
  });
}

async function main() {
  console.log("\n🔬  HealthPilot ERP — Final Scenario Assertions\n");

  const item = await prisma.item.findFirstOrThrow({ where: { code: "ITEM-IG-001" } });
  const central = await prisma.location.findFirstOrThrow({ where: { code: "LOC-CENTRAL" } });
  const branchA = await prisma.location.findFirstOrThrow({ where: { code: "LOC-BRA" } });

  // 1. Central Usable Final
  const centralUsable = await getBalance({ itemId: item.id, locationId: central.id, stockStatus: "USABLE" }, prisma);
  assert("Central USABLE stock = 40 (70 received - 30 transferred)", centralUsable, 40);

  // 2. Central Quarantine Final
  const centralQuarantine = await getBalance({ itemId: item.id, locationId: central.id, stockStatus: "QUARANTINE" }, prisma);
  assert("Central QUARANTINE stock = 20 (temp breach > 8°C)", centralQuarantine, 20);

  // 3. Central In-Transit Final
  const centralInTransit = await getBalance({ itemId: item.id, locationId: central.id, stockStatus: "IN_TRANSIT" }, prisma);
  assert("Central IN_TRANSIT stock = 0 (received at Branch A)", centralInTransit, 0);

  // 4. Branch A Usable Final
  const branchAUsable = await getBalance({ itemId: item.id, locationId: branchA.id, stockStatus: "USABLE" }, prisma);
  assert("Branch A USABLE stock = 25 (30 transferred - 5 dispensed)", branchAUsable, 25);

  // 5. Dispensed Qty
  const salesLines = await prisma.salesInvoiceLine.findMany();
  const soldQty = salesLines.reduce((s, l) => s + l.qty, 0);
  assert("Sold & Dispensed stock = 5 vials", soldQty, 5);

  // 6. COGS
  const cogs = salesLines.reduce((s, l) => s + Number(l.cogs), 0);
  assert("COGS = ₹2,500 (5 vials × ₹500 unit cost)", cogs, 2500);

  // 7. Supplier settlement match
  const invoice = await prisma.supplierInvoice.findFirstOrThrow();
  assert("Payable Amount = ₹36,750 (70 vials × ₹500 + 5% tax)", Number(invoice.payableAmount), 36750);
  assert("Disputed Amount = ₹15,750 (30 vials × ₹500 + 5% tax)", Number(invoice.disputedAmount), 15750);

  console.log("ASSERTION RESULTS");
  console.log("─".repeat(70));
  for (const r of results) {
    console.log(`  ${r.detail.padEnd(20)}  ${r.name}`);
  }
  const passed = results.filter((r) => r.passed).length;
  console.log(
    `\n  ${passed} / ${results.length} passed  ${passed === results.length ? "🎉 ALL CHECKS PASSED PERFECTLY!" : "⚠️"}\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
