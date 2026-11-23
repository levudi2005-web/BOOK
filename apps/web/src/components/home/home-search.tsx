'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { fetchBooks, type ApiBook } from '@/lib/api';
import { SearchBar } from '@/components/search-bar';
import { BookCover } from '@/components/books/book-cover';
import { CloseIcon, StarIcon } from '@/components/icons';

type SearchState = {
  query: string;
  books: ApiBook[];
  total: number;
  loading: boolean;
  error: string;
};

const EMPTY: SearchState = { query: '', books: [], total: 0, loading: false, error: '' };

/**
 * In-page search for the home page. Submitting the form never routes to
 * `/search`; it shows compact results directly under the input (FIX.md Phase 2).
 * The header search icon and `/search` page keep their own behaviour.
 */
export function HomeSearch() {
  const [state, setState] = useState<SearchState>(EMPTY);
  const requestRef = useRef(0);

  async function run(query: string) {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState({ query, books: [], total: 0, loading: true, error: '' });
    try {
      const response = await fetchBooks({ q: query, limit: 12 });
      if (requestRef.current !== requestId) return;
      setState({
        query,
        books: response.data,
        total: response.meta.total,
        loading: false,
        error: '',
      });
    } catch {
      if (requestRef.current !== requestId) return;
      setState({ query, books: [], total: 0, loading: false, error: 'Không thể tìm kiếm. Vui lòng thử lại.' });
    }
  }

  function onSubmit(value: string) {
    const query = value.trim();
    if (!query) {
      requestRef.current += 1;
      setState(EMPTY);
      return;
    }
    void run(query);
  }

  function close() {
    requestRef.current += 1;
    setState(EMPTY);
    const input = document.getElementById('home-search');
    if (input instanceof HTMLInputElement) input.focus({ preventScroll: true });
  }

  return (
    <div className="relative">
      <SearchBar large inputId="home-search" onSearch={onSubmit} />

      {state.query ? (
        <div
          role="region"
          aria-label="Kết quả tìm kiếm"
          aria-live="polite"
          className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lift"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">
              {state.loading
                ? `Đang tìm “${state.query}”…`
                : `${state.total.toLocaleString('vi-VN')} kết quả cho “${state.query}”`}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng kết quả tìm kiếm"
              className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {state.loading ? (
            <div className="space-y-1.5 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-2 rounded-lg p-1.5">
                  <div className="h-12 w-8 shrink-0 rounded bg-surface" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-surface" />
                    <div className="h-2.5 w-1/2 rounded bg-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : state.error ? (
            <p className="px-3 py-4 text-[12px] text-danger">{state.error}</p>
          ) : state.books.length === 0 ? (
            <p className="px-3 py-4 text-[12px] text-muted-foreground">
              Không tìm thấy sách phù hợp. Thử từ khóa khác.
            </p>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto p-1.5">
              {state.books.map((book) => (
                <Link
                  key={book.book_uuid}
                  href={`/books/${book.slug}`}
                  className="focus-ring flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface"
                >
                  <div className="w-8 shrink-0">
                    <BookCover
                      title={book.title}
                      subtitle={null}
                      authorName={null}
                      slug={book.slug}
                      coverKey={book.cover_storage_key}
                      isPublic
                      showSpine={false}
                      placeholderLabel=""
                      minimal
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12px] font-semibold text-foreground">{book.title}</p>
                    <p className="line-clamp-1 text-[10px] text-muted-foreground">
                      {book.author_name || 'Tác giả ẩn danh'}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                    <StarIcon className="h-3 w-3 text-primary" />
                    {Number(book.average_rating ?? 0).toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
