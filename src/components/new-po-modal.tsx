'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function NewPOModal({
  locations,
  approvedRequisitions,
  itemId,
  supplierId
}: {
  locations: Array<{ id: string; name: string }>;
  approvedRequisitions: Array<{
    id: string;
    docNumber: string;
    location: { name: string };
    lines: Array<{ id: string; qtyRequested: number }>;
  }>;
  itemId: string;
  supplierId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { alert } = useDialog();
  const isAllowed = can('CREATE_PO');

  const [selectedReqId, setSelectedReqId] = useState<string>(approvedRequisitions[0]?.id ?? '');
  const [qtyOrdered, setQtyOrdered] = useState<number>(
    approvedRequisitions[0]?.lines[0]?.qtyRequested ?? 50
  );
  const [deliverToId, setDeliverToId] = useState<string>(locations[0]?.id ?? '');
  const [expectedDate, setExpectedDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>('Standard cold-chain replenishment order');

  const selectedReq = approvedRequisitions.find((r) => r.id === selectedReqId);

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          deliverToId,
          postingDate: new Date().toISOString(),
          expectedDate: new Date(expectedDate).toISOString(),
          notes,
          lines: [
            {
              itemId,
              reqLineId: selectedReq?.lines[0]?.id,
              qtyOrdered,
              unitCost: 500,
              taxPct: 5
            }
          ]
        })
      });

      if (res.ok) {
        const po = await res.json();
        setIsOpen(false);
        await alert({
          title: 'Purchase Order Issued',
          message: `Successfully created Purchase Order ${po.docNumber} for ${qtyOrdered} vials!\n\nSupplier: MediSupply Pharmaceuticals Pvt. Ltd.\nStatus: ORDERED`,
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'PO Creation Failed',
          message: `Error creating PO: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An unexpected error occurred while creating purchase order.',
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
          + New Purchase Order
        </button>
      ) : (
        <span
          className='inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground border border-border cursor-not-allowed'
          title={`Order creation restricted to Purchase Manager or Admin. Current: ${user.name}`}
        >
          🔒 Requires Purchase Manager
        </span>
      )}

      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Create Supplier Purchase Order</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Issue a formal order to MediSupply Pharmaceuticals Pvt. Ltd. (₹500/vial + 5% tax).
            </p>

            <form onSubmit={handleCreatePO} className='mt-4 space-y-3 text-sm'>
              {approvedRequisitions.length > 0 && (
                <div>
                  <label className='block text-xs font-medium'>Fulfill Approved Requisition</label>
                  <select
                    value={selectedReqId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedReqId(id);
                      const req = approvedRequisitions.find((r) => r.id === id);
                      if (req?.lines[0]) setQtyOrdered(req.lines[0].qtyRequested);
                    }}
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                  >
                    <option value=''>-- Standalone (No Requisition Link) --</option>
                    {approvedRequisitions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.docNumber} ({r.location.name} — {r.lines[0]?.qtyRequested ?? 0} vials)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className='block text-xs font-medium'>Delivery Destination</label>
                <select
                  value={deliverToId}
                  onChange={(e) => setDeliverToId(e.target.value)}
                  required
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='block text-xs font-medium'>Quantity Ordered (Vials)</label>
                  <input
                    type='number'
                    min={1}
                    value={qtyOrdered}
                    onChange={(e) => setQtyOrdered(Number(e.target.value))}
                    required
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-bold'
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium'>Expected Delivery Date</label>
                  <input
                    type='date'
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    required
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                  />
                </div>
              </div>

              {/* Order Calculation */}
              <div className='border-border bg-muted/40 rounded-lg border p-3 text-xs space-y-1'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Value (₹500/vial):</span>
                  <span>₹{(qtyOrdered * 500).toLocaleString('en-IN')}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>GST @ 5%:</span>
                  <span>₹{(qtyOrdered * 25).toLocaleString('en-IN')}</span>
                </div>
                <div className='flex justify-between font-bold text-sm text-green-700 border-t pt-1'>
                  <span>Total Order Value:</span>
                  <span>₹{(qtyOrdered * 525).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Order Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-3 py-1.5 text-xs'
                />
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
                  {loading ? 'Creating PO…' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
