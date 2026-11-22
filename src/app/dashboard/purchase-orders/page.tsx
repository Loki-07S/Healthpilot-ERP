import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { GrnModal } from '@/components/grn-modal';
import { NewPOModal } from '@/components/new-po-modal';

export default async function PurchaseOrdersPage() {
  const [list, locations, approvedRequisitions, item, supplier] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        lines: {
          include: {
            item: true,
            reqLine: { include: { requisition: { include: { location: true } } } }
          }
        },
        supplier: true,
        deliverTo: true,
        grns: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.materialRequisition.findMany({
      where: { status: 'APPROVED' },
      include: { location: true, lines: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.item.findFirst({ where: { code: 'ITEM-IG-001' } }),
    prisma.supplier.findFirst({ where: { code: 'SUP-001' } })
  ]);

  const serializedReqs = approvedRequisitions.map((r) => ({
    id: r.id,
    docNumber: r.docNumber,
    location: { name: r.location.name },
    lines: r.lines.map((l) => ({ id: l.id, qtyRequested: l.qtyRequested }))
  }));

  const serializedLocs = locations.map((l) => ({
    id: l.id,
    name: l.name
  }));

  return (
    <PageContainer
      pageTitle='Purchase Orders'
      pageDescription='Formal supplier orders — PO-XXXX'
      pageHeaderAction={
        item &&
        supplier && (
          <NewPOModal
            locations={serializedLocs}
            approvedRequisitions={serializedReqs}
            itemId={item.id}
            supplierId={supplier.id}
          />
        )
      }
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'Supplier',
                'Requirement Origin',
                'Deliver To',
                'Expected Date',
                'Qty Ordered',
                'Total Value',
                'Status',
                'GRNs',
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
                <td colSpan={10} className='px-4 py-8 text-center text-muted-foreground'>
                  No purchase orders yet.
                </td>
              </tr>
            )}
            {list.map((po) => {
              const total = po.lines.reduce(
                (s, l) => s + Number(l.unitCost) * l.qtyOrdered * (1 + Number(l.taxPct) / 100),
                0
              );
              const qtyOrdered = po.lines.reduce((s, l) => s + l.qtyOrdered, 0);
              const firstLine = po.lines[0];
              const originReq = firstLine?.reqLine?.requisition;
              const isReceived = po.grns.some((g) => g.status === 'POSTED');

              return (
                <tr key={po.id} className='hover:bg-muted/30'>
                  <td className='px-3 py-3 font-mono font-medium'>{po.docNumber}</td>
                  <td className='px-3 py-3 font-medium'>{po.supplier.name}</td>
                  <td className='px-3 py-3'>
                    {originReq ? (
                      <span className='rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium'>
                        {originReq.docNumber} ({originReq.location.name})
                      </span>
                    ) : (
                      <span className='text-xs text-muted-foreground'>Central Buffer</span>
                    )}
                  </td>
                  <td className='px-3 py-3'>{po.deliverTo.name}</td>
                  <td className='px-3 py-3'>{po.expectedDate.toISOString().slice(0, 10)}</td>
                  <td className='px-3 py-3 font-bold'>{qtyOrdered} vials</td>
                  <td className='px-3 py-3 font-semibold text-green-700'>
                    ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className='px-3 py-3'>
                    <StatusBadge status={isReceived ? 'RECEIVED' : po.status} />
                  </td>
                  <td className='px-3 py-3 font-mono text-xs'>
                    {po.grns.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {po.grns.map((g) => (
                          <span
                            key={g.id}
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              g.status === 'POSTED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                : 'bg-muted text-muted-foreground line-through'
                            }`}
                          >
                            {g.docNumber}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className='text-muted-foreground'>Pending</span>
                    )}
                  </td>
                  <td className='px-3 py-3'>
                    {firstLine && (
                      <GrnModal
                        poId={po.id}
                        poDocNumber={po.docNumber}
                        poLineId={firstLine.id}
                        itemId={firstLine.itemId}
                        locationId={po.deliverToId}
                        qtyOrdered={firstLine.qtyOrdered}
                        unitCost={Number(firstLine.unitCost)}
                        isReceived={isReceived}
                      />
                    )}
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
    APPROVED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
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
