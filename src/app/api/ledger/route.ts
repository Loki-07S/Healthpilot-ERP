/**
 * GET /api/ledger — stock ledger report
 * Query params: itemId, locationId, stockStatus
 *
 * GET /api/ledger/balance — current balance summary per location
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLedger, getBalance } from '@/lib/ledger';
import { StockStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId') ?? '';
  const locationId = searchParams.get('locationId') ?? '';
  const stockStatus = searchParams.get('stockStatus') as StockStatus | null;

  if (!itemId || !locationId) {
    return NextResponse.json({ error: 'itemId and locationId required' }, { status: 400 });
  }

  const ledger = await getLedger(
    { itemId, locationId, stockStatus: stockStatus ?? undefined },
    prisma
  );
  const balance = await getBalance(
    { itemId, locationId, stockStatus: stockStatus ?? undefined },
    prisma
  );

  return NextResponse.json({ ledger, balance });
}
