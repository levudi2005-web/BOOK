'use client';

import { useEffect, useState } from 'react';
import { fetchBooks, type ApiBook } from '@/lib/api';
import { BookCard, BookCardSkeleton } from '@/components/books/book-card';
import { EmptyState } from '@/components/ui/empty-state';
import { BookIcon } from '@/components/icons';

export function FeaturedBooks() {
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchBooks({ sort: 'newest', limit: 8 })
      .then((response) => {
        if (active) setBooks(response.data);
      })
      .catch(() => {
        if (active) setError('Không thể tải sách nổi bật.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <BookCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Không thể tải sách nổi bật" description={error} />
    );
  }

  if (books.length === 0) {
    return (
      <EmptyState
        icon={<BookIcon className="h-6 w-6" />}
        title="Chưa có sách nổi bật"
        description="Sách nổi bật sẽ xuất hiện tại đây khi có sách được xuất bản công khai."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {books.map((book) => (
        <BookCard key={book.book_uuid} book={book} />
      ))}
    </div>
  );
}
