/**
 * Phase 3 — Requisition → PO → GRN flow
 * API Routes: POST /api/requisitions, PUT /api/requisitions/[id]/approve
 *             POST /api/purchase-orders
 *             POST /api/grn, POST /api/grn/[id]/reverse, POST /api/grn/[id]/amend
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function docNumber(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

async function nextSeq(prefix: string): Promise<string> {
  // Count existing docs of that type for auto-numbering
  const counts: Record<string, () => Promise<number>> = {
    MR: () => prisma.materialRequisition.count(),
    PO: () => prisma.purchaseOrder.count(),
    GRN: () => prisma.goodsReceiptNote.count(),
    SI: () => prisma.supplierInvoice.count(),
    CN: () => prisma.creditNote.count(),
    ST: () => prisma.stockTransfer.count(),
    SAL: () => prisma.salesInvoice.count(),
    PAY: () => prisma.payment.count()
  };
  const count = await (counts[prefix]?.() ?? Promise.resolve(0));
  return docNumber(prefix, count + 1);
}

export { nextSeq };
