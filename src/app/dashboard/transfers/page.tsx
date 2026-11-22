import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { TransferActions } from '@/components/transfer-actions';
import { NewTransferModal } from '@/components/new-transfer-modal';

export default async function TransfersPage() {
  const [list, central, branches, item] = await Promise.all([
    prisma.stockTransfer.findMany({
      include: { lines: { include: { item: true } }, fromLocation: true, toLocation: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.location.findFirst({ where: { code: 'LOC-CENTRAL' } }),
    prisma.location.findMany({ where: { type: 'BRANCH' }, orderBy: { name: 'asc' } }),
    prisma.item.findFirst({ where: { code: 'ITEM-IG-001' } })
  ]);

  return (
    <PageContainer
      pageTitle='Stock Transfers'
      pageDescription='Inter-location moves: Dispatch (In-Transit) → Receive (Usable)'
      pageHeaderAction={
        central &&
        item && (
          <NewTransferModal centralLocationId={central.id} branches={branches} itemId={item.id} />
        )
      }
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'From',
                'To',
                'Qty',
                'Batch',
                'Dispatched',
                'Received',
                'Status',
                'Action'
              ].map((h) => (
                <th key={h} className='px-4 py-3 text-left font-medium'>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y'>
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className='px-4 py-8 text-center text-muted-foreground'>
                  No transfers yet.
                </td>
              </tr>
            )}
            {list.map((st) => {
              const qty = st.lines.reduce((s, l) => s + l.qty, 0);
              const batch = st.lines[0]?.batchNumber ?? '—';
              return (
                <tr key={st.id} className='hover:bg-muted/30'>
                  <td className='px-4 py-3 font-mono font-medium'>{st.docNumber}</td>
                  <td className='px-4 py-3'>{st.fromLocation.name}</td>
                  <td className='px-4 py-3'>{st.toLocation.name}</td>
                  <td className='px-4 py-3 font-semibold'>{qty}</td>
                  <td className='px-4 py-3 font-mono text-xs'>{batch}</td>
                  <td className='px-4 py-3'>
                    {st.dispatchDate?.toISOString().slice(0, 10) ?? '—'}
                  </td>
                  <td className='px-4 py-3'>{st.receiveDate?.toISOString().slice(0, 10) ?? '—'}</td>
                  <td className='px-4 py-3'>
                    <TransferBadge status={st.status} />
                  </td>
                  <td className='px-4 py-3'>
                    <TransferActions
                      id={st.id}
                      status={st.status}
                      toLocationName={st.toLocation.name}
                    />
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

function TransferBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    DISPATCHED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500'
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}
