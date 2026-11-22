import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';

export default async function CreditNotesPage() {
  const list = await prisma.creditNote.findMany({
    include: { supplier: true, invoice: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <PageContainer
      pageTitle='Credit Notes'
      pageDescription='Supplier credit for disputed / rejected / short qty — CN-XXXX'
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'Supplier',
                'Invoice #',
                'Qty Returned',
                'Credit Amount',
                'Reason',
                'Date'
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
                <td colSpan={7} className='px-4 py-8 text-center text-muted-foreground'>
                  No credit notes yet.
                </td>
              </tr>
            )}
            {list.map((cn) => (
              <tr key={cn.id} className='hover:bg-muted/30'>
                <td className='px-4 py-3 font-mono font-medium'>{cn.docNumber}</td>
                <td className='px-4 py-3'>{cn.supplier.name}</td>
                <td className='px-4 py-3 font-mono'>{cn.invoice.docNumber}</td>
                <td className='px-4 py-3'>{cn.qtyReturned} vials</td>
                <td className='px-4 py-3 font-semibold text-green-700'>
                  ₹{Number(cn.creditAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className='px-4 py-3 text-muted-foreground'>{cn.reason ?? '—'}</td>
                <td className='px-4 py-3'>{cn.postingDate.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
