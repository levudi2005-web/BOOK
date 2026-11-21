'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const key = `bff:scroll:${previousPathname.current}`;
    const save = () => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, String(window.scrollY));
      }
    };
    window.addEventListener('pagehide', save);
    const previousScrollCleanup = () => {
      save();
    };
    previousScrollCleanup();
    return () => {
      save();
      window.removeEventListener('pagehide', save);
      previousPathname.current = pathname;
    };
  }, [pathname]);

  useEffect(() => {
    const key = `bff:scroll:${pathname}`;
    const saved = window.sessionStorage.getItem(key);
    if (saved !== null) {
      const top = Number(saved);
      if (Number.isFinite(top)) {
        window.requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' }));
      }
    }
  }, [pathname]);
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
