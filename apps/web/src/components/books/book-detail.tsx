'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchBook,
  fetchBookChapters,
  addComment,
  addReview,
  addToLibrary,
  deleteComment,
  getAccessToken,
  getMyProfile,
  listComments,
  listReviews,
  publicCoverUrl,
  updateComment,
  type BookDetail as BookDetailData,
  type Chapter,
} from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import { BookIcon, StarIcon } from '@/components/icons';

export function BookDetail() {
  const { toast } = useToast();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [book, setBook] = useState<BookDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState(false);
  const [comments, setComments] = useState<{ comment_uuid: string; body: string; username: string; user_uuid: string; created_at: string }[]>([]);
  const [myUuid, setMyUuid] = useState('');
  const [editingUuid, setEditingUuid] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [deletingUuid, setDeletingUuid] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [reviews, setReviews] = useState<{ data: { review_uuid: string; rating: number; title: string | null; body: string | null; username: string }[]; meta: { average: number; count: number } } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [newRating, setNewRating] = useState(5);

  async function loadSocial() {
    try {
      const [c, r] = await Promise.all([listComments(slug), listReviews(slug)]);
      setComments(c.data);
      setReviews(r);
    } catch {
      // social data is best-effort on the public page
    }
    // Chỉ gọi /me khi có token: dùng để xác định quyền sửa/xoá bình luận.
    if (getAccessToken()) {
      try {
        const me = await getMyProfile();
        setMyUuid(me.userUuid);
      } catch {
        setMyUuid('');
      }
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchBook(slug)
      .then((data) => {
        if (active) setBook(data);
      })
      .catch(() => {
        if (active) setError('Không tìm thấy sách hoặc sách chưa được công khai.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    setChaptersLoading(true);
    setChaptersError(false);
    fetchBookChapters(slug)
      .then((response) => {
        if (active) setChapters(response.data);
      })
      .catch(() => {
        if (!active) return;
        setChapters([]);
        setChaptersError(true);
      })
      .finally(() => {
        if (active) setChaptersLoading(false);
      });
    void loadSocial();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onAddToLibrary() {
    try {
      await addToLibrary(slug);
      toast('Đã thêm vào thư viện.', 'default');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể thêm vào thư viện.', 'default');
    }
  }

  async function onSubmitComment() {
    if (!commentText.trim()) return;
    try {
      await addComment(slug, commentText.trim());
      setCommentText('');
      toast('Đã gửi bình luận.', 'default');
      await loadSocial();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể gửi bình luận.', 'default');
    }
  }

  async function onSaveEdit(commentUuid: string) {
    const text = editingBody.trim();
    if (!text) {
      toast('Bình luận không được để trống.', 'default');
      return;
    }
    setCommentBusy(true);
    try {
      await updateComment(commentUuid, text);
      setComments((current) =>
        current.map((comment) => (comment.comment_uuid === commentUuid ? { ...comment, body: text } : comment)),
      );
      setEditingUuid('');
      setEditingBody('');
      toast('Đã cập nhật bình luận.', 'default');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể cập nhật bình luận.', 'default');
    } finally {
      setCommentBusy(false);
    }
  }

  async function onDeleteComment(commentUuid: string) {
    if (!window.confirm('Xoá bình luận này? Hành động không thể hoàn tác.')) return;
    setDeletingUuid(commentUuid);
    try {
      await deleteComment(commentUuid);
      setComments((current) => current.filter((comment) => comment.comment_uuid !== commentUuid));
      toast('Đã xoá bình luận.', 'default');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xoá bình luận.', 'default');
    } finally {
      setDeletingUuid('');
    }
  }

  async function onSubmitReview() {
    try {
      await addReview(slug, { rating: newRating });
      toast('Đã gửi đánh giá.', 'default');
      await loadSocial();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể gửi đánh giá.', 'default');
    }
  }

  if (loading) {
    return (
      <div className="container-site py-8">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
          <Skeleton className="aspect-[3/4] rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <>
        <PageHeader
          eyebrow="Chi tiết sách"
          title="Không tìm thấy sách"
          description={`Không có dữ liệu công khai cho định danh “${slug}”.`}
        />
        <div className="container-site py-8">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Sách không tồn tại hoặc chưa công khai"
            description="Quay lại trang khám phá để tìm sách khác."
            action={
              <Link href="/discover" className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                Khám phá sách
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const rating = Number(book.average_rating ?? 0);

  return (
    <>
      <PageHeader eyebrow="Chi tiết sách" title={book.title} description={book.subtitle ?? undefined} />
      <div className="container-site py-8">
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <div className="mx-auto w-full max-w-[16rem]">
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-primary p-8 text-center shadow-lift">
              {book.cover_storage_key ? (
                <img
                  src={publicCoverUrl(book.slug)}
                  alt={`Bìa sách ${book.title}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div>
                  <p className="font-serif text-xl leading-snug text-white line-clamp-4">{book.title}</p>
                  {book.subtitle ? <p className="mt-2 text-xs text-white/70 line-clamp-2">{book.subtitle}</p> : null}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{book.language}</Badge>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <StarIcon className="h-4 w-4 text-accent" />
                {rating.toFixed(1)} · {book.rating_count} đánh giá
              </span>
            </div>

            {book.authors.length > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Tác giả:{' '}
                {book.authors.map((author, index) => (
                  <span key={author.author_uuid}>
                    {index > 0 ? ', ' : null}
                    <Link href={`/authors/${encodeURIComponent(author.slug)}`} className="text-primary hover:underline">
                      {author.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}

            {book.categories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Link key={category.category_id} href={`/discover?category=${encodeURIComponent(category.slug)}`}>
                    <Badge variant="muted">{category.name}</Badge>
                  </Link>
                ))}
              </div>
            ) : null}

            <Card className="mt-6 p-6">
              <h2 className="mb-3 font-serif text-xl text-foreground">Giới thiệu</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {book.description || 'Chưa có mô tả cho sách này.'}
              </p>
            </Card>

            <Card className="mt-6 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl text-foreground">Mục lục</h2>
                {!chaptersLoading && !chaptersError ? (
                  <span className="text-sm text-muted-foreground">{chapters.length} chương</span>
                ) : null}
              </div>
              {chaptersLoading ? (
                <Skeleton className="h-20 rounded-xl" />
              ) : chaptersError ? (
                <p role="status" className="text-sm text-destructive">Không thể tải mục lục. Vui lòng thử lại sau.</p>
              ) : chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sách chưa có chương công khai.</p>
              ) : (
                <ol className="max-h-80 space-y-1 overflow-y-auto">
                  {chapters.map((chapter) => (
                    <li key={chapter.chapter_uuid}>
                      <Link
                        href={`/reader/${book.slug}?chapter=${encodeURIComponent(chapter.chapter_uuid)}`}
                        className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface"
                      >
                        <span className="mr-2 text-muted-foreground">{chapter.chapter_number}.</span>
                        {chapter.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/reader/${book.slug}`} className="focus-ring inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                Đọc sách
              </Link>
              <Button variant="outline" onClick={onAddToLibrary}>Thêm vào thư viện</Button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 font-serif text-xl text-foreground">Đánh giá</h2>
            {reviews && reviews.meta.count > 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Trung bình {reviews.meta.average.toFixed(1)} · {reviews.meta.count} đánh giá
              </p>
            ) : null}
            <div className="space-y-3">
              {reviews?.data.slice(0, 5).map((r) => (
                <div key={r.review_uuid} className="rounded-xl bg-surface/50 p-3 text-sm">
                  <p className="font-medium text-foreground">{r.username} · {r.rating}★</p>
                  {r.body ? <p className="mt-1 text-muted-foreground">{r.body}</p> : null}
                </div>
              ))}
              {reviews && reviews.data.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có đánh giá.</p> : null}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((v) => <option key={v} value={v}>{v}★</option>)}
              </select>
              <Button variant="outline" onClick={onSubmitReview}>Gửi đánh giá</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-serif text-xl text-foreground">Bình luận</h2>
            <div className="space-y-3">
              {comments.slice(0, 10).map((c) => {
                const mine = Boolean(myUuid && c.user_uuid === myUuid);
                const isEditing = editingUuid === c.comment_uuid;
                return (
                  <div key={c.comment_uuid} className="rounded-xl bg-surface/50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{c.username}</p>
                      {mine ? (
                        <div className="flex shrink-0 gap-3 text-xs">
                          {isEditing ? null : (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => {
                                setEditingUuid(c.comment_uuid);
                                setEditingBody(c.body);
                              }}
                            >
                              Sửa
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-destructive hover:underline disabled:opacity-60"
                            disabled={commentBusy || deletingUuid === c.comment_uuid}
                            onClick={() => void onDeleteComment(c.comment_uuid)}
                          >
                            {deletingUuid === c.comment_uuid ? 'Đang xoá…' : 'Xoá'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editingBody}
                          maxLength={5000}
                          placeholder="Sửa bình luận…"
                          className="min-h-16 bg-card"
                          onChange={(event) => setEditingBody(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={commentBusy} onClick={() => void onSaveEdit(c.comment_uuid)}>
                            {commentBusy ? 'Đang lưu…' : 'Lưu'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={commentBusy}
                            onClick={() => {
                              setEditingUuid('');
                              setEditingBody('');
                            }}
                          >
                            Huỷ
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-line text-muted-foreground">{c.body}</p>
                    )}
                  </div>
                );
              })}
              {comments.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có bình luận.</p> : null}
            </div>
            <div className="mt-4 flex gap-2">
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Viết bình luận…" className="min-h-10" />
              <Button onClick={onSubmitComment}>Gửi</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
