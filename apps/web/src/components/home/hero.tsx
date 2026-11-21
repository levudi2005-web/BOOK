import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBar } from '@/components/search-bar';
import { BookShelf } from '@/components/book-shelf';
import { Badge } from '@/components/ui/badge';
import { SparkleIcon } from '@/components/icons';

const features = ['Đọc sâu và ghi chú', 'Cộng đồng đọc sách', 'Thư viện cá nhân'];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 60% at 80% 0%, rgb(var(--accent) / 0.14), transparent 60%), radial-gradient(40% 40% at 0% 100%, rgb(var(--primary) / 0.08), transparent 60%)',
        }}
      />
      <div className="container-site relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="animate-fade-up">
          <Badge variant="accent" className="mb-5 gap-1.5">
            <SparkleIcon className="h-3.5 w-3.5" />
            Thư viện số · Giai đoạn nền móng
          </Badge>
          <h1 className="text-balance font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
            Một thư viện số cho những tâm hồn{' '}
            <span className="text-primary">tự do</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Không gian đọc yên tĩnh, có chiều sâu và bản sắc riêng — nơi bạn viết,
            đọc và khám phá sách theo cách của riêng mình.
          </p>

          <div className="mt-7 max-w-xl">
            <Suspense fallback={<div className="h-14 animate-pulse rounded-full bg-surface" />}>
              <SearchBar large />
            </Suspense>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {features.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground"
              >
                {feature}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              Khám phá sách
            </Link>
            <Link
              href="/categories"
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              Xem danh mục
            </Link>
          </div>
        </div>

        <div className="animate-fade-up animation-delay-200 lg:justify-self-end">
          <BookShelf className="mx-auto w-full max-w-md" />
        </div>
      </div>
    </section>
  );
}
