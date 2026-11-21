import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { fetchBooks } from '@/lib/api';

export const metadata = {
  title: 'Cộng đồng',
};

export default async function CommunityPage() {
  let books: { slug: string; title: string; subtitle: string | null }[] = [];
  try {
    const res = await fetchBooks({ limit: 24 });
    books = res.data;
  } catch {
    books = [];
  }

  return (
    <>
      <PageHeader
        eyebrow="Cộng đồng"
        title="Đọc cùng nhau"
        description="Bình luận và đánh giá sách cùng những độc giả khác."
      />
      <div className="container-site py-8">
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có sách công khai để thảo luận.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.slug}
                href={`/books/${book.slug}#reviews`}
                className="rounded-2xl border border-border bg-card p-5 transition hover:bg-surface"
              >
                <p className="line-clamp-2 font-serif text-lg text-foreground">{book.title}</p>
                {book.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{book.subtitle}</p> : null}
                <p className="mt-3 text-sm font-medium text-primary">Bình luận &amp; đánh giá →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

