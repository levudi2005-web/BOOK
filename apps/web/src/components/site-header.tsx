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

  function focusHomeSearch() {
    const input = document.getElementById('home-search');
    if (input instanceof HTMLInputElement) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    }
  }

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
    <header className="sticky top-0 z-50 border-b border-border bg-header/95 backdrop-blur-md">
      <div className="container-site flex h-14 items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground lg:hidden"
          >
            {open ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
          <Logo />
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Điều hướng chính">
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
                  'focus-ring rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
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

        <div className="flex items-center gap-1.5">
          {pathname === '/' ? (
            <button
              type="button"
              onClick={focusHomeSearch}
              aria-label="Tìm kiếm trên trang chủ"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-surface"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/search"
              aria-label="Tìm kiếm"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-surface"
            >
              <SearchIcon className="h-4 w-4" />
            </Link>
          )}
          <ThemeToggle />
          {signedIn ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                aria-expanded={accountOpen}
                className="focus-ring flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary-foreground">
                  {(account?.profile.displayName || account?.username || 'T').slice(0, 1).toUpperCase()}
                </span>
                Tài khoản
              </button>
              {accountOpen ? (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-lift">
                  <div className="flex items-center gap-2 border-b border-border px-2 pb-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary-foreground">
                      {(account?.profile.displayName || account?.username || 'T').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{account?.profile.displayName || account?.username || 'Tài khoản'}</p>
                      <p className="truncate text-[11px] text-muted-foreground">@{account?.username ?? ''}</p>
                    </div>
                  </div>
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="mt-1.5 block rounded-lg px-2.5 py-1.5 text-[13px] text-foreground hover:bg-surface">
                    Trung tâm tài khoản
                  </Link>
                  <Link href="/preferences" onClick={() => setAccountOpen(false)} className="block rounded-lg px-2.5 py-1.5 text-[13px] text-foreground hover:bg-surface">
                    Sở thích đọc
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="mt-0.5 block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-danger/10"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="focus-ring hidden h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface sm:inline-flex"
            >
              <UserIcon className="h-4 w-4" />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 top-14 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label="Menu di động"
            className="relative m-2 animate-fade-up rounded-xl border border-border bg-card p-2 shadow-lift"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'focus-ring block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
                className="mt-1.5 block w-full rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                Tài khoản
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="mt-1.5 block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
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
