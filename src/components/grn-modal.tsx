'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function GrnModal({
  poId,
  poDocNumber,
  poLineId,
  itemId,
  locationId,
  qtyOrdered,
  unitCost,
  isReceived
}: {
  poId: string;
  poDocNumber: string;
  poLineId: string;
  itemId: string;
  locationId: string;
  qtyOrdered: number;
  unitCost: number;
  isReceived: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { alert } = useDialog();
  const isAllowed = can('RECEIVE_GRN');

  // Form states defaulting dynamically to the actual ordered quantity
  const [challanRef, setChallanRef] = useState(`DN-${poDocNumber}`);
  const [batchNumber, setBatchNumber] = useState('IG-SEP26-01');
  const [expiryDate, setExpiryDate] = useState('2028-08-31');
  const [qtyAccepted, setQtyAccepted] = useState(qtyOrdered);
  const [qtyRejected, setQtyRejected] = useState(0);
  const [qtyShort, setQtyShort] = useState(0);
  const [notes, setNotes] = useState('Physical receipt & cold-chain inspection completed');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Find Store Keeper User ID
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const skUser = users.find((u: { role: string }) => u.role === 'STORE_KEEPER') ?? users[0];

      const res = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          locationId,
          challanRef,
          postingDate: new Date().toISOString(),
          postedById: skUser.id,
          notes,
          lines: [
            {
              poLineId,
              itemId,
              batchNumber,
              expiryDate: new Date(expiryDate).toISOString(),
              qtyOrdered,
              qtyDelivered: qtyAccepted + qtyRejected + qtyShort,
              qtyAccepted,
              qtyRejected,
              unitCost,
              notes
            }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        await alert({
          title: 'GRN Posting Error',
          message: `Error posting GRN: ${err.error}`,
          variant: 'destructive'
        });
      } else {
        setIsOpen(false);
        await alert({
          title: 'GRN Successfully Posted',
          message: `Goods Receipt Note created for ${qtyAccepted + qtyRejected + qtyShort} vials!\nUsable: ${qtyAccepted}, Quarantine: ${qtyRejected}, Short: ${qtyShort}`,
          variant: 'success'
        });
        router.push('/dashboard/grn');
      }
    } catch (err: unknown) {
      await alert({
        title: 'Error Submitting GRN',
        message: `Failed to submit GRN: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (isReceived) {
    return (
      <span className='inline-flex items-center rounded-md bg-green-50 dark:bg-green-950/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900'>
        ✓ Received
      </span>
    );
  }

  if (!isAllowed) {
    return (
      <span
        className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-1 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
        title={`Warehouse receipt requires Store Keeper or Admin. Current: ${user.name}`}
      >
        🔒 Store Keeper
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          // Initialize defaults dynamically
          setQtyAccepted(qtyOrdered);
          setQtyRejected(0);
          setQtyShort(0);
          setIsOpen(true);
        }}
        className='rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors'
      >
        Receive (GRN)
      </button>

      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Receive Delivery (GRN) against {poDocNumber}</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Inspect physical shipment, verify cold-chain, and record stock breakdown for{' '}
              {qtyOrdered} ordered vials.
            </p>

            <form onSubmit={handleSubmit} className='mt-4 space-y-3 text-sm'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='block text-xs font-medium'>Delivery Challan Ref</label>
                  <input
                    value={challanRef}
                    onChange={(e) => setChallanRef(e.target.value)}
                    required
                    className='border-border bg-background w-full rounded border px-2 py-1.5 text-xs'
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium'>Batch Number</label>
                  <input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                    className='border-border bg-background w-full rounded border px-2 py-1.5 text-xs font-mono'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Expiry Date</label>
                <input
                  type='date'
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className='border-border bg-background w-full rounded border px-2 py-1.5 text-xs'
                />
              </div>

              <div className='border-border bg-muted/30 rounded-lg border p-3 space-y-2'>
                <div className='flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                  <span>Stock Breakdown</span>
                  <span>Total Ordered: {qtyOrdered}</span>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  <div>
                    <label className='block text-xs font-medium text-green-700'>
                      Accepted (Usable)
                    </label>
                    <input
                      type='number'
                      min={0}
                      value={qtyAccepted}
                      onChange={(e) => setQtyAccepted(Number(e.target.value))}
                      className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-green-700'
                    />
                    <span className='text-[10px] text-muted-foreground'>Cold-chain OK</span>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-orange-600'>
                      Damaged (Quar)
                    </label>
                    <input
                      type='number'
                      min={0}
                      value={qtyRejected}
                      onChange={(e) => setQtyRejected(Number(e.target.value))}
                      className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-orange-600'
                    />
                    <span className='text-[10px] text-muted-foreground'>Temp &gt; 8°C</span>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-red-600'>
                      Short (Missing)
                    </label>
                    <input
                      type='number'
                      min={0}
                      value={qtyShort}
                      onChange={(e) => setQtyShort(Number(e.target.value))}
                      className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-red-600'
                    />
                    <span className='text-[10px] text-muted-foreground'>Zero ledger</span>
                  </div>
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Inspection Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-2 py-1.5 text-xs'
                />
              </div>

              <div className='mt-4 flex justify-end gap-2'>
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
                  {loading ? 'Posting Ledger…' : 'Post GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
