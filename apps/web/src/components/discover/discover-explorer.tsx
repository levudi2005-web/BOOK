'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  fetchAuthors,
  fetchBooks,
  fetchCategories,
  fetchPublishers,
  type ApiAuthor,
  type ApiBook,
  type ApiCategory,
  type ApiPublisher,
  type BookQuery,
} from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, Input, Label } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { BookCard, BookCardSkeleton } from '@/components/books/book-card';
import { BookIcon, FilterIcon } from '@/components/icons';

const sortOptions = ['newest', 'popular', 'rating', 'title'] as const;

export function DiscoverExplorer() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryString = searchParams.toString();
  const category = searchParams.get('category') ?? '';
  const author = searchParams.get('author') ?? '';
  const publisher = searchParams.get('publisher') ?? '';
  const query = searchParams.get('q') ?? '';
  const year = searchParams.get('year') ?? '';
  const requestedSort = searchParams.get('sort');
  const sort = sortOptions.find((option) => option === requestedSort) ?? 'newest';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [authors, setAuthors] = useState<ApiAuthor[]>([]);
  const [publishers, setPublishers] = useState<ApiPublisher[]>([]);
  const [yearDraft, setYearDraft] = useState(year);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setYearDraft(year);
  }, [year]);

  function updateQuery(changes: Record<string, string>, resetPage = true) {
    const next = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete('page');
    const nextQuery = next.toString();
    if (nextQuery !== queryString) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetchCategories(), fetchAuthors(), fetchPublishers()])
      .then(([categoryResponse, authorResponse, publisherResponse]) => {
        if (!active) return;
        setCategories(categoryResponse.data);
        setAuthors(authorResponse.data);
        setPublishers(publisherResponse.data);
        setFilterError('');
      })
      .catch(() => {
        if (active) setFilterError('Không thể tải các lựa chọn bộ lọc. Vui lòng tải lại trang.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const nextQuery: BookQuery = { sort, page, limit: 12 };
      if (category) nextQuery.category = category;
      if (author) nextQuery.author = author;
      if (publisher) nextQuery.publisher = publisher;
      if (query.trim()) nextQuery.q = query.trim();
      if (/^\d{4}$/.test(year)) nextQuery.year = year;
      fetchBooks(nextQuery)
        .then((response) => {
          if (!active) return;
          setBooks(response.data);
          setMeta({ total: response.meta.total, totalPages: response.meta.totalPages });
          setError('');
        })
        .catch(() => {
          if (active) setError('Không thể tải danh sách sách. Vui lòng thử lại sau.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [category, author, publisher, query, year, sort, page]);

  const hasActiveFilters = Boolean(
    category || author || publisher || query || year || page > 1 || sort !== 'newest',
  );

  function renderFilterFields(suffix: 'desktop' | 'mobile') {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor={`discover-category-${suffix}`}>Danh mục</Label>
          <Select
            id={`discover-category-${suffix}`}
            value={category}
            onChange={(event) => updateQuery({ category: event.target.value })}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`discover-author-${suffix}`}>Tác giả</Label>
          <Select
            id={`discover-author-${suffix}`}
            value={author}
            onChange={(event) => updateQuery({ author: event.target.value })}
          >
            <option value="">Tất cả tác giả</option>
            {authors.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`discover-publisher-${suffix}`}>Nhà xuất bản</Label>
          <Select
            id={`discover-publisher-${suffix}`}
            value={publisher}
            onChange={(event) => updateQuery({ publisher: event.target.value })}
          >
            <option value="">Tất cả nhà xuất bản</option>
            {publishers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`discover-year-${suffix}`}>Năm xuất bản</Label>
          <Input
            id={`discover-year-${suffix}`}
            type="number"
            inputMode="numeric"
            min="1000"
            max={new Date().getFullYear() + 1}
            placeholder="VD: 2024"
            value={yearDraft}
            onChange={(event) => {
              const value = event.target.value;
              setYearDraft(value);
              if (!value || (/^\d{4}$/.test(value) && Number(value) >= 1000)) {
                updateQuery({ year: value });
              }
            }}
            onBlur={() => {
              if (yearDraft && !/^\d{4}$/.test(yearDraft)) setYearDraft(year);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FilterIcon className="h-4 w-4" />Bộ lọc
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters}
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              Xóa tất cả
            </Button>
          </div>
          {renderFilterFields('desktop')}
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <FilterIcon className="h-4 w-4" />Bộ lọc
            </Button>
            <p className="text-sm text-muted-foreground">{meta.total} kết quả</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Tìm trong kết quả"
              value={query}
              onChange={(event) => updateQuery({ q: event.target.value })}
              placeholder="Tìm trong kết quả…"
              className="h-10 w-40 sm:w-48"
            />
            <Select
              aria-label="Sắp xếp sách"
              className="h-10 w-36"
              value={sort}
              onChange={(event) => updateQuery({ sort: event.target.value })}
            >
              <option value="newest">Mới nhất</option>
              <option value="popular">Đọc nhiều</option>
              <option value="rating">Đánh giá cao</option>
              <option value="title">Tên sách A–Z</option>
            </Select>
            <div className="hidden items-center gap-1 sm:flex">
              <Button variant={view === 'grid' ? 'primary' : 'outline'} size="sm" onClick={() => setView('grid')}>Lưới</Button>
              <Button variant={view === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setView('list')}>DS</Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters}
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Bộ lọc</p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasActiveFilters}
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Xóa tất cả
              </Button>
            </div>
            {renderFilterFields('mobile')}
          </div>
        ) : null}

        {filterError ? <p role="status" className="mb-4 text-sm text-destructive">{filterError}</p> : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <BookCardSkeleton key={index} />)}
          </div>
        ) : error ? (
          <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Lỗi tải dữ liệu" description={error} />
        ) : books.length === 0 ? (
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Chưa có sách phù hợp"
            description={hasActiveFilters ? 'Thử thay đổi hoặc xóa bớt bộ lọc.' : 'Thư viện hiện chưa có sách công khai nào.'}
            action={hasActiveFilters ? (
              <Button variant="outline" onClick={() => router.replace(pathname, { scroll: false })}>
                Xóa tất cả bộ lọc
              </Button>
            ) : undefined}
          />
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => <BookCard key={book.book_uuid} book={book} />)}
          </div>
        ) : (
          <div className="space-y-3">{books.map((book) => <BookCard key={book.book_uuid} book={book} view="list" />)}</div>
        )}

        {!loading && !error && meta.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: String(page - 1) }, false)}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">Trang {page} / {meta.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => updateQuery({ page: String(page + 1) }, false)}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
