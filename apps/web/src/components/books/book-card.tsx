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
        className="focus-ring group flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
      >
        <div className="w-16 shrink-0">
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
      <div className="p-3 pb-0">
        <BookCover
          title={book.title}
          subtitle={book.subtitle}
          authorName={book.author_name}
          slug={book.slug}
          coverKey={book.cover_storage_key}
          isPublic
          placeholderLabel="Chưa có bìa"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-serif text-base text-foreground group-hover:text-primary">
          {book.title}
        </h3>
        {book.author_name ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">Tác giả: {book.author_name}</p>
        ) : null}
        {book.publisher_name || book.publication_year ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[book.publisher_name, book.publication_year ? String(book.publication_year) : ''].filter(Boolean).join(' · ')}
          </p>
        ) : null}
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
