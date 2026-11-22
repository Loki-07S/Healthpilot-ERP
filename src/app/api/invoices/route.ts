/**
 * POST /api/invoices — create supplier invoice + Three-Way Match
 * GET  /api/invoices — list all
 *
 * Three-Way Match: PO qty ↔ GRN accepted qty ↔ Invoice qty
 * payable = accepted qty × unit cost
 * disputed = (invoiced - accepted) × unit cost
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { z } from 'zod';

const CreateInvoiceSchema = z.object({
  supplierId: z.string(),
  poId: z.string(),
  invoicedQty: z.number().int().positive(),
  invoicedAmount: z.number().positive(), // incl. tax as per supplier invoice
  taxAmount: z.number().min(0),
  postingDate: z.string(),
  notes: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateInvoiceSchema.parse(await req.json());
    const docNumber = await nextSeq('SI');

    // ── Three-Way Match ───────────────────────────────────────────────────────
    // Sum accepted qty from all POSTED/AMENDED GRNs against this PO
    const grnLines = await prisma.grnLine.findMany({
      where: {
        grn: {
          poId: body.poId,
          status: { in: ['POSTED'] }
        }
      }
    });

    const totalAccepted = grnLines.reduce((s, l) => s + l.qtyAccepted, 0);

    // Get PO line unit cost + tax
    const poLines = await prisma.purchaseOrderLine.findMany({
      where: { poId: body.poId }
    });
    const unitCost = Number(poLines[0]?.unitCost ?? 0);
    const taxPct = Number(poLines[0]?.taxPct ?? 5);

    const payableQty = Math.min(totalAccepted, body.invoicedQty);
    const disputedQty = body.invoicedQty - payableQty;

    const payableAmount = payableQty * unitCost * (1 + taxPct / 100);
    const disputedAmount = disputedQty * unitCost * (1 + taxPct / 100);

    const status = disputedQty > 0 ? 'DISCREPANT' : ('MATCHED' as const);

    const invoice = await prisma.supplierInvoice.create({
      data: {
        docNumber,
        supplierId: body.supplierId,
        poId: body.poId,
        invoicedQty: body.invoicedQty,
        invoicedAmount: body.invoicedAmount,
        payableAmount,
        disputedAmount,
        taxAmount: body.taxAmount,
        postingDate: new Date(body.postingDate),
        status,
        notes: body.notes
      }
    });

    return NextResponse.json(
      {
        invoice,
        threeWayMatch: {
          totalAccepted,
          payableQty,
          disputedQty,
          payableAmount,
          disputedAmount,
          status
        }
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.supplierInvoice.findMany({
    include: { supplier: true, po: true, creditNotes: true, payments: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
