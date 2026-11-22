/**
 * POST /api/credit-notes — create credit note against supplier invoice
 * GET  /api/credit-notes — list all
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { z } from 'zod';

const CreateCNSchema = z.object({
  supplierId: z.string(),
  invoiceId: z.string(),
  qtyReturned: z.number().int().positive(),
  creditAmount: z.number().positive(),
  reason: z.string().optional(),
  postingDate: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateCNSchema.parse(await req.json());
    const docNumber = await nextSeq('CN');

    const cn = await prisma.creditNote.create({
      data: {
        docNumber,
        supplierId: body.supplierId,
        invoiceId: body.invoiceId,
        qtyReturned: body.qtyReturned,
        creditAmount: body.creditAmount,
        reason: body.reason,
        postingDate: new Date(body.postingDate)
      }
    });

    // Update invoice status
    await prisma.supplierInvoice.update({
      where: { id: body.invoiceId },
      data: { status: 'APPROVED' }
    });

    return NextResponse.json(cn, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.creditNote.findMany({
    include: { supplier: true, invoice: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
