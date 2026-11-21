'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BookIcon, ClockIcon } from '@/components/icons';
import { isAuthError, listHistory, type ReadingHistoryItem } from '@/lib/api';

export default function ReadingHistoryPage() {
  const [items, setItems] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listHistory();
      setItems(result.data);
      setError('');
      setAuthRequired(false);
    } catch (loadError) {
      if (isAuthError(loadError)) {
        setAuthRequired(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử đọc.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-9 w-56" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<ClockIcon className="h-6 w-6" />}
          title="Đăng nhập để xem lịch sử đọc"
          description="Lịch sử đọc được lưu theo tài khoản của bạn."
          action={
            <Link
              href="/auth/login"
              className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Đăng nhập
            </Link>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<ClockIcon className="h-6 w-6" />}
          title="Không thể tải lịch sử đọc"
          description={error}
          action={<Button onClick={() => void load()}>Thử lại</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-site py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Thư viện</p>
      <h1 className="mt-2 font-serif text-3xl text-foreground">Lịch sử đọc</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {items.length > 0 ? `${items.length} lượt đọc gần đây` : 'Chưa có lượt đọc nào'}
      </p>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Chưa có lịch sử đọc"
            description="Mở một cuốn sách trong thư viện để bắt đầu ghi lại lịch sử."
            action={
              <Link
                href="/library"
                className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Mở thư viện
              </Link>
            }
          />
        </div>
      ) : (
        <Card className="mt-6 divide-y divide-border p-0">
          {items.map((item) => (
            <div key={item.history_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-serif text-lg text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.chapter_number
                    ? `Chương ${item.chapter_number}${item.chapter_title ? `: ${item.chapter_title}` : ''} · `
                    : ''}
                  Đọc lúc {new Date(item.started_at).toLocaleString('vi-VN')}
                  {item.pages_read ? ` · ${item.pages_read} trang` : ''}
                </p>
              </div>
              <Link
                href={
                  item.chapter_uuid
                    ? `/reader/${item.slug}?chapter=${encodeURIComponent(item.chapter_uuid)}`
                    : `/reader/${item.slug}`
                }
                className="focus-ring inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground"
              >
                Đọc tiếp
              </Link>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
