/**
 * POST /api/transfers — create + dispatch a stock transfer
 * GET  /api/transfers — list all
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { postLedger } from '@/lib/ledger';
import { z } from 'zod';

const TransferLineSchema = z.object({
  itemId: z.string(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  qty: z.number().int().positive(),
  unitCost: z.number().positive()
});

const CreateTransferSchema = z.object({
  fromLocationId: z.string(),
  toLocationId: z.string(),
  postedById: z.string(),
  postingDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(TransferLineSchema)
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateTransferSchema.parse(await req.json());
    const docNumber = await nextSeq('ST');

    const transfer = await prisma.$transaction(async (tx) => {
      const st = await tx.stockTransfer.create({
        data: {
          docNumber,
          fromLocationId: body.fromLocationId,
          toLocationId: body.toLocationId,
          status: 'DISPATCHED',
          dispatchDate: new Date(body.postingDate),
          notes: body.notes,
          lines: {
            create: body.lines.map((l) => ({
              itemId: l.itemId,
              batchNumber: l.batchNumber,
              expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
              qty: l.qty,
              unitCost: l.unitCost
            }))
          }
        },
        include: { lines: true }
      });

      const postingDate = new Date(body.postingDate);

      // Dispatch: −USABLE from source, +IN_TRANSIT at source (virtual)
      const ledgerEntries = body.lines.flatMap((l) => [
        {
          itemId: l.itemId,
          locationId: body.fromLocationId,
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
          stockStatus: 'USABLE' as const,
          qty: -l.qty,
          unitCost: l.unitCost,
          sourceDocType: 'TRANSFER_DISPATCH',
          sourceDocId: st.id,
          postingDate,
          postedById: body.postedById
        },
        {
          itemId: l.itemId,
          locationId: body.fromLocationId,
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
          stockStatus: 'IN_TRANSIT' as const,
          qty: l.qty,
          unitCost: l.unitCost,
          sourceDocType: 'TRANSFER_DISPATCH',
          sourceDocId: st.id,
          postingDate,
          postedById: body.postedById
        }
      ]);

      await postLedger(ledgerEntries, tx);
      return st;
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.stockTransfer.findMany({
    include: { lines: { include: { item: true } }, fromLocation: true, toLocation: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
