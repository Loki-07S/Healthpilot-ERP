/**
 * POST /api/purchase-orders — create a PO
 * Supports:
 *   1. From requisition: { reqId: "...", notes?: "..." }
 *   2. Custom: { supplierId, deliverToId, postingDate, expectedDate, lines: [...] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { z } from 'zod';

const CustomPOSchema = z.object({
  supplierId: z.string(),
  deliverToId: z.string(),
  postingDate: z.string(),
  expectedDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      itemId: z.string(),
      reqLineId: z.string().optional(),
      qtyOrdered: z.number().int().positive(),
      unitCost: z.number().positive(),
      taxPct: z.number().min(0)
    })
  )
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    // Option A: Quick create from Requisition ID
    if (json.reqId) {
      const mr = await prisma.materialRequisition.findUniqueOrThrow({
        where: { id: json.reqId },
        include: { lines: true, location: true }
      });

      const defaultSupplier = await prisma.supplier.findFirstOrThrow({
        where: { code: 'SUP-001' }
      });
      const centralLocation = await prisma.location.findFirstOrThrow({
        where: { code: 'LOC-CENTRAL' }
      });
      const defaultItem = await prisma.item.findFirstOrThrow({ where: { code: 'ITEM-IG-001' } });

      const docNumber = await nextSeq('PO');
      const po = await prisma.purchaseOrder.create({
        data: {
          docNumber,
          supplierId: defaultSupplier.id,
          deliverToId: centralLocation.id,
          postingDate: new Date(),
          expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days expected
          status: 'APPROVED',
          notes:
            json.notes ??
            `Replenishment order fulfilling requirement ${mr.docNumber} (${mr.location.name})`,
          lines: {
            create: mr.lines.map((l) => ({
              itemId: l.itemId ?? defaultItem.id,
              reqLineId: l.id,
              qtyOrdered: l.qtyRequested,
              unitCost: defaultItem.purchaseCost,
              taxPct: defaultItem.taxPct
            }))
          }
        },
        include: { lines: true, supplier: true, deliverTo: true }
      });

      return NextResponse.json(po, { status: 201 });
    }

    // Option B: Full custom schema
    const body = CustomPOSchema.parse(json);
    const docNumber = await nextSeq('PO');

    const po = await prisma.purchaseOrder.create({
      data: {
        docNumber,
        supplierId: body.supplierId,
        deliverToId: body.deliverToId,
        postingDate: new Date(body.postingDate),
        expectedDate: new Date(body.expectedDate),
        status: 'APPROVED',
        notes: body.notes,
        lines: {
          create: body.lines.map((l) => ({
            itemId: l.itemId,
            reqLineId: l.reqLineId,
            qtyOrdered: l.qtyOrdered,
            unitCost: l.unitCost,
            taxPct: l.taxPct
          }))
        }
      },
      include: { lines: true, supplier: true, deliverTo: true }
    });

    return NextResponse.json(po, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.purchaseOrder.findMany({
    include: {
      lines: {
        include: {
          item: true,
          reqLine: { include: { requisition: { include: { location: true } } } }
        }
      },
      supplier: true,
      deliverTo: true,
      grns: true
    },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
