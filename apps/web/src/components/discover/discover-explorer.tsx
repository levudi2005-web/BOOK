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
  type ApiPublisher,
  type BookQuery,
  type CategoryGroup,
} from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, Input, Label } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { BookCard, BookCardSkeleton } from '@/components/books/book-card';
import { BookIcon, FilterIcon } from '@/components/icons';
import { DiscoverQuickMenu } from '@/components/discover/discover-quick-menu';
import { CategoryPicker } from '@/components/categories/category-picker';

const sortOptions = ['newest', 'popular', 'rating', 'title'] as const;

export function DiscoverExplorer() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryString = searchParams.toString();
  const group = searchParams.get('group') ?? '';
  const categoriesParam = searchParams.get('categories') ?? '';
  const legacyCategory = searchParams.get('category') ?? '';
  const selectedCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
  const activeCategories =
    selectedCategories.length > 0
      ? selectedCategories
      : legacyCategory
        ? [legacyCategory]
        : [];
  const author = searchParams.get('author') ?? '';
  const publisher = searchParams.get('publisher') ?? '';
  const query = searchParams.get('q') ?? '';
  const year = searchParams.get('year') ?? '';
  const requestedSort = searchParams.get('sort');
  const sort = sortOptions.find((option) => option === requestedSort) ?? 'newest';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
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
  const [columns, setColumns] = useState(5);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      setColumns(width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const pageSize = columns * 3;

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
        setCategoryGroups(categoryResponse.groups);
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
      const nextQuery: BookQuery = { sort, page, limit: pageSize };
      if (group) nextQuery.group = group;
      if (categoriesParam) nextQuery.categories = categoriesParam;
      else if (legacyCategory) nextQuery.category = legacyCategory;
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
  }, [group, categoriesParam, legacyCategory, author, publisher, query, year, sort, page, pageSize]);

  const hasActiveFilters = Boolean(
    group ||
      activeCategories.length > 0 ||
      author ||
      publisher ||
      query ||
      year ||
      page > 1 ||
      sort !== 'newest',
  );

  useEffect(() => {
    if (loading || error || meta.totalPages === 0) return;
    if (page > meta.totalPages) {
      updateQuery({ page: meta.totalPages === 1 ? '' : String(meta.totalPages) }, false);
    }
    // `updateQuery` is stable enough for this one-way clamp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, meta.totalPages, page]);

  function resetFilters() {
    router.replace(pathname, { scroll: false });
  }

  function goToPage(target: number) {
    if (meta.totalPages === 0) return;
    const safe = Math.min(Math.max(1, target), meta.totalPages);
    updateQuery({ page: safe === 1 ? '' : String(safe) }, false);
  }

  function pageItems(current: number, total: number): (number | 'ellipsis')[] {
    const pages = new Set<number>([1, total]);
    for (let value = Math.max(1, current - 5); value <= Math.min(total, current + 5); value += 1) {
      pages.add(value);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const items: (number | 'ellipsis')[] = [];
    let previous = 0;
    for (const value of sorted) {
      if (previous && value - previous > 1) items.push('ellipsis');
      items.push(value);
      previous = value;
    }
    return items;
  }

  const pickerGroups = categoryGroups.map((item) => ({
    id: item.category_id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    icon: item.icon,
    children: item.children.map((child) => ({
      id: child.category_id,
      name: child.name,
      slug: child.slug,
      description: child.description,
      icon: child.icon,
    })),
  }));

  function renderFilterFields(suffix: 'desktop' | 'mobile') {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={`discover-group-${suffix}`} className="mb-1 text-[11px]">Nhóm danh mục</Label>
          <Select
            id={`discover-group-${suffix}`}
            className="h-9 text-[12px]"
            value={group}
            onChange={(event) =>
              updateQuery({ group: event.target.value, categories: '', category: '' })
            }
          >
            <option value="">Tất cả nhóm</option>
            {categoryGroups.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="mb-1 text-[11px]">Thể loại</Label>
          <CategoryPicker
            compact
            idPrefix={`discover-category-${suffix}`}
            groups={pickerGroups}
            selected={activeCategories}
            valueKey="slug"
            onChange={(values) =>
              updateQuery({ categories: values.join(','), category: '', group: '' })
            }
          />
        </div>
        <div>
          <Label htmlFor={`discover-author-${suffix}`} className="mb-1 text-[11px]">Tác giả</Label>
          <Input
            id={`discover-author-${suffix}`}
            list={`discover-author-options-${suffix}`}
            className="h-9 text-[12px]"
            value={author}
            placeholder="Nhập tên tác giả…"
            autoComplete="off"
            onChange={(event) => updateQuery({ author: event.target.value })}
          />
          <datalist id={`discover-author-options-${suffix}`}>
            {authors.map((item) => <option key={item.slug} value={item.name} />)}
          </datalist>
        </div>
        <div>
          <Label htmlFor={`discover-publisher-${suffix}`} className="mb-1 text-[11px]">Nhà xuất bản</Label>
          <Input
            id={`discover-publisher-${suffix}`}
            list={`discover-publisher-options-${suffix}`}
            className="h-9 text-[12px]"
            value={publisher}
            placeholder="Nhập tên nhà xuất bản…"
            autoComplete="off"
            onChange={(event) => updateQuery({ publisher: event.target.value })}
          />
          <datalist id={`discover-publisher-options-${suffix}`}>
            {publishers.map((item) => <option key={item.slug} value={item.name} />)}
          </datalist>
        </div>
        <div>
          <Label htmlFor={`discover-year-${suffix}`} className="mb-1 text-[11px]">Năm xuất bản</Label>
          <Input
            id={`discover-year-${suffix}`}
            className="h-9 text-[12px]"
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
    <>
    <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
      <aside className="hidden lg:block">
        <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-9 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 lg:hidden"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <FilterIcon className="h-4 w-4" />Bộ lọc
            </Button>
            <p className="text-[12px] text-muted-foreground">{meta.total} kết quả · {pageSize} sách/trang</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40 shrink-0 sm:w-48">
              <Input
                aria-label="Tìm trong kết quả"
                value={query}
                onChange={(event) => updateQuery({ q: event.target.value })}
                placeholder="Tìm trong kết quả…"
                className="h-9 text-[12px]"
              />
            </div>
            <div className="w-36 shrink-0">
              <Select
                aria-label="Sắp xếp sách"
                className="h-9 text-[12px]"
                value={sort}
                onChange={(event) => updateQuery({ sort: event.target.value })}
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Đọc nhiều</option>
                <option value="rating">Đánh giá cao</option>
                <option value="title">Tên sách A–Z</option>
              </Select>
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              <Button variant={view === 'grid' ? 'primary' : 'outline'} size="sm" className="h-9" onClick={() => setView('grid')}>Lưới</Button>
              <Button variant={view === 'list' ? 'primary' : 'outline'} size="sm" className="h-9" onClick={() => setView('list')}>DS</Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              disabled={!hasActiveFilters}
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="mb-3 rounded-xl border border-border bg-card p-3 lg:hidden">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Bộ lọc</p>
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: pageSize }).map((_, index) => <BookCardSkeleton key={index} />)}
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => <BookCard key={book.book_uuid} book={book} />)}
          </div>
        ) : (
          <div className="space-y-3">{books.map((book) => <BookCard key={book.book_uuid} book={book} view="list" />)}</div>
        )}

        {!loading && !error && meta.total > 0 ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-9 px-0 leading-normal"
                disabled={page <= 1}
                aria-label="Trang đầu"
                title="Trang đầu"
                onClick={() => goToPage(1)}
              >
                {'<<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 leading-normal"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Trước
              </Button>
              {pageItems(page, Math.max(1, meta.totalPages)).map((item, index) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-[11px] text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page ? 'primary' : 'outline'}
                    size="sm"
                    className="h-8 min-w-8 px-2 leading-normal"
                    aria-current={item === page ? 'page' : undefined}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 leading-normal"
                disabled={page >= meta.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Sau
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-9 px-0 leading-normal"
                disabled={page >= meta.totalPages}
                aria-label="Trang cuối"
                title="Trang cuối"
                onClick={() => goToPage(meta.totalPages)}
              >
                {'>>'}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Trang {page} / {Math.max(1, meta.totalPages)} · {pageSize} sách/trang
            </p>
          </div>
        ) : null}
      </div>
    </div>
    <DiscoverQuickMenu
      categoryGroups={categoryGroups}
      authors={authors}
      publishers={publishers}
      group={group}
      selectedCategories={activeCategories}
      author={author}
      publisher={publisher}
      year={year}
      query={query}
      sort={sort}
      page={page}
      totalPages={meta.totalPages}
      hasActiveFilters={hasActiveFilters}
      onApply={updateQuery}
      onReset={resetFilters}
      onPage={goToPage}
    />
    </>
  );
}
