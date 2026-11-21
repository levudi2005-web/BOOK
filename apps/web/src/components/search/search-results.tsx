'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { searchBooks } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon } from '@/components/icons';

type Hit = {
  id?: string;
  slug?: string;
  title?: string;
  subtitle?: string | null;
  authors?: string;
};

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const run = useCallback(async () => {
    if (!query) {
      setHits([]);
      setTotal(0);
      setError('');
      return;
    }
    setLoading(true);
    try {
      const result = await searchBooks(query);
      setHits(result.hits as Hit[]);
      setTotal(result.estimatedTotalHits);
      setError('');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Không thể tìm kiếm.');
      setHits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void run();
  }, [run, attempt]);

  if (!query) {
    return (
      <EmptyState
        icon={<SearchIcon className="h-6 w-6" />}
        title="Nhập từ khóa để bắt đầu"
        description="Kết quả tìm kiếm theo tên sách, mô tả và tác giả sẽ hiển thị tại đây."
      />
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<SearchIcon className="h-6 w-6" />}
        title="Không thể tìm kiếm"
        description={error}
        action={<Button onClick={() => setAttempt((value) => value + 1)}>Thử lại</Button>}
      />
    );
  }

  if (hits.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon className="h-6 w-6" />}
        title="Không tìm thấy kết quả"
        description={`Không có sách nào khớp với “${query}”. Hãy thử từ khóa khác.`}
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {total.toLocaleString('vi-VN')} kết quả cho “{query}”
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hits.map((hit) => (
          <Link key={hit.id ?? hit.slug} href={`/books/${hit.slug ?? ''}`} className="focus-ring block">
            <Card className="h-full p-5 transition hover:bg-surface">
              <h3 className="line-clamp-2 font-serif text-lg text-foreground">{hit.title ?? 'Không rõ tiêu đề'}</h3>
              {hit.subtitle ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.subtitle}</p>
              ) : null}
              {hit.authors ? (
                <p className="mt-3 text-xs text-muted-foreground">{hit.authors}</p>
              ) : null}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
