/**
 * POST /api/grn/[id]/reverse — reverse a posted GRN (negate all ledger entries)
 * POST /api/grn/[id]/amend  — post amended GRN (creates new doc linked to reversed)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { postLedger } from '@/lib/ledger';
import { z } from 'zod';

// ─── Reverse ──────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;

  if (action === 'reverse') {
    return reverseGrn(id, req);
  }
  if (action === 'amend') {
    return amendGrn(id, req);
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
}

async function reverseGrn(id: string, req: NextRequest) {
  try {
    const body = await req.json();
    const postedById: string = body.postedById;

    const result = await prisma.$transaction(async (tx) => {
      const original = await tx.goodsReceiptNote.findUniqueOrThrow({
        where: { id },
        include: { lines: true }
      });

      if (original.status !== 'POSTED') {
        throw new Error('Only POSTED GRNs can be reversed');
      }

      // Mark original as REVERSED
      await tx.goodsReceiptNote.update({
        where: { id },
        data: { status: 'REVERSED' }
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          entity: 'GoodsReceiptNote',
          entityId: id,
          action: 'REVERSED',
          userId: postedById,
          before: { status: 'POSTED' },
          after: { status: 'REVERSED' }
        }
      });

      // Negate all ledger entries from this GRN
      const reversalEntries = original.lines.flatMap((l) => {
        const entries = [];
        if (l.qtyAccepted > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: original.locationId,
            batchNumber: l.batchNumber ?? undefined,
            expiryDate: l.expiryDate ?? undefined,
            stockStatus: 'USABLE' as const,
            qty: -l.qtyAccepted,
            unitCost: Number(l.unitCost),
            sourceDocType: 'GRN_REVERSAL',
            sourceDocId: id,
            postingDate: new Date(),
            postedById
          });
        }
        if (l.qtyRejected > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: original.locationId,
            batchNumber: l.batchNumber ?? undefined,
            expiryDate: l.expiryDate ?? undefined,
            stockStatus: 'QUARANTINE' as const,
            qty: -l.qtyRejected,
            unitCost: Number(l.unitCost),
            sourceDocType: 'GRN_REVERSAL',
            sourceDocId: id,
            postingDate: new Date(),
            postedById
          });
        }
        return entries;
      });

      await postLedger(reversalEntries, tx);

      return { reversed: id };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 400 }
    );
  }
}

// ─── Amend ────────────────────────────────────────────────────────────────────

const AmendGrnSchema = z.object({
  postedById: z.string(),
  challanRef: z.string().optional(),
  postingDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
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
    })
  )
});

async function amendGrn(originalId: string, req: NextRequest) {
  try {
    const body = AmendGrnSchema.parse(await req.json());

    const original = await prisma.goodsReceiptNote.findUniqueOrThrow({
      where: { id: originalId }
    });

    if (original.status !== 'REVERSED') {
      throw new Error('GRN must be REVERSED before amending');
    }

    const docNumber = await nextSeq('GRN');

    const amended = await prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceiptNote.create({
        data: {
          docNumber,
          poId: original.poId,
          locationId: original.locationId,
          challanRef: body.challanRef ?? original.challanRef,
          postingDate: new Date(body.postingDate),
          status: 'POSTED',
          amendedFromId: originalId,
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

      // Mark original as AMENDED
      await tx.goodsReceiptNote.update({
        where: { id: originalId },
        data: { status: 'AMENDED' }
      });

      // Post ledger for amended values
      const ledgerEntries = body.lines.flatMap((l) => {
        const entries = [];
        const postingDate = new Date(body.postingDate);
        if (l.qtyAccepted > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: original.locationId,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
            stockStatus: 'USABLE' as const,
            qty: l.qtyAccepted,
            unitCost: l.unitCost,
            sourceDocType: 'GRN_AMEND',
            sourceDocId: grn.id,
            postingDate,
            postedById: body.postedById
          });
        }
        if (l.qtyRejected > 0) {
          entries.push({
            itemId: l.itemId,
            locationId: original.locationId,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
            stockStatus: 'QUARANTINE' as const,
            qty: l.qtyRejected,
            unitCost: l.unitCost,
            sourceDocType: 'GRN_AMEND',
            sourceDocId: grn.id,
            postingDate,
            postedById: body.postedById
          });
        }
        return entries;
      });

      await postLedger(ledgerEntries, tx);

      await tx.auditLog.create({
        data: {
          entity: 'GoodsReceiptNote',
          entityId: grn.id,
          action: 'AMENDED',
          userId: body.postedById,
          before: { amendedFromId: originalId },
          after: { status: 'POSTED' }
        }
      });

      return grn;
    });

    return NextResponse.json(amended, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 400 }
    );
  }
}
