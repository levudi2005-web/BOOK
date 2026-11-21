'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/admin/metric-card';
import { BellIcon, ShieldIcon } from '@/components/icons';
import { adminStats, getAdminToken, isAuthError, type AdminStats } from '@/lib/api';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    try {
      const result = await adminStats();
      setStats(result);
      setError('');
      setAuthRequired(false);
    } catch (loadError) {
      if (isAuthError(loadError)) {
        setAuthRequired(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải số liệu.');
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
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <EmptyState
        icon={<ShieldIcon className="h-6 w-6" />}
        title="Cần đăng nhập quản trị"
        description="Khu vực này yêu cầu tài khoản admin có quyền phù hợp."
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

  if (!stats) {
    return (
      <EmptyState
        icon={<BellIcon className="h-6 w-6" />}
        title="Không thể tải số liệu"
        description={error || 'Vui lòng thử lại.'}
        action={<Button onClick={() => { setLoading(true); void load(); }}>Thử lại</Button>}
      />
    );
  }

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Tổng quan</p>
        <h1 className="mt-2 font-serif text-3xl text-foreground">Bảng điều khiển</h1>
        <p className="mt-1 text-sm text-muted-foreground">Số liệu thực tế từ cơ sở dữ liệu hệ thống.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Tổng người dùng"
          value={stats.users.total.toLocaleString('vi-VN')}
          hint={`${stats.users.active} đang hoạt động`}
        />
        <MetricCard
          label="Tổng sách"
          value={stats.books.total.toLocaleString('vi-VN')}
          hint={`${stats.books.draft} bản nháp`}
        />
        <MetricCard
          label="Sách đã xuất bản"
          value={stats.books.published.toLocaleString('vi-VN')}
          hint="Hiển thị công khai"
        />
        <MetricCard
          label="Bình luận"
          value={stats.comments.toLocaleString('vi-VN')}
          hint="Chưa bị xoá"
        />
        <MetricCard
          label="Tệp lưu trữ"
          value={stats.storage.objects.toLocaleString('vi-VN')}
          hint={formatBytes(stats.storage.usedBytes)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-serif text-lg text-foreground">Quản lý người dùng</h2>
          <p className="mt-1 text-sm text-muted-foreground">Xem danh sách, trạng thái và thời điểm đăng nhập.</p>
          <Link
            href="/admin/users"
            className="focus-ring mt-4 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Mở danh sách người dùng
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="font-serif text-lg text-foreground">Quản lý sách</h2>
          <p className="mt-1 text-sm text-muted-foreground">Theo dõi trạng thái xuất bản và chế độ hiển thị.</p>
          <Link
            href="/admin/books"
            className="focus-ring mt-4 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground"
          >
            Mở danh sách sách
          </Link>
        </Card>
      </div>
    </div>
  );
}

