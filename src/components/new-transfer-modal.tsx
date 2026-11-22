'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function NewTransferModal({
  centralLocationId,
  branches,
  itemId
}: {
  centralLocationId: string;
  branches: Array<{ id: string; name: string; code: string }>;
  itemId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { alert } = useDialog();
  const isAllowed = can('DISPATCH_TRANSFER');

  const [toLocationId, setToLocationId] = useState(branches[0]?.id ?? '');
  const [qty, setQty] = useState(30);
  const [notes, setNotes] = useState('Cold-chain box transfer against approved branch requisition');

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const skUser = users.find((u: { role: string }) => u.role === 'STORE_KEEPER') ?? users[0];

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocationId: centralLocationId,
          toLocationId,
          postedById: skUser.id,
          postingDate: new Date().toISOString(),
          notes,
          lines: [
            {
              itemId,
              batchNumber: 'IG-SEP26-01',
              expiryDate: new Date('2028-08-31').toISOString(),
              qty,
              unitCost: 500
            }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        await alert({
          title: 'Transfer Dispatch Error',
          message: `Error dispatching transfer: ${err.error}`,
          variant: 'destructive'
        });
      } else {
        setIsOpen(false);
        await alert({
          title: 'Transfer Dispatched',
          message: `Stock transfer of ${qty} vials dispatched!\nInventory status: IN_TRANSIT.\nAwaiting receipt confirmation at destination branch.`,
          variant: 'success'
        });
        router.refresh();
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An error occurred while initiating stock transfer.',
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
          + New Stock Transfer
        </button>
      ) : (
        <span
          className='inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground border border-border cursor-not-allowed'
          title={`Inter-branch transfer dispatch restricted to Store Keeper or Admin. Current: ${user.name}`}
        >
          🔒 Requires Store Keeper
        </span>
      )}

      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Dispatch Stock Transfer</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Moves stock from Central Warehouse to Branch. Status will be IN_TRANSIT until
              received.
            </p>

            <form onSubmit={handleDispatch} className='mt-4 space-y-3 text-sm'>
              <div>
                <label className='block text-xs font-medium'>Destination Branch</label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  required
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-xs font-medium'>Quantity to Dispatch (Vials)</label>
                <input
                  type='number'
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  required
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-bold'
                />
              </div>

              <div>
                <label className='block text-xs font-medium'>Batch & Cold-Chain Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
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
                  {loading ? 'Dispatching…' : 'Dispatch (In-Transit)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
