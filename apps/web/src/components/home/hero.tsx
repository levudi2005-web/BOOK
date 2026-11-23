import Link from 'next/link';
import { Suspense } from 'react';
import { HomeSearch } from '@/components/home/home-search';

const chips = ['Đọc mọi lúc', 'Thư viện cá nhân', 'Viết & xuất bản'];

const coverTiles = [
  { height: 'h-24', tone: 'linear-gradient(160deg, #245B5C, #4CCFD0)' },
  { height: 'h-32', tone: 'linear-gradient(160deg, #4CCFD0, #8DE8E8)' },
  { height: 'h-28', tone: 'linear-gradient(160deg, #163B3C, #6FDEDE)' },
  { height: 'h-20', tone: 'linear-gradient(160deg, #8DE8E8, #FDFCF8)' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(55% 60% at 85% 0%, rgb(var(--accent) / 0.22), transparent 65%), radial-gradient(45% 50% at 0% 100%, rgb(var(--primary) / 0.10), transparent 65%)',
        }}
      />
      <div className="container-site relative flex items-center justify-between gap-8 py-7 sm:py-9">
        <div className="min-w-0 max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-accent/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
            Thư viện số
          </span>
          <h1 className="mt-2 text-balance text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Đọc, viết và khám phá <span className="text-primary">theo cách của bạn</span>.
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            Tìm sách mới, theo dõi tiến độ đọc và chia sẻ tác phẩm trong một không gian gọn gàng.
          </p>

          <div className="mt-4 max-w-xl">
            <Suspense fallback={<div className="h-11 animate-pulse rounded-full bg-surface" />}>
              <HomeSearch />
            </Suspense>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/discover"
              className="focus-ring inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Khám phá sách
            </Link>
            <Link
              href="/write"
              className="focus-ring inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-[12px] font-semibold text-foreground transition hover:bg-surface"
            >
              Viết sách
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" />
            {chips.map((chip) => (
              <span key={chip} className="text-[11px] text-muted-foreground">
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 items-end gap-2 lg:flex" aria-hidden="true">
          {coverTiles.map((tile, index) => (
            <span
              key={tile.tone}
              className={`w-12 rounded-md shadow-soft ${tile.height}`}
              style={{ background: tile.tone, transform: `rotate(${(index - 1.5) * 2}deg)` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
