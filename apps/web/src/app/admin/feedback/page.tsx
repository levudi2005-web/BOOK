'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldIcon } from '@/components/icons';
import {
  adminFeedback,
  adminUpdateFeedback,
  getAdminToken,
  isAuthError,
  type UserFeedback,
} from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  new: 'Mới',
  read: 'Đã đọc',
  resolved: 'Đã xử lý',
};

const KIND_LABEL: Record<string, string> = {
  feedback: 'Góp ý',
  report: 'Báo cáo',
  idea: 'Ý tưởng',
};

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<UserFeedback[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await adminFeedback(status || undefined);
      setRows(result.data);
      setError('');
    } catch (loadError) {
      if (isAuthError(loadError)) setAuthRequired(true);
      else setError(loadError instanceof Error ? loadError.message : 'Không thể tải phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(row: UserFeedback, nextStatus: string, note?: string) {
    if (!row.feedback_id) return;
    setBusy(row.feedback_id);
    try {
      await adminUpdateFeedback(row.feedback_id, { status: nextStatus, adminNote: note });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (authRequired) {
    return (
      <EmptyState
        icon={<ShieldIcon className="h-6 w-6" />}
        title="Cần đăng nhập quản trị"
        description="Phiên quản trị đã hết hạn."
        action={<Link href="/admin/login" className="focus-ring inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">Đăng nhập</Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Phản hồi & báo cáo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tin nhắn một chiều từ người dùng. {rows.length} mục.</p>
        </div>
        <div className="w-44">
          <Select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="new">Mới</option>
            <option value="read">Đã đọc</option>
            <option value="resolved">Đã xử lý</option>
          </Select>
        </div>
      </div>
      {error ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {rows.length === 0 ? (
        <EmptyState icon={<ShieldIcon className="h-6 w-6" />} title="Chưa có phản hồi" description="Các góp ý mới sẽ xuất hiện tại đây." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <Card key={row.feedback_uuid} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{KIND_LABEL[row.kind] ?? row.kind}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{STATUS_LABEL[row.status] ?? row.status}</span>
                    <h2 className="text-sm font-semibold text-foreground">{row.subject}</h2>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    @{row.username ?? 'khách'} · {new Date(row.created_at).toLocaleString('vi-VN')} · {row.page_path ?? '/'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={busy === row.feedback_id} onClick={() => void update(row, 'read')}>Đã đọc</Button>
                  <Button size="sm" variant="outline" disabled={busy === row.feedback_id} onClick={() => void update(row, 'resolved')}>Đã xử lý</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === row.feedback_id}
                    onClick={() => {
                      const note = window.prompt('Ghi chú xử lý (nội bộ):', row.admin_note ?? '');
                      if (note !== null) void update(row, row.status, note);
                    }}
                  >
                    Ghi chú
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{row.message}</p>
              {row.admin_note ? <p className="mt-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs text-muted-foreground">Ghi chú: {row.admin_note}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
