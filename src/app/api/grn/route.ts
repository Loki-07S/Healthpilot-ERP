/**
 * POST /api/grn — create + post a GRN
 *
 * Business rules:
 *  - accepted → +USABLE
 *  - rejected  → +QUARANTINE
 *  - short     → no ledger entry (qty on challan not physically present)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { postLedger } from '@/lib/ledger';
import { z } from 'zod';

const GrnLineSchema = z.object({
  poLineId: z.string(),
  itemId: z.string(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  qtyOrdered: z.number().int(),
  qtyDelivered: z.number().int(),
  qtyAccepted: z.number().int(),
  qtyRejected: z.number().int(),
  unitCost: z.number().positive(),
  notes: z.string().optional()
});

const CreateGrnSchema = z.object({
  poId: z.string(),
  locationId: z.string(),
  challanRef: z.string().optional(),
  postingDate: z.string(),
  postedById: z.string(),
  notes: z.string().optional(),
  lines: z.array(GrnLineSchema)
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateGrnSchema.parse(await req.json());
    const docNumber = await nextSeq('GRN');

    const grn = await prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceiptNote.create({
        data: {
          docNumber,
          poId: body.poId,
          locationId: body.locationId,
          challanRef: body.challanRef,
          postingDate: new Date(body.postingDate),
          status: 'POSTED',
          notes: body.notes,
          lines: {
            create: body.lines.map((l) => ({
              poLineId: l.poLineId,
              itemId: l.itemId,
              batchNumber: l.batchNumber,
              expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
              qtyOrdered: l.qtyOrdered,
              qtyDelivered: l.qtyDelivered,
              qtyAccepted: l.qtyAccepted,
              qtyRejected: l.qtyRejected,
              qtyShort: l.qtyDelivered - l.qtyAccepted - l.qtyRejected,
              unitCost: l.unitCost,
              notes: l.notes
            }))
          }
        },
        include: { lines: true }
      });

      // Build ledger entries
      const ledgerEntries = body.lines.flatMap((l) => {
        const entries = [];
        const postingDate = new Date(body.postingDate);

        if (l.qtyAccepted > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: body.locationId,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
            stockStatus: 'USABLE' as const,
            qty: l.qtyAccepted,
            unitCost: l.unitCost,
            sourceDocType: 'GRN',
            sourceDocId: grn.id,
            postingDate,
            postedById: body.postedById
          });
        }

        if (l.qtyRejected > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: body.locationId,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
            stockStatus: 'QUARANTINE' as const,
            qty: l.qtyRejected,
            unitCost: l.unitCost,
            sourceDocType: 'GRN',
            sourceDocId: grn.id,
            postingDate,
            postedById: body.postedById
          });
        }

        return entries;
      });

      await postLedger(ledgerEntries, tx);

      return grn;
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.goodsReceiptNote.findMany({
    include: { lines: { include: { item: true } }, po: true, location: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
