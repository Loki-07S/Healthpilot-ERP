'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { USER_PERSONAS, DEMO_ROLES, useRole, type DemoRole } from '@/lib/role';

export default function LoginPage() {
  const router = useRouter();
  const { role: activeRole, user: activeUser, setRole } = useRole();

  function handleSelectPersona(selectedRole: DemoRole) {
    setRole(selectedRole);
  }

  function handleLoginAndRedirect(selectedRole: DemoRole) {
    setRole(selectedRole);
    router.push('/dashboard/overview');
  }

  return (
    <div className='min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 flex flex-col justify-between'>
      <div className='max-w-6xl mx-auto w-full'>
        {/* Top Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-neutral-800 gap-4'>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <span className='px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>
                HealthPilot.ai ERP
              </span>
              <span className='text-xs text-neutral-400 font-mono'>
                Multi-Branch Pharmacy Group
              </span>
            </div>
            <h1 className='text-3xl font-extrabold tracking-tight text-white'>
              Staff Authentication & Role Assignment
            </h1>
            <p className='text-sm text-neutral-400 mt-1 max-w-2xl'>
              Strict segregation of duties enforced per healthcare audit standards. Select a staff
              persona to simulate operations under their authorized permissions.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Link
              href='/dashboard/overview'
              className='px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors'
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Currently Active Banner */}
        <div className='my-8 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div
              className={`size-10 rounded-full flex items-center justify-center font-bold text-white ${activeUser.color}`}
            >
              {activeUser.avatarText}
            </div>
            <div>
              <div className='text-xs text-neutral-400 font-medium'>CURRENTLY LOGGED IN AS</div>
              <div className='text-base font-bold text-white flex items-center gap-2'>
                {activeUser.name}
                <span className='text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'>
                  {activeUser.title}
                </span>
              </div>
              <div className='text-xs text-neutral-400'>
                {activeUser.department} · {activeUser.locationName}
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard/overview')}
            className='px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-sm self-start sm:self-auto'
          >
            Enter ERP as {activeUser.name.split(' ')[0]} →
          </button>
        </div>

        {/* Persona Cards Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {DEMO_ROLES.map((r) => {
            const persona = USER_PERSONAS[r.value];
            const isCurrent = activeRole === r.value;

            return (
              <div
                key={r.value}
                className={`relative rounded-xl border p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-neutral-900/90 shadow-lg ring-1 ring-emerald-500/50'
                    : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
                }`}
              >
                {isCurrent && (
                  <span className='absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded-full'>
                    Active Session
                  </span>
                )}

                <div>
                  {/* Persona Header */}
                  <div className='flex items-start gap-3 mb-4'>
                    <div
                      className={`size-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 ${persona.color}`}
                    >
                      {persona.avatarText}
                    </div>
                    <div>
                      <div className='text-xs font-mono font-medium text-neutral-400'>
                        {persona.code}
                      </div>
                      <h2 className='text-base font-bold text-white'>{persona.name}</h2>
                      <div className='text-xs text-neutral-300 font-medium mt-0.5'>
                        {persona.title}
                      </div>
                      <div className='text-[11px] text-neutral-500'>
                        {persona.department} · {persona.locationName}
                      </div>
                    </div>
                  </div>

                  {/* Permitted Responsibilities */}
                  <div className='mb-4 space-y-1.5'>
                    <div className='text-[11px] font-bold uppercase tracking-wider text-emerald-400'>
                      Authorized Operations
                    </div>
                    <ul className='space-y-1 text-xs text-neutral-300'>
                      {persona.canDo.map((item, idx) => (
                        <li key={idx} className='flex items-start gap-1.5'>
                          <span className='text-emerald-400 font-bold'>✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prohibited Responsibilities (Segregation of Duties) */}
                  {persona.cannotDo.length > 0 && (
                    <div className='mb-4 space-y-1.5'>
                      <div className='text-[11px] font-bold uppercase tracking-wider text-neutral-500'>
                        Restricted / Forbidden
                      </div>
                      <ul className='space-y-1 text-xs text-neutral-500'>
                        {persona.cannotDo.map((item, idx) => (
                          <li key={idx} className='flex items-start gap-1.5'>
                            <span className='text-red-400/70 font-mono'>✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='pt-4 border-t border-neutral-800/80 flex items-center gap-2'>
                  {isCurrent ? (
                    <button
                      onClick={() => router.push('/dashboard/overview')}
                      className='w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors'
                    >
                      ✓ Continue as {persona.name.split(' ')[0]}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLoginAndRedirect(r.value)}
                      className='w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors border border-neutral-700'
                    >
                      Sign in as {persona.name.split(' ')[0]}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Audit Compliance Footer Note */}
        <div className='mt-10 p-4 rounded-lg bg-neutral-900/30 border border-neutral-800 text-xs text-neutral-400 leading-relaxed'>
          <strong className='text-neutral-200'>Healthcare Audit Compliance Note:</strong> In this
          ERP prototype, role-based access control enforces four-eyes verification and segregation
          of duties. For instance, storekeepers receiving physical inventory cannot approve
          requisitions or issue supplier orders, and branch pharmacists cannot reverse warehouse
          receipts. All ledger entries capture the executing user persona ID and timestamp.
        </div>
      </div>

      <div className='max-w-6xl mx-auto w-full pt-8 text-center text-xs text-neutral-600'>
        HealthPilot.ai Take-Home Build Challenge · Multi-Branch Pharmacy Management System
      </div>
    </div>
  );
}
