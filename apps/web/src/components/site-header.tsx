'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { primaryNav } from '@/lib/site';
import { getAccessToken, getMyProfile, logout, subscribeToAccessTokenChanges, type MyProfile } from '@/lib/api';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/icons';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [account, setAccount] = useState<MyProfile | null>(null);

  useEffect(() => {
    setOpen(false);
    setSignedIn(Boolean(getAccessToken()));
  }, [pathname]);

  useEffect(() => subscribeToAccessTokenChanges(() => setSignedIn(Boolean(getAccessToken()))), []);

  useEffect(() => {
    if (!signedIn) {
      setAccount(null);
      setAccountOpen(false);
      return;
    }
    let active = true;
    getMyProfile()
      .then((profile) => {
        if (active) setAccount(profile);
      })
      .catch(() => {
        if (active) setAccount(null);
      });
    return () => { active = false; };
  }, [signedIn]);

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
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                aria-expanded={accountOpen}
                className="focus-ring flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-serif text-sm text-primary">
                  {(account?.profile.displayName || account?.username || 'T').slice(0, 1).toUpperCase()}
                </span>
                Tài khoản
              </button>
              {accountOpen ? (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-lift">
                  <div className="flex items-center gap-3 border-b border-border px-2 pb-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-lg text-primary">
                      {(account?.profile.displayName || account?.username || 'T').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{account?.profile.displayName || account?.username || 'Tài khoản'}</p>
                      <p className="truncate text-xs text-muted-foreground">@{account?.username ?? ''}</p>
                    </div>
                  </div>
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="mt-2 block rounded-xl px-3 py-2 text-sm text-foreground hover:bg-surface">
                    Trung tâm tài khoản
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
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
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="mt-2 block w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-medium text-primary-foreground"
              >
                Tài khoản
              </Link>
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
