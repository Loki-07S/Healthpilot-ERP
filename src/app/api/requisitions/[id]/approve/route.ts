/**
 * PUT /api/requisitions/[id]/approve — approve a Material Requisition
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mr = await prisma.materialRequisition.update({
    where: { id },
    data: { status: 'APPROVED' }
  });
  return NextResponse.json(mr);
}
