'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useDialog } from '@/components/ui/dialog-provider';

export function ResetScenarioButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { can, user } = useRole();
  const { confirm, alert } = useDialog();
  const isAllowed = can('RESET_SCENARIO');

  async function handleReset() {
    const ok = await confirm({
      title: 'Reset Challenge Baseline',
      message:
        'Reset data to the exact challenge scenario baseline (40 Central / 25 Branch A / 20 Quarantine / 5 Sold / 10 Short)?\n\nAll subsequent test transactions will be cleared and restored to the verified anchor state.',
      confirmText: 'Yes, Reset Baseline',
      cancelText: 'No, Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch('/api/scenario/reset', { method: 'POST' });
      if (res.ok) {
        await alert({
          title: 'Baseline Restored',
          message:
            'Database has been successfully reset to the official challenge scenario numbers.',
          variant: 'success'
        });
        router.refresh();
      } else {
        const err = await res.json();
        await alert({
          title: 'Reset Failed',
          message: `Reset failed: ${err.error}`,
          variant: 'destructive'
        });
      }
    } catch {
      await alert({
        title: 'Network / System Error',
        message: 'An unexpected error occurred while resetting scenario baseline.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isAllowed) {
    return (
      <span
        className='inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground cursor-not-allowed'
        title={`Scenario reset restricted to Administrator. Current: ${user.name}`}
      >
        🔒 Reset (Admin Only)
      </span>
    );
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50'
      title='Reset all transactions to the official challenge scenario numbers'
    >
      {loading ? 'Resetting Baseline…' : '↺ Reset to Challenge Baseline'}
    </button>
  );
}
