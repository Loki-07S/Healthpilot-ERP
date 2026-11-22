/**
 * POST /api/sales — create a sales invoice (dispense)
 * FEFO batch picking; COGS at purchase unit cost; blocks QUARANTINE/IN_TRANSIT
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { postLedger, pickFEFO } from '@/lib/ledger';
import { z } from 'zod';

const SalesLineSchema = z.object({
  itemId: z.string(),
  qty: z.number().int().positive(),
  unitSalePrice: z.number().positive()
});

const CreateSalesSchema = z.object({
  locationId: z.string(),
  postedById: z.string(),
  postingDate: z.string(),
  taxPct: z.number().min(0).default(5),
  paymentMethod: z.string().default('Card'),
  notes: z.string().optional(),
  lines: z.array(SalesLineSchema)
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateSalesSchema.parse(await req.json());
    const salDoc = await nextSeq('SAL');
    const payDoc = await nextSeq('PAY');
    const postingDate = new Date(body.postingDate);

    const sale = await prisma.$transaction(async (tx) => {
      // FEFO pick for each line
      const pickedLines: Array<{
        itemId: string;
        batchNumber: string;
        expiryDate: Date;
        qty: number;
        unitSalePrice: number;
        cogs: number;
      }> = [];

      for (const line of body.lines) {
        const picks = await pickFEFO(line.itemId, body.locationId, line.qty, prisma);
        for (const pick of picks) {
          pickedLines.push({
            itemId: line.itemId,
            batchNumber: pick.batchNumber,
            expiryDate: pick.expiryDate,
            qty: pick.qty,
            unitSalePrice: line.unitSalePrice,
            cogs: pick.qty * pick.unitCost
          });
        }
      }

      const totalSale = pickedLines.reduce((s, l) => s + l.qty * l.unitSalePrice, 0);
      const totalWithTax = totalSale * (1 + body.taxPct / 100);

      // Create invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          docNumber: salDoc,
          locationId: body.locationId,
          postingDate,
          status: 'POSTED',
          taxPct: body.taxPct,
          notes: body.notes,
          lines: {
            create: pickedLines.map((l) => ({
              itemId: l.itemId,
              batchNumber: l.batchNumber,
              expiryDate: l.expiryDate,
              qty: l.qty,
              unitSalePrice: l.unitSalePrice,
              cogs: l.cogs
            }))
          }
        },
        include: { lines: true }
      });

      // Create payment
      await tx.payment.create({
        data: {
          docNumber: payDoc,
          salesId: invoice.id,
          amount: totalWithTax,
          method: body.paymentMethod,
          postingDate,
          status: 'PAID'
        }
      });

      // Post ledger: −USABLE for each picked batch
      const ledgerEntries = pickedLines.map((l) => ({
        itemId: l.itemId,
        locationId: body.locationId,
        batchNumber: l.batchNumber,
        expiryDate: l.expiryDate,
        stockStatus: 'USABLE' as const,
        qty: -l.qty,
        unitCost: l.cogs / l.qty,
        sourceDocType: 'SALES',
        sourceDocId: invoice.id,
        postingDate,
        postedById: body.postedById
      }));

      await postLedger(ledgerEntries, tx);

      return { invoice, totalWithTax, cogs: pickedLines.reduce((s, l) => s + l.cogs, 0) };
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.salesInvoice.findMany({
    include: { lines: { include: { item: true } }, location: true, payments: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
