'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMinimal =
    pathname.startsWith('/reader') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/writing-studio') ||
    pathname.startsWith('/cover-studio') ||
    pathname.startsWith('/print-studio');

  if (isMinimal) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <SiteFooter />
    </>
  );
}
