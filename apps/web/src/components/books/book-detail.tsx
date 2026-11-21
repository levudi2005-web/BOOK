'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchBook,
  addComment,
  addReview,
  addToLibrary,
  listComments,
  listReviews,
  type BookDetail as BookDetailData,
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
  const [comments, setComments] = useState<{ comment_uuid: string; body: string; username: string; created_at: string }[]>([]);
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
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
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
    void loadSocial();
    return () => {
      active = false;
    };
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
            <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-primary p-8 text-center shadow-lift">
              <div>
                <p className="font-serif text-xl leading-snug text-white line-clamp-4">{book.title}</p>
                {book.subtitle ? <p className="mt-2 text-xs text-white/70 line-clamp-2">{book.subtitle}</p> : null}
              </div>
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
                Tác giả: {book.authors.map((author) => author.name).join(', ')}
              </p>
            ) : null}

            {book.categories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Badge key={category.category_id} variant="muted">{category.name}</Badge>
                ))}
              </div>
            ) : null}

            <Card className="mt-6 p-6">
              <h2 className="mb-3 font-serif text-xl text-foreground">Giới thiệu</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {book.description || 'Chưa có mô tả cho sách này.'}
              </p>
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
              {comments.slice(0, 10).map((c) => (
                <div key={c.comment_uuid} className="rounded-xl bg-surface/50 p-3 text-sm">
                  <p className="font-medium text-foreground">{c.username}</p>
                  <p className="mt-1 text-muted-foreground">{c.body}</p>
                </div>
              ))}
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
