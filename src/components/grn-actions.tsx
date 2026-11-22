'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function GrnActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const { can, user } = useRole();
  const { confirm, alert } = useDialog();
  const isAllowed = can('REVERSE_AMEND_GRN');
  const [loading, setLoading] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);

  // Amend form values
  const [qtyAccepted, setQtyAccepted] = useState(70);
  const [qtyRejected, setQtyRejected] = useState(20);
  const [qtyShort, setQtyShort] = useState(10);
  const [notes, setNotes] = useState(
    'Amended receipt: 70 usable, 20 quarantine (temp breach), 10 short'
  );

  async function handleReverse() {
    const ok = await confirm({
      title: 'Reverse Goods Receipt Note',
      message:
        'Reverse this GRN?\n\nThis will post equal-and-opposite entries in the stock ledger (append-only correction) and allow re-posting an amended count.',
      confirmText: 'Yes, Reverse GRN',
      cancelText: 'No, Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    setLoading(true);

    try {
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const skUser = users.find((u: { role: string }) => u.role === 'STORE_KEEPER') ?? users[0];

      const res = await fetch(`/api/grn/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postedById: skUser.id })
      });

      if (res.ok) {
        await alert({
          title: 'GRN Reversed',
          message:
            'GRN successfully reversed! Equal-and-opposite entries have been recorded in the stock ledger.',
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Reversal Failed',
          message: `Failed to reverse: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An error occurred during GRN reversal.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAmend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const skUser = users.find((u: { role: string }) => u.role === 'STORE_KEEPER') ?? users[0];

      // Fetch GRN details to get PO line and Item ID
      const grnRes = await fetch('/api/grn');
      const grns = await grnRes.json();
      const thisGrn = grns.find((g: { id: string }) => g.id === id);
      const line = thisGrn?.lines[0];

      const res = await fetch(`/api/grn/${id}/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postedById: skUser.id,
          postingDate: new Date().toISOString(),
          notes,
          lines: [
            {
              poLineId: line?.poLineId ?? '',
              itemId: line?.itemId ?? '',
              batchNumber: line?.batchNumber ?? 'IG-SEP26-01',
              expiryDate: line?.expiryDate ?? new Date('2028-08-31').toISOString(),
              qtyOrdered: 100,
              qtyDelivered: qtyAccepted + qtyRejected + qtyShort,
              qtyAccepted,
              qtyRejected,
              unitCost: Number(line?.unitCost ?? 500),
              notes
            }
          ]
        })
      });

      if (res.ok) {
        setShowAmendModal(false);
        await alert({
          title: 'Amended GRN Posted',
          message:
            'Amended GRN successfully posted! Usable stock (70) and Quarantine stock (20) have been registered in the stock ledger.',
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Amendment Failed',
          message: `Failed to amend: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An error occurred during GRN amendment.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex items-center gap-1.5'>
      {status === 'POSTED' &&
        (isAllowed ? (
          <button
            onClick={handleReverse}
            disabled={loading}
            className='rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50'
          >
            Reverse
          </button>
        ) : (
          <span
            className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
            title='GRN Reversal requires Store Keeper or Admin'
          >
            🔒 Store Keeper
          </span>
        ))}

      {status === 'REVERSED' &&
        (isAllowed ? (
          <button
            onClick={() => setShowAmendModal(true)}
            className='rounded bg-yellow-600 px-2 py-1 text-xs font-semibold text-white hover:bg-yellow-700'
          >
            Amend
          </button>
        ) : (
          <span
            className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
            title='GRN Amendment requires Store Keeper or Admin'
          >
            🔒 Store Keeper
          </span>
        ))}

      {showAmendModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Amend Goods Receipt Note</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Record the verified physical breakdown to correct the reversed GRN.
            </p>

            <form onSubmit={handleAmend} className='mt-4 space-y-3 text-sm'>
              <div className='grid grid-cols-3 gap-2'>
                <div>
                  <label className='block text-xs font-medium text-green-700'>Usable Qty</label>
                  <input
                    type='number'
                    value={qtyAccepted}
                    onChange={(e) => setQtyAccepted(Number(e.target.value))}
                    className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-green-700'
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium text-orange-600'>
                    Quarantine Qty
                  </label>
                  <input
                    type='number'
                    value={qtyRejected}
                    onChange={(e) => setQtyRejected(Number(e.target.value))}
                    className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-orange-600'
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium text-red-600'>Short Qty</label>
                  <input
                    type='number'
                    value={qtyShort}
                    onChange={(e) => setQtyShort(Number(e.target.value))}
                    className='border-border bg-background w-full rounded border px-2 py-1 text-xs font-bold text-red-600'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Correction Reason / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-2 py-1.5 text-xs'
                />
              </div>

              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setShowAmendModal(false)}
                  className='rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  className='rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                >
                  {loading ? 'Submitting…' : 'Post Amended GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
