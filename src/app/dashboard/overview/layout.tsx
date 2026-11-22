import React from 'react';

// Simple pass-through layout — the actual page is page.tsx
export default function OverViewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
