'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MoreVerticalIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'Trang chủ' },
  { href: '/discover', label: 'Khám phá' },
  { href: '/categories', label: 'Danh mục' },
  { href: '/library', label: 'Thư viện' },
  { href: '/community', label: 'Cộng đồng' },
  { href: '/write', label: 'Viết sách' },
  { href: '/profile', label: 'Tài khoản' },
];

export function SectionQuickMenu({ active }: { active?: string }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 160);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  if (!visible) return null;

  return (
    <div ref={root} className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 sm:right-5">
      <div className="relative">
        <button
          type="button"
          aria-label={open ? 'Đóng điều hướng nhanh' : 'Mở điều hướng nhanh'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105"
        >
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
        {open ? (
          <nav className="absolute right-[calc(100%+0.5rem)] top-1/2 w-48 -translate-y-1/2 rounded-xl border border-border bg-card p-2 shadow-lift">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
                  active === item.href ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-surface',
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setOpen(false);
              }}
              className="mt-0.5 block w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-surface"
            >
              Lên đầu trang
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
