'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function CreditNoteAction({
  invoiceId,
  supplierId,
  disputedAmount,
  status,
  hasCreditNote
}: {
  invoiceId: string;
  supplierId: string;
  disputedAmount: number;
  status: string;
  hasCreditNote: boolean;
}) {
  const router = useRouter();
  const { can, user } = useRole();
  const { confirm, alert } = useDialog();
  const isAllowed = can('ISSUE_CREDIT_NOTE');
  const [loading, setLoading] = useState(false);

  async function handleIssueCreditNote() {
    const ok = await confirm({
      title: 'Issue Supplier Credit Note',
      message: `Issue formal Credit Note for disputed amount ₹${disputedAmount.toLocaleString('en-IN')} against damaged & short delivered vials?\n\nThis will adjust accounts payable and update invoice status to APPROVED.`,
      confirmText: 'Yes, Issue Credit Note',
      cancelText: 'No, Cancel',
      variant: 'default'
    });
    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          invoiceId,
          qtyReturned: Math.round(disputedAmount / 525), // disputed vials
          creditAmount: disputedAmount,
          reason: 'Supplier credit for damaged (quarantine) and short delivered vials',
          postingDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        const cn = await res.json();
        await alert({
          title: 'Credit Note Issued',
          message: `Credit Note ${cn.docNumber} issued for ₹${disputedAmount.toLocaleString('en-IN')}!\n\nInvoice status has been updated to APPROVED and payable accounts reconciled.`,
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Credit Note Failed',
          message: `Error issuing credit note: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'Failed to create credit note due to a server error.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (hasCreditNote) {
    return (
      <span className='inline-flex items-center rounded bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'>
        ✓ Settled
      </span>
    );
  }

  if (status !== 'DISCREPANT') return null;

  if (!isAllowed) {
    return (
      <span
        className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
        title={`Credit Note issuance restricted to Accounts Officer or Admin. Current: ${user.name}`}
      >
        🔒 Accounts
      </span>
    );
  }

  return (
    <button
      onClick={handleIssueCreditNote}
      disabled={loading}
      className='rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50'
      title='Record supplier credit note to settle discrepancy'
    >
      {loading ? 'Issuing…' : 'Issue Credit Note'}
    </button>
  );
}
