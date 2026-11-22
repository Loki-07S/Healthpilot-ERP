'use client';

import PageContainer from '@/components/layout/page-container';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import Link from 'next/link';

// Hardcoded IDs for demo — in prod these would come from the API
const LOCATIONS = [
  { code: 'LOC-BRA', name: 'Branch A' },
  { code: 'LOC-BRB', name: 'Branch B' },
  { code: 'LOC-BRC', name: 'Branch C' }
];

export default function NewRequisitionPage() {
  const router = useRouter();
  const { can, user } = useRole();
  const isAllowed = can('CREATE_REQUISITION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // First fetch the location and user IDs from the API
    const [locsRes, usersRes] = await Promise.all([
      fetch('/api/masters/locations'),
      fetch('/api/masters/users')
    ]);
    const locs = await locsRes.json();
    const users = await usersRes.json();

    const locationCode = data.get('locationCode') as string;
    const locationId = locs.find((l: { code: string }) => l.code === locationCode)?.id;
    const rxUser = users.find((u: { role: string }) => u.role === 'PHARMACIST') ?? users[0];
    const userId =
      user.role === 'ADMIN'
        ? rxUser?.id
        : (users.find((u: { role: string }) => u.role === user.role)?.id ?? rxUser?.id);

    const payload = {
      locationId,
      requestedById: userId,
      postingDate: data.get('postingDate') as string,
      notes: data.get('notes') as string,
      lines: [
        {
          itemDescription: 'Insulin Glargine 100 IU/ml',
          qtyRequested: Number(data.get('qty')),
          unit: 'Vial'
        }
      ]
    };

    const res = await fetch('/api/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Failed');
      setLoading(false);
      return;
    }

    router.push('/dashboard/requisitions');
  }

  return (
    <PageContainer
      pageTitle='New Material Requisition'
      pageDescription='Create a branch stock request'
    >
      <form onSubmit={handleSubmit} className='max-w-lg space-y-4'>
        <div>
          <label className='mb-1 block text-sm font-medium'>Branch / Location</label>
          <select
            name='locationCode'
            required
            className='w-full rounded border px-3 py-2 text-sm bg-background border-border'
          >
            {LOCATIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className='mb-1 block text-sm font-medium'>Item</label>
          <input
            value='Insulin Glargine 100 IU/ml'
            disabled
            className='w-full rounded border px-3 py-2 text-sm bg-muted border-border'
          />
        </div>

        <div>
          <label className='mb-1 block text-sm font-medium'>Qty Requested (Vials)</label>
          <input
            name='qty'
            type='number'
            min={1}
            required
            className='w-full rounded border px-3 py-2 text-sm bg-background border-border'
          />
        </div>

        <div>
          <label className='mb-1 block text-sm font-medium'>Posting Date</label>
          <input
            name='postingDate'
            type='date'
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className='w-full rounded border px-3 py-2 text-sm bg-background border-border'
          />
        </div>

        <div>
          <label className='mb-1 block text-sm font-medium'>Notes (optional)</label>
          <textarea
            name='notes'
            rows={2}
            className='w-full rounded border px-3 py-2 text-sm bg-background border-border'
          />
        </div>

        {error && <p className='text-sm text-red-600'>{error}</p>}

        {!isAllowed && (
          <div className='p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between'>
            <span>
              🔒 Requisitions must be raised by a Branch Pharmacist. Currently signed in as{' '}
              {user.name} ({user.title}).
            </span>
            <Link href='/login' className='font-bold underline ml-2'>
              Switch to Pharmacist
            </Link>
          </div>
        )}

        <div className='flex gap-3'>
          <button
            type='submit'
            disabled={loading || !isAllowed}
            className='rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? 'Saving…' : 'Submit Requisition'}
          </button>
          <button
            type='button'
            onClick={() => router.back()}
            className='rounded border px-4 py-2 text-sm font-medium hover:bg-muted'
          >
            Cancel
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
