'use client';

import React from 'react';
import Link from 'next/link';
import { DEMO_ROLES, useRole, type DemoRole } from '@/lib/role';

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className='flex items-center gap-2 text-xs'>
      {/* Quick Role Switch Dropdown */}
      <div className='relative flex items-center'>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as DemoRole)}
          className='bg-background border-border hover:bg-muted/50 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer outline-none'
          aria-label='Select active demo role'
        >
          {DEMO_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              Act as: {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Direct link to full Persona Login Switcher */}
      <Link
        href='/login'
        className='hidden md:inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors'
        title='Open Staff Authentication & Persona Directory'
      >
        Switch Staff ↗
      </Link>
    </div>
  );
}
