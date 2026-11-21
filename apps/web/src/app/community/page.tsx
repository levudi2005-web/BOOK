import { PageHeader } from '@/components/page-header';
import { fetchAuthors, fetchBooks, fetchCategories, fetchPublishers } from '@/lib/api';
import { BookCard } from '@/components/books/book-card';

export const metadata = {
  title: 'Cộng đồng',
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; author?: string; publisher?: string; sort?: 'newest' | 'popular' | 'rating' | 'title' }>;
}) {
  const params = await searchParams;
  let books: Awaited<ReturnType<typeof fetchBooks>>['data'] = [];
  let categories: Array<{ category_id: number; name: string; slug: string }> = [];
  let authors: Array<{ author_id: number; name: string; slug: string }> = [];
  let publishers: Array<{ publisher_id: number; name: string; slug: string }> = [];
  try {
    const [res, categoryRes, authorRes, publisherRes] = await Promise.all([
      fetchBooks({
        q: params.q,
        category: params.category,
        author: params.author,
        publisher: params.publisher,
        sort: params.sort,
        limit: 24,
      }),
      fetchCategories(),
      fetchAuthors(),
      fetchPublishers(),
    ]);
    books = res.data;
    categories = categoryRes.data;
    authors = authorRes.data;
    publishers = publisherRes.data;
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
        <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem_10rem_10rem]">
          <label className="text-sm text-muted-foreground">
            Tìm sách cộng đồng
            <input name="q" defaultValue={params.q ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground" />
          </label>
          <label className="text-sm text-muted-foreground">
            Thể loại
            <select name="category" defaultValue={params.category ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground">
              <option value="">Tất cả</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted-foreground">
            Tác giả
            <select name="author" defaultValue={params.author ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground">
              <option value="">Tất cả</option>
              {authors.map((author) => (
                <option key={author.slug} value={author.slug}>{author.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted-foreground">
            Nhà xuất bản
            <select name="publisher" defaultValue={params.publisher ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground">
              <option value="">Tất cả</option>
              {publishers.map((publisher) => (
                <option key={publisher.slug} value={publisher.slug}>{publisher.name}</option>
              ))}
            </select>
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

