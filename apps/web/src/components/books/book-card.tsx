import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiBook } from '@/lib/api';
import { BookCover } from '@/components/books/book-cover';
import { StarIcon } from '@/components/icons';

export function BookCard({ book, view = 'grid' }: { book: ApiBook; view?: 'grid' | 'list' }) {
  const rating = Number(book.average_rating ?? 0);

  if (view === 'list') {
    return (
      <Link
        href={`/books/${book.slug}`}
        className="focus-ring group flex gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/40 hover:bg-surface/40"
      >
        <div className="w-12 shrink-0">
          <BookCover
            title={book.title}
            subtitle={book.subtitle}
            authorName={book.author_name}
            slug={book.slug}
            coverKey={book.cover_storage_key}
            isPublic
            showSpine={false}
            placeholderLabel="Chưa có bìa"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 pb-0.5 text-[13px] font-semibold leading-normal text-foreground group-hover:text-primary">
            {book.title}
          </h3>
          {book.subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{book.subtitle}</p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <StarIcon className="h-3 w-3 text-primary" />
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
    <Link href={`/books/${book.slug}`} className="focus-ring group flex min-w-0 flex-col">
      <BookCover
        title={book.title}
        subtitle={book.subtitle}
        authorName={book.author_name}
        slug={book.slug}
        coverKey={book.cover_storage_key}
        isPublic
        placeholderLabel="Chưa có bìa"
        className="w-full transition-transform duration-200 group-hover:-translate-y-0.5"
      />
      <div className="mt-2 min-w-0">
        <h3 className="line-clamp-2 pb-0.5 text-[13px] font-semibold leading-normal text-foreground group-hover:text-primary">
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {book.author_name || 'Tác giả ẩn danh'}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <StarIcon className="h-3 w-3 text-primary" />
            {rating.toFixed(1)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{book.language}</span>
        </div>
      </div>
    </Link>
  );
}

export function BookCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-card p-2.5">
        <div className="h-20 w-12 shrink-0 animate-pulse rounded-md bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="aspect-[2/3] animate-pulse rounded-md bg-surface" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface" />
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
