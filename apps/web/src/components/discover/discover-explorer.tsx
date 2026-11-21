'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAuthors, fetchBooks, fetchCategories, fetchPublishers, type ApiAuthor, type ApiBook, type ApiCategory, type ApiPublisher, type BookQuery } from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, Input, Label } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { BookCard, BookCardSkeleton } from '@/components/books/book-card';
import { BookIcon, FilterIcon } from '@/components/icons';

export function DiscoverExplorer() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [authors, setAuthors] = useState<ApiAuthor[]>([]);
  const [publishers, setPublishers] = useState<ApiPublisher[]>([]);
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [author, setAuthor] = useState(searchParams.get('author') ?? '');
  const [publisher, setPublisher] = useState(searchParams.get('publisher') ?? '');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'popular' | 'rating' | 'title'>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCategories().then((response) => { if (active) setCategories(response.data); }).catch(() => {});
    fetchAuthors().then((response) => { if (active) setAuthors(response.data); }).catch(() => {});
    fetchPublishers().then((response) => { if (active) setPublishers(response.data); }).catch(() => {});
    return () => { active = false; };
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
      fetchBooks(nextQuery)
        .then((response) => {
          if (!active) return;
          setBooks(response.data);
          setMeta({ total: response.meta.total, totalPages: response.meta.totalPages });
          setError('');
        })
        .catch(() => { if (active) setError('Không thể tải danh sách sách. Vui lòng thử lại sau.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [category, author, publisher, query, sort, page]);


  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block"><div className="h-72 animate-pulse rounded-2xl bg-surface" /></aside>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><FilterIcon className="h-4 w-4" />Bộ lọc</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="discover-category">Danh mục</Label>
              <Select id="discover-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">Tất cả danh mục</option>
                {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="discover-author">Tác giả</Label>
              <Select id="discover-author" value={author} onChange={(e) => { setAuthor(e.target.value); setPage(1); }}>
                <option value="">Tất cả tác giả</option>
                {authors.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="discover-publisher">Nhà xuất bản</Label>
              <Select id="discover-publisher" value={publisher} onChange={(e) => { setPublisher(e.target.value); setPage(1); }}>
                <option value="">Tất cả nhà xuất bản</option>
                {publishers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="discover-year">Năm xuất bản</Label>
              <Select id="discover-year" disabled><option value="">Tất cả năm (cần backend)</option></Select>
            </div>
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters((v) => !v)}><FilterIcon className="h-4 w-4" />Bộ lọc</Button>
            <p className="text-sm text-muted-foreground">{meta.total} kết quả</p>
          </div>
          <div className="flex items-center gap-2">
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Tìm trong kết quả…" className="h-10 w-40 sm:w-48" />
            <Select className="h-10 w-36" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="newest">Mới nhất</option>
              <option value="popular">Đọc nhiều</option>
              <option value="rating">Đánh giá cao</option>
              <option value="title">Tên sách A–Z</option>
            </Select>
            <div className="hidden items-center gap-1 sm:flex">
              <Button variant={view === 'grid' ? 'primary' : 'outline'} size="sm" onClick={() => setView('grid')}>Lưới</Button>
              <Button variant={view === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setView('list')}>DS</Button>
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 lg:hidden">
            <Label htmlFor="discover-category-mobile">Danh mục</Label>
            <Select id="discover-category-mobile" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">Tất cả danh mục</option>
              {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
            <Label htmlFor="discover-author-mobile">Tác giả</Label>
            <Select id="discover-author-mobile" value={author} onChange={(e) => { setAuthor(e.target.value); setPage(1); }}>
              <option value="">Tất cả tác giả</option>
              {authors.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
            <Label htmlFor="discover-publisher-mobile">Nhà xuất bản</Label>
            <Select id="discover-publisher-mobile" value={publisher} onChange={(e) => { setPublisher(e.target.value); setPage(1); }}>
              <option value="">Tất cả nhà xuất bản</option>
              {publishers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
          </div>
        ) : null}

        {error ? (
          <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Lỗi tải dữ liệu" description={error} />
        ) : books.length === 0 ? (
          <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Chưa có sách" description="Thư viện hiện chưa có sách công khai nào." />
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <BookCard key={book.book_uuid} book={book} />)}</div>
        ) : (
          <div className="space-y-3">{books.map((book) => <BookCard key={book.book_uuid} book={book} view="list" />)}</div>
        )}

        {meta.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Trước</Button>
            <span className="text-sm text-muted-foreground">Trang {page} / {meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((v) => v + 1)}>Sau</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
