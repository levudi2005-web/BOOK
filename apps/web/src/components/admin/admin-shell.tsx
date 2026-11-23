'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  BellIcon,
  BookOpenIcon,
  CloseIcon,
  LibraryIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
} from '@/components/icons';

const nav = [
  { href: '/admin', label: 'Tổng quan', icon: StarIcon, exact: true },
  { href: '/admin/users', label: 'Người dùng', icon: UserIcon },
  { href: '/admin/books', label: 'Quản lý sách', icon: LibraryIcon },
  { href: '/admin/categories', label: 'Danh mục sách', icon: StarIcon },
  { href: '/admin/feedback', label: 'Phản hồi & báo cáo', icon: BellIcon },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldIcon },
  { href: '/admin/roles', label: 'Admin & phân quyền', icon: BellIcon },
  { href: '/admin/security', label: 'Bảo mật & nhật ký', icon: ShieldIcon },
  { href: '/admin/settings', label: 'Cấu hình hệ thống', icon: SettingsIcon },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden"
          aria-label="Đóng menu"
        >
          <CloseIcon />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpenIcon className="h-4 w-4" />
          Khu vực quản trị chưa xác thực
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-in bg-card shadow-lift">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card lg:hidden"
              aria-label="Mở menu"
            >
              <MenuIcon />
            </button>
            <p className="font-serif text-lg text-foreground">Quản trị</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="focus-ring hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              ← Về website
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="container-site animate-fade-up py-8">{children}</main>
      </div>
    </div>
  );
}
