'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import { createBook, listMyBooks, publishBook, type StudioBook } from '@/lib/api';

export default function WritePage() {
  const { toast } = useToast();
  const [books, setBooks] = useState<StudioBook[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const res = await listMyBooks();
      setBooks(res.data);
    } catch {
      toast('Không thể tải danh sách sách.', 'default');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await createBook({ title: title.trim(), language: 'vi' });
      setTitle('');
      toast('Đã tạo bản thảo mới.', 'default');
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể tạo sách.', 'default');
    } finally {
      setLoading(false);
    }
  }

  async function onPublish(bookUuid: string) {
    try {
      await publishBook(bookUuid);
      toast('Đã xuất bản sách.', 'default');
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xuất bản.', 'default');
    }
  }

  return (
    <div className="container-site py-10">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-foreground">Author Studio</h1>
        <p className="text-sm text-muted-foreground">Viết, quản lý chương và xuất bản sách của bạn.</p>
      </div>

      <form onSubmit={onCreate} className="mb-8 flex gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bản thảo mới"
          className="max-w-md"
        />
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Đang tạo…' : 'Tạo bản thảo'}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bạn chưa có bản thảo nào.</p>
        ) : null}
        {books.map((book) => (
          <Card key={book.bookUuid} className="p-5">
            <h2 className="font-serif text-lg text-foreground">{book.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Trạng thái: {book.status} · {book.visibility}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" disabled={book.status === 'published'} onClick={() => onPublish(book.bookUuid)}>
                {book.status === 'published' ? 'Đã xuất bản' : 'Xuất bản'}
              </Button>
              <Link href={`/write/${book.bookUuid}`} className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                Mở
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
