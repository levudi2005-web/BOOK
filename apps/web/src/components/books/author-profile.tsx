'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchAuthors, fetchBooks, type ApiAuthor, type ApiBook } from '@/lib/api';
import { BookCard, BookCardSkeleton } from '@/components/books/book-card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { BookIcon } from '@/components/icons';

export function AuthorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [author, setAuthor] = useState<ApiAuthor | null>(null);
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [booksError, setBooksError] = useState('');

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    setProfileError('');
    setAuthor(null);
    setPage(1);
    fetchAuthors()
      .then((response) => {
        if (!active) return;
        const found = response.data.find((item) => item.slug === slug);
        setAuthor(found ?? null);
        setProfileError(found ? '' : 'Không tìm thấy hồ sơ tác giả này.');
      })
      .catch(() => {
        if (active) setProfileError('Không thể tải hồ sơ tác giả. Vui lòng thử lại sau.');
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    let active = true;
    setBooksLoading(true);
    setBooksError('');
    fetchBooks({ author: slug, page, limit: 12, sort: 'popular' })
      .then((response) => {
        if (!active) return;
        setBooks(response.data);
        setTotalPages(response.meta.totalPages);
        setTotalBooks(response.meta.total);
        setBooksError('');
      })
      .catch(() => {
        if (active) setBooksError('Không thể tải sách của tác giả. Vui lòng thử lại sau.');
      })
      .finally(() => {
        if (active) setBooksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, page]);

  if (!profileLoading && profileError) {
    return (
      <>
        <PageHeader eyebrow="Tác giả" title="Không tìm thấy tác giả" />
        <div className="container-site py-8">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Hồ sơ chưa khả dụng"
            description={profileError}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Tác giả"
        title={profileLoading ? 'Đang tải hồ sơ…' : author?.name ?? 'Tác giả'}
        description={author?.bio || undefined}
      />
      <section className="container-site py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-foreground">Sách của tác giả</h2>
          {!booksLoading && !booksError ? (
            <span className="text-sm text-muted-foreground">{totalBooks} sách</span>
          ) : null}
        </div>
        {booksError ? (
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Lỗi tải sách"
            description={booksError}
          />
        ) : booksLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <BookCardSkeleton key={index} />)}
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Chưa có sách công khai"
            description="Tác giả này hiện chưa có sách nào được xuất bản công khai."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => <BookCard key={book.book_uuid} book={book} />)}
          </div>
        )}
        {!booksLoading && !booksError && totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Sau
            </Button>
          </div>
        ) : null}
      </section>
    </>
  );
}
