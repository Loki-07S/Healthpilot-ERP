'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function RequisitionActions({
  id,
  docNumber,
  status,
  lines,
  hasPo = false,
  poDocNumber = null
}: {
  id: string;
  docNumber: string;
  status: string;
  lines: Array<{
    id: string;
    itemId: string | null;
    qtyRequested: number;
    itemDescription: string;
  }>;
  hasPo?: boolean;
  poDocNumber?: string | null;
}) {
  const router = useRouter();
  const { role, can, user } = useRole();
  const { confirm, alert } = useDialog();
  const [loading, setLoading] = useState(false);

  const canApprove = can('APPROVE_REQUISITION');
  const canCreatePO = can('CREATE_PO');

  async function handleApprove() {
    const ok = await confirm({
      title: 'Approve Material Requisition',
      message: `Approve requisition ${docNumber} for ${lines[0]?.qtyRequested ?? 0} vials?\n\nThis confirms verified demand from branch and authorizes purchasing.`,
      confirmText: 'Yes, Approve',
      cancelText: 'No, Cancel',
      variant: 'success'
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/requisitions/${id}/approve`, { method: 'PUT' });
      if (res.ok) {
        await alert({
          title: 'Requisition Approved',
          message: `Requisition ${docNumber} has been approved. You may now generate a Purchase Order.`,
          variant: 'success'
        });
        router.refresh();
      } else {
        await alert({
          title: 'Approval Failed',
          message: 'Failed to approve requisition. Please check permissions.',
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Error',
        message: 'An unexpected error occurred while approving requisition.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePO() {
    const ok = await confirm({
      title: 'Generate Purchase Order',
      message: `Generate supplier Purchase Order against approved requirement ${docNumber} for ${lines[0]?.qtyRequested ?? 0} vials?`,
      confirmText: 'Yes, Create PO',
      cancelText: 'No, Cancel',
      variant: 'default'
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: id,
          notes: `Created from approved requirement ${docNumber}`
        })
      });

      if (res.ok) {
        const po = await res.json();
        await alert({
          title: 'Purchase Order Created',
          message: `Success! Created Purchase Order ${po.docNumber} for ${lines[0]?.qtyRequested ?? 0} vials.`,
          variant: 'success'
        });
        router.push('/dashboard/purchase-orders');
      } else {
        const err = await res.json();
        await alert({
          title: 'PO Generation Failed',
          message: `Failed to create PO: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch (e: unknown) {
      await alert({
        title: 'Error',
        message: `Error creating PO: ${e instanceof Error ? e.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex items-center gap-1.5'>
      {status === 'SUBMITTED' &&
        (canApprove ? (
          <button
            onClick={handleApprove}
            disabled={loading}
            className='rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50'
            title='Approve this requisition (Purchase Manager / Admin)'
          >
            {loading ? 'Approving…' : 'Approve'}
          </button>
        ) : (
          <span
            className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
            title='Approval requires Purchase Manager or Admin persona'
          >
            🔒 Purchase Mgr
          </span>
        ))}

      {status === 'APPROVED' &&
        (hasPo ? (
          <Link
            href='/dashboard/purchase-orders'
            className='inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors'
            title={`Purchase Order ${poDocNumber ?? ''} created against this requisition`}
          >
            ✓ PO Created {poDocNumber ? `(${poDocNumber})` : ''}
          </Link>
        ) : canCreatePO ? (
          <button
            onClick={handleCreatePO}
            disabled={loading}
            className='rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
            title='Create formal Purchase Order to supplier'
          >
            {loading ? 'Creating PO…' : 'Create PO'}
          </button>
        ) : (
          <span
            className='inline-flex items-center gap-1 rounded bg-muted/80 border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium cursor-not-allowed'
            title='Purchase Order issuance requires Purchase Manager or Admin'
          >
            🔒 Purchase Mgr
          </span>
        ))}
    </div>
  );
}
