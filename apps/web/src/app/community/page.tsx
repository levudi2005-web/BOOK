import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { fetchAuthors, fetchBooks, fetchCategories, fetchPublishers } from '@/lib/api';
import { BookCard } from '@/components/books/book-card';
import { SectionQuickMenu } from '@/components/section-quick-menu';

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
  let categories: Array<{
    category_id: number;
    name: string;
    slug: string;
    children: Array<{ category_id: number; name: string; slug: string }>;
  }> = [];
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
    categories = categoryRes.groups;
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
        <section className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface/60 to-accent/10 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Góc cảm hứng</p>
              <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">Hôm nay bạn muốn đọc trong tâm thế nào?</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Chọn một “tâm trạng đọc” để mở đúng kệ sách. Cộng đồng càng sôi nổi khi mỗi người chia sẻ một cuốn hay.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: 'Thư giãn', href: '/discover?group=giai-tri-huu-cau' },
                  { label: 'Học hỏi', href: '/discover?group=kien-thuc-hoc-thuat' },
                  { label: 'Chữa lành', href: '/discover?group=suc-khoe-loi-song' },
                  { label: 'Phiêu lưu', href: '/discover?group=van-hoa-kham-pha' },
                  { label: 'Sự nghiệp', href: '/discover?group=phat-trien-ban-than-su-nghiep' },
                ].map((mood) => (
                  <Link key={mood.label} href={mood.href} className="rounded-full border border-primary/25 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary">
                    {mood.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card/90 p-4 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sách đang được chú ý</p>
              {books[0] ? (
                <>
                  <Link href={`/books/${books[0].slug}`} className="mt-2 block font-serif text-lg leading-snug text-foreground hover:text-primary">
                    {books[0].title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{books[0].author_name ?? 'Cộng đồng BOOKFORFREEDOM'}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {books[0].description || 'Một cuốn sách đang được cộng đồng quan tâm.'}
                  </p>
                  <Link href={`/reader/${books[0].slug}`} className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">
                    Đọc thử →
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Chưa có sách nổi bật.</p>
              )}
            </div>
          </div>
        </section>

        <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem_10rem_10rem]">
          <label className="text-sm text-muted-foreground">
            Tìm sách cộng đồng
            <input name="q" defaultValue={params.q ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground" />
          </label>
          <label className="text-sm text-muted-foreground">
            Thể loại
            <select name="category" defaultValue={params.category ?? ''} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground">
              <option value="">Tất cả</option>
              {categories.map((group) => (
                <optgroup key={group.slug} label={group.name}>
                  {group.children.map((category) => (
                    <option key={category.slug} value={category.slug}>{category.name}</option>
                  ))}
                </optgroup>
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
      <SectionQuickMenu active="/community" />
    </>
  );
}

