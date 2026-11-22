import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { GrnActions } from '@/components/grn-actions';

export default async function GrnPage() {
  const list = await prisma.goodsReceiptNote.findMany({
    include: { lines: { include: { item: true } }, po: true, location: true, amendedFrom: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <PageContainer
      pageTitle='Goods Receipt Notes'
      pageDescription='Receiving document against PO — accepted / rejected / short'
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'PO #',
                'Location',
                'Challan Ref',
                'Date',
                'Accepted',
                'Quarantine',
                'Short',
                'Status',
                'Amended From',
                'Action'
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
                <td colSpan={11} className='px-4 py-8 text-center text-muted-foreground'>
                  No GRNs yet.
                </td>
              </tr>
            )}
            {list.map((grn) => {
              const accepted = grn.lines.reduce((s, l) => s + l.qtyAccepted, 0);
              const rejected = grn.lines.reduce((s, l) => s + l.qtyRejected, 0);
              const short = grn.lines.reduce((s, l) => s + l.qtyShort, 0);
              return (
                <tr key={grn.id} className='hover:bg-muted/30'>
                  <td className='px-3 py-3 font-mono font-medium'>{grn.docNumber}</td>
                  <td className='px-3 py-3 font-mono'>{grn.po.docNumber}</td>
                  <td className='px-3 py-3'>{grn.location.name}</td>
                  <td className='px-3 py-3 font-mono text-xs'>{grn.challanRef ?? '—'}</td>
                  <td className='px-3 py-3'>{grn.postingDate.toISOString().slice(0, 10)}</td>
                  <td className='px-3 py-3 font-semibold text-green-700'>{accepted}</td>
                  <td className='px-3 py-3 font-semibold text-orange-600'>{rejected}</td>
                  <td className='px-3 py-3 font-semibold text-red-600'>{short}</td>
                  <td className='px-3 py-3'>
                    <GrnStatusBadge status={grn.status} />
                  </td>
                  <td className='px-3 py-3 font-mono text-xs text-muted-foreground'>
                    {grn.amendedFrom?.docNumber ?? '—'}
                  </td>
                  <td className='px-3 py-3'>
                    <GrnActions id={grn.id} status={grn.status} />
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

function GrnStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    POSTED: 'bg-green-100 text-green-700',
    REVERSED: 'bg-red-100 text-red-700',
    AMENDED: 'bg-yellow-100 text-yellow-700'
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}
