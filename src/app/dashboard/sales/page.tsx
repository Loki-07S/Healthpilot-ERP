import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { DispenseModal } from '@/components/dispense-modal';

export default async function SalesPage() {
  const [list, branches, item] = await Promise.all([
    prisma.salesInvoice.findMany({
      include: { lines: { include: { item: true } }, location: true, payments: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.location.findMany({ where: { type: 'BRANCH' }, orderBy: { name: 'asc' } }),
    prisma.item.findFirst({ where: { code: 'ITEM-IG-001' } })
  ]);

  return (
    <PageContainer
      pageTitle='Sales / Dispense'
      pageDescription='FEFO batch picking · COGS at purchase cost — SAL-XXXX'
      pageHeaderAction={item && <DispenseModal branches={branches} itemId={item.id} />}
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'Location',
                'Date',
                'Qty',
                'Batch',
                'Sale Value',
                'COGS',
                'Tax %',
                'Payment',
                'Status'
              ].map((h) => (
                <th key={h} className='px-3 py-3 text-left font-medium'>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y'>
            {list.length === 0 && (
              <tr>
                <td colSpan={10} className='px-4 py-8 text-center text-muted-foreground'>
                  No sales yet.
                </td>
              </tr>
            )}
            {list.map((sale) => {
              const qty = sale.lines.reduce((s, l) => s + l.qty, 0);
              const saleVal = sale.lines.reduce((s, l) => s + Number(l.unitSalePrice) * l.qty, 0);
              const cogs = sale.lines.reduce((s, l) => s + Number(l.cogs), 0);
              const paid = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
              const batch = sale.lines[0]?.batchNumber ?? '—';
              return (
                <tr key={sale.id} className='hover:bg-muted/30'>
                  <td className='px-3 py-3 font-mono font-medium'>{sale.docNumber}</td>
                  <td className='px-3 py-3'>{sale.location.name}</td>
                  <td className='px-3 py-3'>{sale.postingDate.toISOString().slice(0, 10)}</td>
                  <td className='px-3 py-3 font-semibold'>{qty}</td>
                  <td className='px-3 py-3 font-mono text-xs'>{batch}</td>
                  <td className='px-3 py-3'>
                    ₹{saleVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className='px-3 py-3 text-blue-700 font-semibold'>
                    ₹{cogs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className='px-3 py-3'>{Number(sale.taxPct)}%</td>
                  <td className='px-3 py-3 text-green-700'>
                    ₹{paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className='px-3 py-3'>
                    <SalesBadge status={sale.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

function SalesBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    POSTED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700'
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}
