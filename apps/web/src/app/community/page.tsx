import { PageHeader } from '@/components/page-header';
import { fetchBooks } from '@/lib/api';
import { BookCard } from '@/components/books/book-card';

export const metadata = {
  title: 'Cộng đồng',
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; author?: string; sort?: 'newest' | 'popular' | 'rating' | 'title' }>;
}) {
  const params = await searchParams;
  let books: Awaited<ReturnType<typeof fetchBooks>>['data'] = [];
  try {
    const res = await fetchBooks({
      q: params.q,
      category: params.category,
      author: params.author,
      sort: params.sort,
      limit: 24,
    });
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
        <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
          <label className="text-sm text-muted-foreground">
            Tìm sách cộng đồng
            <input name="q" defaultValue={params.q ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground" />
          </label>
          <label className="text-sm text-muted-foreground">
            Sắp xếp
            <select name="sort" defaultValue={params.sort ?? 'newest'} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground">
              <option value="newest">Mới xuất bản</option>
              <option value="popular">Đọc nhiều</option>
              <option value="rating">Đánh giá cao</option>
              <option value="title">Tên A–Z</option>
            </select>
          </label>
          <button type="submit" className="mt-auto h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Tìm kiếm</button>
        </form>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có sách công khai để thảo luận.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

