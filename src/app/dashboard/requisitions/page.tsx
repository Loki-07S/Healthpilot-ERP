import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { RequisitionActions } from '@/components/requisition-actions';

export default async function RequisitionsPage() {
  const list = await prisma.materialRequisition.findMany({
    include: {
      lines: {
        include: {
          poLines: {
            include: {
              po: { select: { docNumber: true } }
            }
          }
        }
      },
      location: true,
      requestedBy: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <PageContainer
      pageTitle='Material Requisitions'
      pageDescription='Branch requests for stock — MR-XXXX'
      pageHeaderAction={
        <Link
          href='/dashboard/requisitions/new'
          className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          + New Requisition
        </Link>
      }
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'Location',
                'Requested By',
                'Date',
                'Lines',
                'Fulfillment',
                'Status',
                'Actions'
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
                <td colSpan={8} className='px-4 py-8 text-center text-muted-foreground'>
                  No requisitions yet.
                </td>
              </tr>
            )}
            {list.map((mr) => {
              const reqQty = mr.lines.reduce((s, l) => s + l.qtyRequested, 0);
              const fulQty = mr.lines.reduce((s, l) => s + l.qtyFulfilled, 0);
              const linkedPos = Array.from(
                new Set(mr.lines.flatMap((l) => l.poLines.map((pl) => pl.po.docNumber)))
              );
              const hasPo = linkedPos.length > 0;
              const poDocNumber = linkedPos[0] ?? null;

              return (
                <tr key={mr.id} className='hover:bg-muted/30'>
                  <td className='px-4 py-3 font-mono font-medium'>{mr.docNumber}</td>
                  <td className='px-4 py-3 font-medium'>{mr.location.name}</td>
                  <td className='px-4 py-3'>{mr.requestedBy.name}</td>
                  <td className='px-4 py-3'>{mr.postingDate.toISOString().slice(0, 10)}</td>
                  <td className='px-4 py-3 font-semibold'>{reqQty} vials</td>
                  <td className='px-4 py-3'>
                    <span className='font-mono font-medium text-xs'>
                      {fulQty > 0
                        ? `${fulQty} / ${reqQty} (${Math.round((fulQty / reqQty) * 100)}%)`
                        : '0%'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <StatusBadge status={mr.status} />
                  </td>
                  <td className='px-4 py-3'>
                    <RequisitionActions
                      id={mr.id}
                      docNumber={mr.docNumber}
                      status={mr.status}
                      lines={mr.lines.map((l) => ({
                        id: l.id,
                        itemId: l.itemId,
                        qtyRequested: l.qtyRequested,
                        itemDescription: l.itemDescription
                      }))}
                      hasPo={hasPo}
                      poDocNumber={poDocNumber}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
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
