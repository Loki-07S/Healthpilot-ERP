'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function NewInvoiceModal({
  purchaseOrders,
  supplierId
}: {
  purchaseOrders: Array<{ id: string; docNumber: string; lines: Array<{ qtyOrdered: number }> }>;
  supplierId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { alert } = useDialog();
  const isAllowed = can('CREATE_INVOICE');

  const [poId, setPoId] = useState(purchaseOrders[0]?.id ?? '');
  const [invoicedQty, setInvoicedQty] = useState(100);
  const [invoicedAmount, setInvoicedAmount] = useState(52500);
  const [notes, setNotes] = useState(
    'Supplier invoice received for delivery challan MSP-DN-050926'
  );

  const selectedPo = purchaseOrders.find((p) => p.id === poId);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          poId,
          invoicedQty,
          invoicedAmount,
          taxAmount: invoicedAmount - invoicedQty * 500,
          postingDate: new Date().toISOString(),
          notes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsOpen(false);
        await alert({
          title: 'Three-Way Match Processed',
          message: `Invoice ${data.invoice.docNumber} recorded successfully!\n\n• Physical Accepted: ${data.threeWayMatch.totalAccepted} vials\n• Payable Amount: ₹${data.threeWayMatch.payableAmount}\n• Disputed Amount: ₹${data.threeWayMatch.disputedAmount}\n• Final Match Status: [${data.threeWayMatch.status}]`,
          variant: data.threeWayMatch.disputedAmount > 0 ? 'default' : 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Invoice Creation Error',
          message: `Error creating invoice: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An unexpected error occurred while creating invoice.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isAllowed ? (
        <button
          onClick={() => setIsOpen(true)}
          className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          + New Supplier Invoice
        </button>
      ) : (
        <span
          className='inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground border border-border cursor-not-allowed'
          title={`Supplier invoice entry restricted to Accounts Officer or Admin. Current: ${user.name}`}
        >
          🔒 Requires Accounts Officer
        </span>
      )}

      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Record Supplier Invoice</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Triggers automated Three-Way Match against PO ordered vs. GRN accepted quantities.
            </p>

            <form onSubmit={handleCreateInvoice} className='mt-4 space-y-3 text-sm'>
              <div>
                <label className='block text-xs font-medium'>Select Purchase Order</label>
                <select
                  value={poId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPoId(id);
                    const po = purchaseOrders.find((p) => p.id === id);
                    const qty = po?.lines[0]?.qtyOrdered ?? 100;
                    setInvoicedQty(qty);
                    setInvoicedAmount(qty * 525);
                  }}
                  required
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-mono'
                >
                  {purchaseOrders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.docNumber} (Ordered: {p.lines[0]?.qtyOrdered ?? 0} vials)
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='block text-xs font-medium'>Invoiced Quantity (Vials)</label>
                  <input
                    type='number'
                    min={1}
                    value={invoicedQty}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setInvoicedQty(q);
                      setInvoicedAmount(q * 525);
                    }}
                    required
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-bold'
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium'>Invoiced Amount (₹ incl. tax)</label>
                  <input
                    type='number'
                    min={1}
                    value={invoicedAmount}
                    onChange={(e) => setInvoicedAmount(Number(e.target.value))}
                    required
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-bold text-green-700'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Invoice Reference & Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-3 py-1.5 text-xs'
                />
              </div>

              <div className='border-border bg-muted/40 rounded-lg border p-3 text-xs space-y-1'>
                <div className='font-semibold text-muted-foreground uppercase text-[11px]'>
                  Three-Way Match Verification
                </div>
                <p className='text-muted-foreground'>
                  The system will cross-reference this invoice against physically accepted stock on
                  the linked GRN and isolate disputed amounts.
                </p>
              </div>

              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setIsOpen(false)}
                  className='rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  className='rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                >
                  {loading ? 'Processing…' : 'Process Three-Way Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
