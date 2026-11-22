'use client';
import React from 'react';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import QueryProvider from '@/components/layout/query-provider';
import { RoleProvider } from '@/lib/role';
import { DialogProvider } from '@/components/ui/dialog-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <DialogProvider>
        <ActiveThemeProvider initialTheme={activeThemeValue}>
          <QueryProvider>{children}</QueryProvider>
        </ActiveThemeProvider>
      </DialogProvider>
    </RoleProvider>
  );
}
