'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { primaryNav } from '@/lib/site';
import { getAccessToken, logout, subscribeToAccessTokenChanges } from '@/lib/api';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/icons';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSignedIn(Boolean(getAccessToken()));
  }, [pathname]);

  useEffect(() => subscribeToAccessTokenChanges(() => setSignedIn(Boolean(getAccessToken()))), []);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // Local token is cleared by `logout()` regardless of the server response.
    }
    setSignedIn(false);
    router.push('/');
    router.refresh();
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground lg:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Logo />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
          {primaryNav.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'focus-ring rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-surface text-foreground'
                    : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Tìm kiếm"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-surface"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />
          {signedIn ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="focus-ring hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface sm:inline-flex"
            >
              <UserIcon className="h-4 w-4" />
              Đăng xuất
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="focus-ring hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface sm:inline-flex"
            >
              <UserIcon className="h-4 w-4" />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 top-16 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label="Menu di động"
            className="relative m-3 animate-fade-up rounded-2xl border border-border bg-card p-3 shadow-lift"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'focus-ring block rounded-xl px-4 py-3 text-base font-medium transition-colors',
                  item.href === pathname
                    ? 'bg-surface text-foreground'
                    : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className="mt-2 block w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-medium text-primary-foreground"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-base font-medium text-primary-foreground"
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
