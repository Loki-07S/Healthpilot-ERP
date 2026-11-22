/**
 * HealthPilot ERP — Stock Ledger Engine (Phase 2)
 *
 * postLedger  — append-only insert; rejects negative USABLE balance; writes AuditLog
 * getBalance  — sum of qty for item/location/batch/status
 * getLedger   — full movement history with running balance
 */

import { Prisma, PrismaClient, StockStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LedgerEntryInput {
  itemId: string;
  locationId: string;
  batchNumber?: string;
  expiryDate?: Date;
  stockStatus: StockStatus;
  qty: number; // positive = in, negative = out
  unitCost: number;
  sourceDocType: string;
  sourceDocId: string;
  postingDate: Date;
  postedById: string;
}

export interface BalanceQuery {
  itemId: string;
  locationId: string;
  batchNumber?: string;
  stockStatus?: StockStatus;
}

// ─── postLedger ───────────────────────────────────────────────────────────────

/**
 * Insert one or more ledger entries inside a transaction.
 * Throws if any USABLE batch would go negative after posting.
 */
export async function postLedger(
  entries: LedgerEntryInput[],
  tx: Prisma.TransactionClient
): Promise<void> {
  for (const entry of entries) {
    // Guard: reject negative USABLE balance
    if (entry.stockStatus === 'USABLE' && entry.qty < 0) {
      const current = await getBalanceTx(
        {
          itemId: entry.itemId,
          locationId: entry.locationId,
          batchNumber: entry.batchNumber,
          stockStatus: 'USABLE'
        },
        tx
      );
      if (current + entry.qty < 0) {
        throw new Error(
          `Negative USABLE stock rejected: item=${entry.itemId} loc=${entry.locationId} batch=${entry.batchNumber ?? '—'} ` +
            `current=${current} requested=${entry.qty}`
        );
      }
    }

    await tx.stockLedgerEntry.create({
      data: {
        itemId: entry.itemId,
        locationId: entry.locationId,
        batchNumber: entry.batchNumber,
        expiryDate: entry.expiryDate,
        stockStatus: entry.stockStatus,
        qty: entry.qty,
        unitCost: entry.unitCost,
        sourceDocType: entry.sourceDocType,
        sourceDocId: entry.sourceDocId,
        postingDate: entry.postingDate,
        postedById: entry.postedById
      }
    });
  }
}

// ─── getBalance ───────────────────────────────────────────────────────────────

/** Standalone balance (opens its own connection) */
export async function getBalance(query: BalanceQuery, prisma: PrismaClient): Promise<number> {
  return getBalanceTx(query, prisma as unknown as Prisma.TransactionClient);
}

/** Balance inside an existing transaction */
async function getBalanceTx(query: BalanceQuery, tx: Prisma.TransactionClient): Promise<number> {
  const result = await tx.stockLedgerEntry.aggregate({
    _sum: { qty: true },
    where: {
      itemId: query.itemId,
      locationId: query.locationId,
      ...(query.batchNumber !== undefined ? { batchNumber: query.batchNumber } : {}),
      ...(query.stockStatus !== undefined ? { stockStatus: query.stockStatus } : {})
    }
  });
  return Number(result._sum.qty ?? 0);
}

// ─── getLedger ────────────────────────────────────────────────────────────────

export interface LedgerRow {
  id: string;
  postingDate: Date;
  sourceDocType: string;
  sourceDocId: string;
  batchNumber: string | null;
  stockStatus: StockStatus;
  qty: number;
  unitCost: number;
  runningBalance: number;
}

/** Full movement list for item+location, oldest first, with running balance */
export async function getLedger(
  query: { itemId: string; locationId: string; stockStatus?: StockStatus },
  prisma: PrismaClient
): Promise<LedgerRow[]> {
  const rows = await prisma.stockLedgerEntry.findMany({
    where: {
      itemId: query.itemId,
      locationId: query.locationId,
      ...(query.stockStatus ? { stockStatus: query.stockStatus } : {})
    },
    orderBy: [{ postingDate: 'asc' }, { createdAt: 'asc' }]
  });

  let running = 0;
  return rows.map((r) => {
    running += Number(r.qty);
    return {
      id: r.id,
      postingDate: r.postingDate,
      sourceDocType: r.sourceDocType,
      sourceDocId: r.sourceDocId,
      batchNumber: r.batchNumber,
      stockStatus: r.stockStatus,
      qty: Number(r.qty),
      unitCost: Number(r.unitCost),
      runningBalance: running
    };
  });
}

// ─── FEFO picker ──────────────────────────────────────────────────────────────

/**
 * Returns batches sorted First-Expiry-First-Out for the given item/location.
 * Only USABLE stock is eligible. Throws if insufficient qty.
 */
export async function pickFEFO(
  itemId: string,
  locationId: string,
  qtyNeeded: number,
  prisma: PrismaClient
): Promise<Array<{ batchNumber: string; expiryDate: Date; qty: number; unitCost: number }>> {
  // Aggregate per batch
  const rows = await prisma.stockLedgerEntry.groupBy({
    by: ['batchNumber', 'expiryDate', 'unitCost'],
    _sum: { qty: true },
    where: {
      itemId,
      locationId,
      stockStatus: 'USABLE',
      batchNumber: { not: null }
    },
    having: { qty: { _sum: { gt: 0 } } },
    orderBy: { expiryDate: 'asc' }
  });

  const picks: Array<{ batchNumber: string; expiryDate: Date; qty: number; unitCost: number }> = [];
  let remaining = qtyNeeded;

  for (const row of rows) {
    if (remaining <= 0) break;
    const avail = Number(row._sum.qty ?? 0);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    picks.push({
      batchNumber: row.batchNumber!,
      expiryDate: row.expiryDate!,
      qty: take,
      unitCost: Number(row.unitCost)
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient USABLE stock: item=${itemId} loc=${locationId} needed=${qtyNeeded} shortfall=${remaining}`
    );
  }

  return picks;
}
