import Link from 'next/link';
import { Hero } from '@/components/home/hero';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedBooks } from '@/components/home/featured-books';
import { HomeQuickMenu } from '@/components/home/home-quick-menu';
import { SectionHeading } from '@/components/ui/section-heading';
import { Card } from '@/components/ui/card';
import { BookIcon, BookOpenIcon, LibraryIcon, MoreHorizontalIcon, SparkleIcon } from '@/components/icons';

const quickActions = [
  {
    href: '/write',
    icon: SparkleIcon,
    title: 'Viết bản thảo mới',
    description: 'Tạo sách, chương và xuất bản.',
  },
  {
    href: '/storage',
    icon: LibraryIcon,
    title: 'Bộ nhớ cá nhân',
    description: 'Tải lên và quản lý tệp.',
  },
  {
    href: '/office/writer',
    icon: BookIcon,
    title: 'Office Writer',
    description: 'Soạn tài liệu có định dạng.',
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="container-site py-6 sm:py-8">
        <SectionHeading
          eyebrow="Dành cho bạn"
          title="Sách mới cập nhật"
          description="Những đầu sách vừa được chia sẻ trong thư viện."
          action={
            <Link
              href="/discover"
              className="focus-ring inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              Xem tất cả
              <MoreHorizontalIcon className="h-5 w-5" />
            </Link>
          }
        />
        <div className="mt-4">
          <FeaturedBooks />
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="container-site py-6 sm:py-8">
          <SectionHeading
            eyebrow="Thể loại"
            title="Khám phá theo chủ đề"
            description="Chọn nhanh một thể loại để lọc sách."
            action={
              <Link
                href="/categories"
                className="focus-ring inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
              >
                Tất cả danh mục
                <MoreHorizontalIcon className="h-5 w-5" />
              </Link>
            }
          />
          <div className="mt-4">
            <CategoryGrid />
          </div>
        </div>
      </section>

      <section className="container-site py-6 sm:py-8">
        <SectionHeading
          eyebrow="Bắt đầu"
          title="Công cụ của bạn"
          description="Những thao tác thường dùng, đặt gọn một chỗ."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="focus-ring group block">
              <Card className="flex h-full items-center gap-3 p-3 transition-colors group-hover:border-primary/50 group-hover:bg-surface/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <action.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{action.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{action.description}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-site pb-8">
        <Card className="flex flex-col items-start justify-between gap-3 bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/40 text-accent-foreground">
              <BookOpenIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Cộng đồng đọc sách</h2>
              <p className="text-[11px] text-muted-foreground">Bình luận, đánh giá và chia sẻ cảm nhận về sách.</p>
            </div>
          </div>
          <Link
            href="/community"
            className="focus-ring inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Ghé cộng đồng
          </Link>
        </Card>
      </section>

      <HomeQuickMenu />
    </>
  );
}
