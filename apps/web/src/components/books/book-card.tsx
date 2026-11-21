import Link from 'next/link';
import { cn } from '@/lib/utils';
import { publicCoverUrl, type ApiBook } from '@/lib/api';
import { StarIcon } from '@/components/icons';

const coverPalette = ['#173F35', '#315C4C', '#6B4F2A', '#4A3B52', '#7A4A3A', '#3A4A5C', '#2F5C54', '#5C523A'];

function coverTone(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return coverPalette[hash % coverPalette.length];
}

export function BookCard({ book, view = 'grid' }: { book: ApiBook; view?: 'grid' | 'list' }) {
  const rating = Number(book.average_rating ?? 0);

  if (view === 'list') {
    return (
      <Link
        href={`/books/${book.slug}`}
        className="focus-ring group flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
      >
        <div
          className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md px-2 text-center"
          style={{ backgroundColor: coverTone(book.slug) }}
        >
          {book.cover_storage_key ? (
            <img
              src={publicCoverUrl(book.slug)}
              alt={`Bìa sách ${book.title}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="line-clamp-3 font-serif text-xs leading-tight text-white/90">{book.title}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg text-foreground group-hover:text-primary">
            {book.title}
          </h3>
          {book.subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{book.subtitle}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <StarIcon className="h-3.5 w-3.5 text-accent" />
              {rating.toFixed(1)}
            </span>
            <span>{book.language}</span>
            {book.publication_date ? <span>{String(book.publication_date).slice(0, 4)}</span> : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/books/${book.slug}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div
        className="relative flex aspect-[3/4] items-center justify-center overflow-hidden p-6 text-center"
        style={{ backgroundColor: coverTone(book.slug) }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(80% 60% at 20% 0%, rgba(255,255,255,0.5), transparent 60%)' }}
        />
        <div className="relative">
          <p className="font-serif text-xl leading-snug text-white/95 line-clamp-4">{book.title}</p>
          {book.subtitle ? (
            <p className="mt-2 text-xs text-white/70 line-clamp-2">{book.subtitle}</p>
          ) : null}
        </div>
        {book.cover_storage_key ? (
          <img
            src={publicCoverUrl(book.slug)}
            alt={`Bìa sách ${book.title}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.2em] text-white/60">
          BOOKFORFREEDOM
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-serif text-base text-foreground group-hover:text-primary">
          {book.title}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <StarIcon className="h-3.5 w-3.5 text-accent" />
            {rating.toFixed(1)}
          </span>
          <span>{book.language}</span>
        </div>
      </div>
    </Link>
  );
}

export function BookCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="h-24 w-16 shrink-0 animate-pulse rounded-md bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[3/4] animate-pulse bg-surface" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}

export function BookCardEmpty({ className }: { className?: string }) {
  return (
    <div className={cn('text-sm text-muted-foreground', className)}>Chưa có sách.</div>
  );
}
