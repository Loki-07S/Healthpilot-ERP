'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function DispenseModal({
  branches,
  itemId
}: {
  branches: Array<{ id: string; name: string }>;
  itemId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { alert } = useDialog();
  const isAllowed = can('DISPENSE_PRESCRIPTION');

  const [locationId, setLocationId] = useState(branches[0]?.id ?? '');
  const [qty, setQty] = useState(5);
  const [unitSalePrice, setUnitSalePrice] = useState(650);
  const [notes, setNotes] = useState('Prescription #RX-2026-9042; Patient: Anita Desai');
  const [paymentMethod, setPaymentMethod] = useState('Card');

  async function handleDispense(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const rxUser = users.find((u: { role: string }) => u.role === 'PHARMACIST') ?? users[0];

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          postedById: rxUser.id,
          postingDate: new Date().toISOString(),
          taxPct: 5,
          paymentMethod,
          notes,
          lines: [
            {
              itemId,
              qty,
              unitSalePrice
            }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        await alert({
          title: 'Dispensing Failed',
          message: `Error dispensing prescription: ${err.error}`,
          variant: 'destructive'
        });
      } else {
        const data = await res.json();
        setIsOpen(false);
        await alert({
          title: 'Prescription Dispensed Successfully',
          message: `Sales Invoice: ${data.invoice.docNumber}\nTotal Paid: ₹${data.totalWithTax.toFixed(2)} (${paymentMethod})\nCOGS Recognized: ₹${data.cogs}\nStock successfully reduced at Branch using FEFO picking.`,
          variant: 'success'
        });
        router.refresh();
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An error occurred during prescription dispensing.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const subtotal = qty * unitSalePrice;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
    <>
      {isAllowed ? (
        <button
          onClick={() => setIsOpen(true)}
          className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          + Dispense Prescription
        </button>
      ) : (
        <span
          className='inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground border border-border cursor-not-allowed'
          title={`Prescription dispensing restricted to Pharmacist or Admin. Current: ${user.name}`}
        >
          🔒 Requires Pharmacist
        </span>
      )}

      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-background border-border w-full max-w-md rounded-xl border p-6 shadow-2xl'>
            <h2 className='text-lg font-bold'>Dispense Medicine (FEFO Pick)</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Dispenses against valid prescription. Automatically picks earliest expiring usable
              batch.
            </p>

            <form onSubmit={handleDispense} className='mt-4 space-y-3 text-sm'>
              <div>
                <label className='block text-xs font-medium'>Dispensing Pharmacy</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='block text-xs font-medium'>Quantity (Vials)</label>
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
                  <label className='block text-xs font-medium'>Unit Retail Price (₹)</label>
                  <input
                    type='number'
                    min={1}
                    value={unitSalePrice}
                    onChange={(e) => setUnitSalePrice(Number(e.target.value))}
                    required
                    className='border-border bg-background w-full rounded border px-3 py-2 text-xs font-bold'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-medium'>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                >
                  <option value='Card'>Credit / Debit Card</option>
                  <option value='Cash'>Cash</option>
                  <option value='UPI'>UPI / Net Banking</option>
                  <option value='Insurance'>Insurance Claim</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-medium'>Prescription / Patient Ref</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className='border-border bg-background w-full rounded border px-3 py-2 text-xs'
                />
              </div>

              {/* Price Calculation */}
              <div className='border-border bg-muted/40 rounded-lg border p-3 text-xs space-y-1'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>GST (5%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className='flex justify-between font-bold text-sm text-green-700 border-t pt-1'>
                  <span>Total Payable:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className='text-[10px] text-muted-foreground pt-1'>
                  *COGS of ₹{(qty * 500).toFixed(2)} recognized at purchase cost.
                </div>
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
                  {loading ? 'Processing…' : 'Confirm Dispensing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
