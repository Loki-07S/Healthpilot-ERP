/**
 * POST /api/transfers/[id]/receive — receive a dispatched transfer
 * −IN_TRANSIT at source, +USABLE at destination
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postLedger } from '@/lib/ledger';
import { z } from 'zod';

const ReceiveSchema = z.object({ postedById: z.string(), postingDate: z.string() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = ReceiveSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const st = await tx.stockTransfer.findUniqueOrThrow({
        where: { id },
        include: { lines: true }
      });

      if (st.status !== 'DISPATCHED') {
        throw new Error('Transfer must be DISPATCHED to receive');
      }

      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receiveDate: new Date(body.postingDate) }
      });

      const postingDate = new Date(body.postingDate);

      const ledgerEntries = st.lines.flatMap((l) => [
        // Clear IN_TRANSIT at source
        {
          itemId: l.itemId,
          locationId: st.fromLocationId,
          batchNumber: l.batchNumber ?? undefined,
          expiryDate: l.expiryDate ?? undefined,
          stockStatus: 'IN_TRANSIT' as const,
          qty: -l.qty,
          unitCost: Number(l.unitCost),
          sourceDocType: 'TRANSFER_RECEIVE',
          sourceDocId: id,
          postingDate,
          postedById: body.postedById
        },
        // Add USABLE at destination
        {
          itemId: l.itemId,
          locationId: st.toLocationId,
          batchNumber: l.batchNumber ?? undefined,
          expiryDate: l.expiryDate ?? undefined,
          stockStatus: 'USABLE' as const,
          qty: l.qty,
          unitCost: Number(l.unitCost),
          sourceDocType: 'TRANSFER_RECEIVE',
          sourceDocId: id,
          postingDate,
          postedById: body.postedById
        }
      ]);

      await postLedger(ledgerEntries, tx);
      return { received: id };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 400 }
    );
  }
}
