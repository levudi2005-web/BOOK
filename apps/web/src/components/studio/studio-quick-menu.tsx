'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVerticalIcon } from '@/components/icons';

type Props = {
  steps: { id: string; label: string }[];
  active: string;
  onStep: (id: string) => void;
  onPublish: () => void;
};

export function StudioQuickMenu({ steps, active, onStep, onPublish }: Props) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 260);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible) return null;

  return (
    <div ref={root} className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 sm:right-5">
      <div className="relative flex items-center">
        <button
          type="button"
          aria-label={open ? 'Đóng thao tác viết sách' : 'Mở thao tác viết sách'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
        >
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
        {open ? (
          <nav className="absolute right-[calc(100%+0.5rem)] top-1/2 w-52 -translate-y-1/2 rounded-xl border border-border bg-card p-2 shadow-lift">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bước viết sách
            </p>
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  onStep(step.id);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  active === step.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-surface'
                }`}
              >
                {step.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onPublish();
                setOpen(false);
              }}
              className="mt-1 block w-full rounded-lg bg-primary px-2.5 py-1.5 text-left text-[13px] font-semibold text-primary-foreground"
            >
              Xuất bản
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
