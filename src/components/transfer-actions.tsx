'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function TransferActions({
  id,
  status,
  toLocationName
}: {
  id: string;
  status: string;
  toLocationName: string;
}) {
  const router = useRouter();
  const { can, user } = useRole();
  const { confirm, alert } = useDialog();
  const isAllowed = can('RECEIVE_TRANSFER');
  const [loading, setLoading] = useState(false);

  async function handleReceive() {
    const ok = await confirm({
      title: 'Confirm Stock Receipt',
      message: `Confirm physical delivery and receipt of transfer at ${toLocationName}?\n\nThis will convert In-Transit inventory into Usable stock at ${toLocationName}.`,
      confirmText: 'Yes, Confirm Receipt',
      cancelText: 'No, Cancel',
      variant: 'success'
    });
    if (!ok) return;

    setLoading(true);
    try {
      const userRes = await fetch('/api/masters/users');
      const users = await userRes.json();
      const rxUser = users.find((u: { role: string }) => u.role === 'PHARMACIST') ?? users[0];

      const res = await fetch(`/api/transfers/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postedById: rxUser.id,
          postingDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        await alert({
          title: 'Stock Received',
          message: `Stock successfully received and added to ${toLocationName} usable inventory!`,
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Receipt Failed',
          message: `Error receiving transfer: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'Error confirming stock receipt.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (status !== 'DISPATCHED') return null;

  if (!isAllowed) {
    return (
      <span
        className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
        title={`Receiving transfer at branch requires Pharmacist or Admin. Current: ${user.name}`}
      >
        🔒 Pharmacist
      </span>
    );
  }

  return (
    <button
      onClick={handleReceive}
      disabled={loading}
      className='rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50'
    >
      {loading ? 'Receiving…' : 'Confirm Receipt'}
    </button>
  );
}
