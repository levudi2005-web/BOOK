'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BookIcon, ShieldIcon } from '@/components/icons';
import { adminBooks, getAdminToken, isAuthError, type AdminListMeta } from '@/lib/api';

type BookRow = {
  book_uuid: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  published_at: string | null;
  created_at: string;
};

const LIMIT = 20;

export default function AdminBooksPage() {
  const [rows, setRows] = useState<BookRow[]>([]);
  const [meta, setMeta] = useState<AdminListMeta>({ page: 1, limit: LIMIT, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    if (!getAdminToken()) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await adminBooks(targetPage, LIMIT);
      setRows(result.data as unknown as BookRow[]);
      setMeta(result.meta);
      setError('');
      setAuthRequired(false);
    } catch (loadError) {
      if (isAuthError(loadError)) {
        setAuthRequired(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách sách.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (authRequired) {
    return (
      <EmptyState
        icon={<ShieldIcon className="h-6 w-6" />}
        title="Cần đăng nhập quản trị"
        description="Chỉ tài khoản admin có quyền book.read mới xem được dữ liệu này."
        action={
          <Link
            href="/admin/login"
            className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Đăng nhập quản trị
          </Link>
        }
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / LIMIT));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Sách</p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">Danh sách sách</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.total.toLocaleString('vi-VN')} đầu sách</p>
        </div>
        <Link
          href="/admin"
          className="focus-ring inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground"
        >
          ← Tổng quan
        </Link>
      </div>

      {loading ? (
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Không thể tải dữ liệu"
            description={error}
            action={<Button onClick={() => void load(page)}>Thử lại</Button>}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Chưa có sách" description="Chưa có sách nào trong hệ thống." />
        </div>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tiêu đề</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hiển thị</th>
                <th className="px-4 py-3">Xuất bản</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.book_uuid} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">/books/{row.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-foreground">{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.visibility}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.published_at ? new Date(row.published_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          Trang trước
        </Button>
        <span className="text-muted-foreground">
          Trang {page}/{totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
          Trang sau
        </Button>
      </div>
    </div>
  );
}
