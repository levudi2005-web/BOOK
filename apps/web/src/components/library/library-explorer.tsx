'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { LibraryIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { listLibrary, removeFromLibrary, updateLibrary, type LibraryItem } from '@/lib/api';
import { BookCover } from '@/components/books/book-cover';
import { Input, Label, Select } from '@/components/ui/field';

function LibraryBookCover({ item }: { item: LibraryItem }) {
  const isPublicBook = (item.book_visibility ?? 'public') === 'public';
  return (
    <BookCover
      title={item.title}
      subtitle={item.subtitle}
      slug={item.slug}
      coverKey={item.cover_storage_key}
      ownerBookUuid={item.book_uuid}
      isPublic={isPublicBook}
      placeholderLabel="Chưa có bìa"
      className="mx-auto w-full max-w-44 rounded-xl shadow-soft"
    />
  );
}

export function LibraryExplorer() {
  const { toast } = useToast();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'reading' | 'finished' | 'favorite' | 'saved'>('all');
  const [sort, setSort] = useState<'recent' | 'title' | 'added'>('recent');

  async function refresh() {
    try {
      const res = await listLibrary();
      setItems(res.data);
    } catch {
      toast('Vui lòng đăng nhập để xem thư viện.', 'default');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = items.filter((item) => {
      if (tab === 'favorite' && !item.isFavorite) return false;
      if (tab === 'finished' && item.status !== 'finished' && !item.finished_at) return false;
      if (tab === 'reading' && item.status !== 'reading') return false;
      if (tab === 'saved' && item.isFavorite) return false;
      if (needle && !`${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return [...next].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'vi');
      if (sort === 'added') return b.added_at.localeCompare(a.added_at);
      return (b.last_opened_at ?? b.added_at).localeCompare(a.last_opened_at ?? a.added_at);
    });
  }, [items, query, sort, tab]);

  async function onFavorite(item: LibraryItem) {
    try {
      await updateLibrary(item.slug, { isFavorite: !item.isFavorite });
      await refresh();
    } catch {
      toast('Không thể cập nhật yêu thích.', 'default');
    }
  }

  async function onRemove(item: LibraryItem) {
    try {
      await removeFromLibrary(item.slug);
      await refresh();
    } catch {
      toast('Không thể xóa khỏi thư viện.', 'default');
    }
  }

  if (loading) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LibraryIcon className="h-6 w-6" />}
        title="Thư viện cá nhân đang trống"
        description="Thêm sách vào thư viện từ trang chi tiết sách để theo dõi tiến độ đọc."
      />
    );
  }

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
        <div>
          <Label htmlFor="library-search">Tìm trong thư viện</Label>
          <Input id="library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc mô tả sách…" />
        </div>
        <div>
          <Label htmlFor="library-tab">Nhóm</Label>
          <Select id="library-tab" value={tab} onChange={(event) => setTab(event.target.value as typeof tab)}>
            <option value="all">Tất cả</option>
            <option value="reading">Đang đọc</option>
            <option value="finished">Đã hoàn thành</option>
            <option value="favorite">Yêu thích</option>
            <option value="saved">Đã lưu</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="library-sort">Sắp xếp</Label>
          <Select id="library-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="recent">Gần đây</option>
            <option value="added">Mới thêm</option>
            <option value="title">Tên sách</option>
          </Select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<LibraryIcon className="h-6 w-6" />} title="Không có sách phù hợp" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <article key={item.slug} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <LibraryBookCover item={item} />
              <div className="mt-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/books/${item.slug}`} className="line-clamp-2 font-serif text-lg text-foreground hover:text-primary">
                    {item.title}
                  </Link>
                  <Button variant={item.isFavorite ? 'accent' : 'ghost'} size="sm" onClick={() => onFavorite(item)} aria-label={item.isFavorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}>
                    {item.isFavorite ? '★' : '☆'}
                  </Button>
                </div>
                {item.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.status.replaceAll('_', ' ')}
                  {item.finished_at ? ' · Đã hoàn thành' : ''}
                  {Number(item.seconds_read ?? 0) > 0
                    ? ` · ${Math.max(1, Math.floor(Number(item.seconds_read) / 60))} phút đọc`
                    : ''}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, Number(item.progress_percent ?? 0)))}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {Math.round(Number(item.progress_percent ?? 0))}% tiến độ
                  {item.page_number && item.total_pages ? ` · trang ${item.page_number}/${item.total_pages}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/reader/${item.slug}`} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">
                    {item.last_opened_at ? 'Tiếp tục đọc' : 'Đọc ngay'}
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => onRemove(item)}>Bỏ khỏi thư viện</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

