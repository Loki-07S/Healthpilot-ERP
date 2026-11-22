import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { NewInvoiceModal } from '@/components/invoice-modal';
import { CreditNoteAction } from '@/components/credit-note-action';

export default async function InvoicesPage() {
  const [listRaw, purchaseOrdersRaw, supplier] = await Promise.all([
    prisma.supplierInvoice.findMany({
      include: {
        supplier: { select: { name: true } },
        po: { select: { docNumber: true } },
        creditNotes: { select: { id: true, docNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.purchaseOrder.findMany({
      include: { lines: { select: { qtyOrdered: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.supplier.findFirst({ where: { code: 'SUP-001' } })
  ]);

  // Strip ALL Prisma Decimal types — only plain JS primitives cross Server→Client boundary
  const purchaseOrders = purchaseOrdersRaw.map((po) => ({
    id: po.id,
    docNumber: po.docNumber,
    lines: po.lines.map((l) => ({ qtyOrdered: Number(l.qtyOrdered) }))
  }));

  // Serialize the invoice list (Decimal fields → Number)
  const list = listRaw.map((inv) => ({
    id: inv.id,
    docNumber: inv.docNumber,
    supplierId: inv.supplierId,
    status: inv.status,
    invoicedQty: inv.invoicedQty,
    invoicedAmount: Number(inv.invoicedAmount),
    payableAmount: Number(inv.payableAmount),
    disputedAmount: Number(inv.disputedAmount),
    supplier: { name: inv.supplier.name },
    po: { docNumber: inv.po.docNumber },
    creditNotes: inv.creditNotes.map((cn) => ({ id: cn.id, docNumber: cn.docNumber }))
  }));

  return (
    <PageContainer
      pageTitle='Supplier Invoices'
      pageDescription='Three-Way Match: PO ↔ GRN (accepted) ↔ Invoice'
      pageHeaderAction={
        supplier && <NewInvoiceModal purchaseOrders={purchaseOrders} supplierId={supplier.id} />
      }
    >
      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50 text-muted-foreground'>
            <tr>
              {[
                'Doc #',
                'Supplier',
                'PO #',
                'Invoiced Qty',
                'Invoiced Amt',
                'Payable',
                'Disputed',
                'Status',
                'Credit Notes',
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
                  No invoices yet.
                </td>
              </tr>
            )}
            {list.map((inv) => (
              <tr key={inv.id} className='hover:bg-muted/30'>
                <td className='px-3 py-3 font-mono font-medium'>{inv.docNumber}</td>
                <td className='px-3 py-3 font-medium'>{inv.supplier.name}</td>
                <td className='px-3 py-3 font-mono'>{inv.po.docNumber}</td>
                <td className='px-3 py-3'>{inv.invoicedQty} vials</td>
                <td className='px-3 py-3'>
                  ₹
                  {Number(inv.invoicedAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className='px-3 py-3 font-semibold text-green-700'>
                  ₹{Number(inv.payableAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className='px-3 py-3 font-semibold text-red-600'>
                  ₹
                  {Number(inv.disputedAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td className='px-3 py-3'>
                  <InvStatusBadge status={inv.status} />
                </td>
                <td className='px-3 py-3'>
                  {inv.creditNotes.length > 0 ? (
                    <div className='flex flex-wrap gap-1'>
                      {inv.creditNotes.map((cn) => (
                        <span
                          key={cn.id}
                          className='rounded bg-green-100 dark:bg-green-950/40 px-1.5 py-0.5 text-xs font-mono text-green-800 dark:text-green-300'
                        >
                          {cn.docNumber}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className='text-xs text-muted-foreground'>—</span>
                  )}
                </td>
                <td className='px-3 py-3'>
                  <CreditNoteAction
                    invoiceId={inv.id}
                    supplierId={inv.supplierId}
                    disputedAmount={Number(inv.disputedAmount)}
                    status={inv.status}
                    hasCreditNote={inv.creditNotes.length > 0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Three-Way Match explainer */}
      <div className='mt-6 rounded-xl border bg-muted/30 p-4 text-sm'>
        <h3 className='mb-2 font-semibold'>Three-Way Match Verification Formula</h3>
        <div className='text-muted-foreground space-y-1.5'>
          <div>
            <strong>Payable</strong> = min(GRN Accepted Qty, Invoiced Qty) × Unit Cost × (1 + Tax%)
          </div>
          <div>
            <strong>Disputed</strong> = (Invoiced Qty − Accepted Qty) × Unit Cost × (1 + Tax%)
          </div>
          <div>
            <strong>Status</strong> ={' '}
            <span className='font-mono font-bold text-red-600'>DISCREPANT</span> if disputed &gt; 0,
            otherwise <span className='font-mono font-bold text-green-600'>MATCHED</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    MATCHED: 'bg-green-100 text-green-700',
    DISCREPANT: 'bg-red-100 text-red-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-purple-100 text-purple-700'
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}
