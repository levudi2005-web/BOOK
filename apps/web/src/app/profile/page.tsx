'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { BookIcon, UserIcon } from '@/components/icons';
import {
  changePassword,
  getMyProfile,
  getStorageQuota,
  isAuthError,
  listMyBooks,
  logout,
  updateMyProfile,
  type MyProfile,
  type StorageQuota,
  type StudioBook,
} from '@/lib/api';
import { BookCover } from '@/components/books/book-cover';

type Form = { displayName: string; bio: string; websiteUrl: string; isPublic: boolean };

const emptyForm: Form = { displayName: '', bio: '', websiteUrl: '', isPublic: true };

function PersonalBookCover({ book }: { book: StudioBook }) {
  const isPublicBook = book.visibility === 'public' && book.status === 'published';
  return (
    <BookCover
      title={book.title}
      subtitle={book.subtitle}
      authorName={book.authorName}
      slug={book.slug}
      coverKey={book.coverStorageKey}
      ownerBookUuid={book.bookUuid}
      isPublic={isPublicBook}
      className="rounded-xl"
    />
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [books, setBooks] = useState<StudioBook[]>([]);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', recoveryKey: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

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
      const [result, quotaResult, booksResult] = await Promise.all([
        getMyProfile(),
        getStorageQuota(),
        listMyBooks(),
      ]);
      apply(result);
      setQuota(quotaResult);
      setBooks(booksResult.data);
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

  async function onChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast('Mật khẩu mới phải có ít nhất 8 ký tự.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('Xác nhận mật khẩu mới không khớp.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        recoveryKey: passwordForm.recoveryKey,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', recoveryKey: '', newPassword: '', confirmPassword: '' });
      toast('Đã đổi mật khẩu. Phiên đăng nhập hiện tại đã được thu hồi; vui lòng đăng nhập lại.', 'success');
      await logout();
    } catch (passwordError) {
      toast(passwordError instanceof Error ? passwordError.message : 'Không thể đổi mật khẩu.', 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  async function onSwitchAccount() {
    await logout();
    router.push('/auth/login');
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
            <Button type="button" variant="outline" onClick={() => void onSwitchAccount()}>
              Đăng xuất &amp; đổi tài khoản
            </Button>
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

      {quota ? (
        <Card className="mt-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-xl text-foreground">Dung lượng lưu trữ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {(quota.usedBytes / 1048576).toFixed(2)} MB đã dùng · {(quota.availableBytes / 1048576).toFixed(2)} MB còn lại
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              Tổng {(quota.quotaBytes / 1048576).toFixed(2)} MB
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, quota.usagePercent)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{quota.usagePercent}% đã sử dụng</p>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <h2 className="font-serif text-xl text-foreground">Sách của tôi</h2>
        {books.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Chưa có sách do tài khoản này sở hữu.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Card key={book.bookUuid} className="p-4">
                <PersonalBookCover book={book} />
                <h3 className="mt-3 line-clamp-2 font-serif text-lg text-foreground">{book.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {book.authorName || 'Chưa xác nhận tác giả'} · {book.publicationYear || 'Chưa có năm'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {book.status === 'published'
                    ? book.publicationScope === 'community' ? 'Community' : 'Cá nhân'
                    : 'Bản thảo'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/write/${book.bookUuid}`} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">
                    Tiếp tục viết
                  </Link>
                  <Link href={`/write/${book.bookUuid}`} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm text-foreground">
                    Quản lý
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-serif text-xl text-foreground">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cần mật khẩu hiện tại và Recovery Key. Sau khi đổi, mọi phiên đăng nhập sẽ bị thu hồi.
        </p>
        <form onSubmit={onChangePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
            <Input id="current-password" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
          </div>
          <div>
            <Label htmlFor="recovery-key">Recovery Key</Label>
            <Input id="recovery-key" type="password" value={passwordForm.recoveryKey} onChange={(event) => setPasswordForm((current) => ({ ...current, recoveryKey: event.target.value }))} />
          </div>
          <div>
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input id="new-password" type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
          </div>
          <div>
            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
            <Input id="confirm-password" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </form>
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

