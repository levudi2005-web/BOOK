'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { LibraryIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';
import { listLibrary, removeFromLibrary, updateLibrary, type LibraryItem } from '@/lib/api';

export function LibraryExplorer() {
  const { toast } = useToast();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.slug} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/books/${item.slug}`} className="line-clamp-2 font-serif text-lg text-foreground hover:underline">
                {item.title}
              </Link>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{item.status.replaceAll('_', ' ')}</p>
            </div>
            <Button variant={item.isFavorite ? 'accent' : 'ghost'} size="sm" onClick={() => onFavorite(item)}>
              {item.isFavorite ? '★' : '☆'}
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/reader/${item.slug}`} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">
              Đọc
            </Link>
            <Button variant="outline" size="sm" onClick={() => onRemove(item)}>Xóa</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

