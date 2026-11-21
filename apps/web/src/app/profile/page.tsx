'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { BookIcon, UserIcon } from '@/components/icons';
import { getMyProfile, isAuthError, updateMyProfile, type MyProfile } from '@/lib/api';

type Form = { displayName: string; bio: string; websiteUrl: string; isPublic: boolean };

const emptyForm: Form = { displayName: '', bio: '', websiteUrl: '', isPublic: true };

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((next: MyProfile) => {
    setProfile(next);
    setForm({
      displayName: next.profile.displayName,
      bio: next.profile.bio,
      websiteUrl: next.profile.websiteUrl,
      isPublic: next.profile.isPublic,
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const result = await getMyProfile();
      apply(result);
      setError('');
      setAuthRequired(false);
    } catch (loadError) {
      if (isAuthError(loadError)) {
        setAuthRequired(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải hồ sơ.');
      }
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        websiteUrl: form.websiteUrl.trim(),
        isPublic: form.isPublic,
      });
      apply(updated);
      toast('Đã lưu hồ sơ.', 'success');
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : 'Không thể lưu hồ sơ.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-40 rounded-2xl" />
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<UserIcon className="h-6 w-6" />}
          title="Đăng nhập để xem hồ sơ"
          description="Hồ sơ cá nhân, thống kê đọc sách và thông tin tài khoản chỉ hiển thị với chủ tài khoản."
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

  if (!profile) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<UserIcon className="h-6 w-6" />}
          title="Không thể tải hồ sơ"
          description={error || 'Vui lòng thử lại sau.'}
          action={<Button onClick={() => { setLoading(true); void load(); }}>Thử lại</Button>}
        />
      </div>
    );
  }

  const stats = [
    { label: 'Sách trong thư viện', value: profile.stats.library },
    { label: 'Đang đọc', value: profile.stats.reading },
    { label: 'Sách đã tạo', value: profile.stats.books },
    { label: 'Bình luận', value: profile.stats.comments },
  ];

  return (
    <div className="container-site py-10">
      <Card className="p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-serif text-primary">
            {(profile.profile.displayName || profile.username).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-2xl text-foreground">
              {profile.profile.displayName || profile.username}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.email} · Tham gia {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
              {profile.lastLoginAt
                ? ` · Đăng nhập gần nhất ${new Date(profile.lastLoginAt).toLocaleString('vi-VN')}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/write"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <BookIcon className="h-4 w-4" /> Author Studio
            </Link>
            <Link
              href="/library"
              className="focus-ring inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground"
            >
              Thư viện
            </Link>
          </div>
        </div>


        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-surface/50 p-4 text-center">
              <p className="font-serif text-2xl text-foreground">{stat.value.toLocaleString('vi-VN')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-serif text-xl text-foreground">Chỉnh sửa hồ sơ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tên đăng nhập và email do hệ thống quản lý; các trường dưới đây bạn có thể tự cập nhật.
        </p>
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="profile-display-name">Tên hiển thị</Label>
            <Input
              id="profile-display-name"
              value={form.displayName}
              maxLength={100}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="profile-bio">Giới thiệu</Label>
            <Textarea
              id="profile-bio"
              value={form.bio}
              maxLength={2000}
              className="min-h-28"
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="profile-website">Website</Label>
            <Input
              id="profile-website"
              value={form.websiteUrl}
              placeholder="https://"
              maxLength={512}
              onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            Hiển thị hồ sơ công khai
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

