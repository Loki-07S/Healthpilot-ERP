/**
 * POST /api/requisitions — create a Material Requisition
 * GET  /api/requisitions — list all
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextSeq } from '@/lib/doc-utils';
import { z } from 'zod';

const CreateMRSchema = z.object({
  locationId: z.string(),
  requestedById: z.string(),
  postingDate: z.string(), // ISO date
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      itemDescription: z.string(),
      qtyRequested: z.number().int().positive(),
      unit: z.string().optional()
    })
  )
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateMRSchema.parse(await req.json());
    const docNumber = await nextSeq('MR');

    const mr = await prisma.materialRequisition.create({
      data: {
        docNumber,
        locationId: body.locationId,
        requestedById: body.requestedById,
        postingDate: new Date(body.postingDate),
        status: 'SUBMITTED',
        notes: body.notes,
        lines: {
          create: body.lines.map((l) => ({
            itemDescription: l.itemDescription,
            qtyRequested: l.qtyRequested,
            unit: l.unit ?? 'Vial'
          }))
        }
      },
      include: { lines: true }
    });

    return NextResponse.json(mr, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bad request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const list = await prisma.materialRequisition.findMany({
    include: { lines: true, location: true, requestedBy: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(list);
}
