'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { BookIcon, BookOpenIcon } from '@/components/icons';
import {
  createBook,
  deleteStudioBook,
  isAuthError,
  listMyBooks,
  publishBook,
  type StudioBook,
} from '@/lib/api';
import { BookCover } from '@/components/books/book-cover';
import { statusLabel, validateMetadata, visibilityLabel } from '@/lib/studio-validation';

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

const emptyForm = { title: '', subtitle: '', description: '', language: 'vi' };

function MyBookCover({ book }: { book: StudioBook }) {
  // Chỉ sách đã xuất bản Community mới có bìa công khai; draft sách riêng tư
  // được stream qua route chủ sở hữu `/studio/books/:uuid/cover`.
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
      className="mx-auto w-full max-w-44 rounded-xl"
    />
  );
}

export default function WritePage() {
  const { toast } = useToast();
  const [books, setBooks] = useState<StudioBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [busyUuid, setBusyUuid] = useState('');
  const [confirmDeleteUuid, setConfirmDeleteUuid] = useState('');
  const [publishBookUuid, setPublishBookUuid] = useState('');
  const [publishForm, setPublishForm] = useState({
    scope: 'private' as 'private' | 'community',
    authorName: '',
    publisherName: '',
    publicationYear: String(new Date().getFullYear()),
  });

  const refresh = useCallback(async () => {
    try {
      const response = await listMyBooks();
      setBooks(response.data);
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
    void refresh();
  }, [refresh]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateMetadata(form);
    if (validationError) {
      toast(validationError, 'error');
      return;
    }
    setCreating(true);
    try {
      await createBook({
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description,
        language: form.language,
      });
      setForm(emptyForm);
      await refresh();
      toast('Đã tạo bản thảo mới.', 'success');
    } catch (createError) {
      toast(createError instanceof Error ? createError.message : 'Không thể tạo sách.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function onPublish(book: StudioBook) {
    setPublishBookUuid(book.bookUuid);
    setPublishForm({
      scope: book.publicationScope === 'community' ? 'community' : 'private',
      authorName: book.authorName ?? '',
      publisherName: book.publisherName ?? '',
      publicationYear: String(book.publicationYear ?? new Date().getFullYear()),
    });
  }

  async function submitPublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishBookUuid) return;
    const year = Number(publishForm.publicationYear);
    if (!publishForm.authorName.trim()) {
      toast('Tên tác giả là bắt buộc.', 'error');
      return;
    }
    if (!Number.isInteger(year) || year < 1000 || year > 2200) {
      toast('Năm xuất bản không hợp lệ.', 'error');
      return;
    }
    setBusyUuid(publishBookUuid);
    try {
      await publishBook(publishBookUuid, {
        scope: publishForm.scope,
        authorName: publishForm.authorName,
        publisherName: publishForm.publisherName,
        publicationYear: year,
      });
      await refresh();
      setPublishBookUuid('');
      toast(publishForm.scope === 'community' ? 'Sách đã được xuất bản lên Community.' : 'Sách đã được xuất bản riêng tư.', 'success');
    } catch (publishError) {
      toast(publishError instanceof Error ? publishError.message : 'Không thể xuất bản sách.', 'error');
    } finally {
      setBusyUuid('');
    }
  }

  async function onDelete(book: StudioBook) {
    if (confirmDeleteUuid !== book.bookUuid) {
      setConfirmDeleteUuid(book.bookUuid);
      return;
    }
    setBusyUuid(book.bookUuid);
    try {
      await deleteStudioBook(book.bookUuid);
      setConfirmDeleteUuid('');
      await refresh();
      toast('Đã xóa sách khỏi Author Studio.', 'success');
    } catch (deleteError) {
      toast(deleteError instanceof Error ? deleteError.message : 'Không thể xóa sách.', 'error');
    } finally {
      setBusyUuid('');
    }
  }

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-80" />
        <Skeleton className="mt-8 h-64 rounded-2xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<BookIcon className="h-6 w-6" />}
          title="Đăng nhập để bắt đầu viết"
          description="Author Studio cần phiên đăng nhập hợp lệ để tạo và quản lý sách của bạn."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/auth/login"
                className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="focus-ring inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground"
              >
                Tạo tài khoản
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-site py-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">Author Studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tạo bản thảo, viết chương và xuất bản sách của bạn lên thư viện.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}{' '}
          <button
            type="button"
            onClick={() => { setLoading(true); void refresh(); }}
            className="font-medium underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}


      <Card className="p-6">
        <h2 className="font-serif text-xl text-foreground">Tạo sách mới</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sách mới luôn được lưu ở dạng bản nháp riêng tư cho đến khi bạn xuất bản.
        </p>
        <form onSubmit={onCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-title">Tiêu đề</Label>
              <Input
                id="new-title"
                value={form.title}
                maxLength={500}
                required
                placeholder="Tên sách"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-subtitle">Phụ đề</Label>
              <Input
                id="new-subtitle"
                value={form.subtitle}
                maxLength={500}
                placeholder="Không bắt buộc"
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
              />
            </div>
          </div>
          <div className="max-w-xs">
            <Label htmlFor="new-language">Ngôn ngữ</Label>
            <Select
              id="new-language"
              value={form.language}
              onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
            >
              {LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="new-description">Mô tả</Label>
            <Textarea
              id="new-description"
              value={form.description}
              className="min-h-28"
              placeholder="Giới thiệu ngắn về nội dung sách"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <Button type="submit" disabled={creating || !form.title.trim()}>
            {creating ? 'Đang tạo…' : 'Tạo bản thảo'}
          </Button>
        </form>
      </Card>


      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-foreground">Sách của tôi</h2>
          <span className="text-xs text-muted-foreground">{books.length} sách</span>
        </div>

        {books.length === 0 ? (
          <EmptyState
            icon={<BookOpenIcon className="h-6 w-6" />}
            title="Chưa có bản thảo nào"
            description="Tạo sách đầu tiên bằng biểu mẫu bên trên, sau đó thêm chương và xuất bản."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Card key={book.bookUuid} className="flex h-full flex-col p-5">
                <MyBookCover book={book} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={book.status === 'published' ? 'default' : 'muted'}>
                    {statusLabel(book.status)}
                  </Badge>
                  <Badge variant="outline">{visibilityLabel(book.visibility)}</Badge>
                </div>
                <h3 className="mt-3 line-clamp-2 font-serif text-lg text-foreground">{book.title}</h3>
                {book.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{book.subtitle}</p>
                ) : null}
                <p className="mt-2 truncate text-xs text-muted-foreground">/books/{book.slug}</p>
                {book.publishedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Xuất bản {new Date(book.publishedAt).toLocaleDateString('vi-VN')}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Link
                    href={`/write/${book.bookUuid}`}
                    className="focus-ring inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Mở
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyUuid === book.bookUuid}
                    onClick={() => void onPublish(book)}
                  >
                    {book.status === 'published' ? 'Xuất bản lại' : 'Xuất bản'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyUuid === book.bookUuid}
                    onClick={() => void onDelete(book)}
                  >
                    {confirmDeleteUuid === book.bookUuid ? 'Xác nhận xóa' : 'Xóa'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {publishBookUuid ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPublishBookUuid('');
        }}>
          <form
            onSubmit={submitPublish}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lift"
          >
            <h2 id="publish-title" className="font-serif text-2xl text-foreground">Thông tin xuất bản</h2>
            <p className="mt-1 text-sm text-muted-foreground">Chọn phạm vi xuất bản rõ ràng trước khi công khai.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-4 ${publishForm.scope === 'private' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="publish-scope" checked={publishForm.scope === 'private'} onChange={() => setPublishForm((current) => ({ ...current, scope: 'private' }))} />
                <span className="ml-2 font-semibold text-foreground">Cá nhân tôi</span>
                <span className="mt-2 block text-xs text-muted-foreground">Chỉ trong tài khoản và thư viện cá nhân. Không vào Community.</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-4 ${publishForm.scope === 'community' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="publish-scope" checked={publishForm.scope === 'community'} onChange={() => setPublishForm((current) => ({ ...current, scope: 'community' }))} />
                <span className="ml-2 font-semibold text-foreground">Community</span>
                <span className="mt-2 block text-xs text-muted-foreground">Công khai trong catalog và Community.</span>
              </label>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="publish-author">Tên tác giả *</Label>
                <Input id="publish-author" required value={publishForm.authorName} maxLength={255} onChange={(event) => setPublishForm((current) => ({ ...current, authorName: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="publish-year">Năm xuất bản *</Label>
                  <Input id="publish-year" required type="number" min="1000" max="2200" value={publishForm.publicationYear} onChange={(event) => setPublishForm((current) => ({ ...current, publicationYear: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="publish-publisher">Nhà xuất bản</Label>
                  <Input id="publish-publisher" value={publishForm.publisherName} maxLength={255} placeholder="Không bắt buộc" onChange={(event) => setPublishForm((current) => ({ ...current, publisherName: event.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPublishBookUuid('')}>Hủy</Button>
              <Button type="submit" disabled={busyUuid === publishBookUuid}>
                {busyUuid === publishBookUuid ? 'Đang xuất bản…' : 'Xác nhận xuất bản'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

