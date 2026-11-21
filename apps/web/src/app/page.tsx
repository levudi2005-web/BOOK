import Link from 'next/link';
import { Hero } from '@/components/home/hero';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedBooks } from '@/components/home/featured-books';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import {
  BookOpenIcon,
  LibraryIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons';

const capabilities = [
  {
    icon: BookOpenIcon,
    title: 'Viết & sáng tạo',
    description:
      'Không gian viết có cấu trúc, dàn trang và thiết kế bìa cho tác phẩm của bạn.',
  },
  {
    icon: LibraryIcon,
    title: 'Đọc & lưu trữ',
    description:
      'Thư viện cá nhân với tiến độ đọc, bookmark và danh sách lưu trữ riêng tư.',
  },
  {
    icon: SparkleIcon,
    title: 'Xuất bản & chia sẻ',
    description:
      'Chuẩn bị bản thảo để xuất bản và chia sẻ trong cộng đồng đọc sách.',
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Featured books */}
      <section className="container-site py-16">
        <SectionHeading
          eyebrow="Tuyển chọn"
          title="Sách nổi bật"
          description="Những đầu sách được tuyển chọn và giới thiệu trong thư viện."
          action={
            <Link
              href="/discover"
              className="focus-ring text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          }
        />
        <div className="mt-8">
          <FeaturedBooks />
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-surface/50">
        <div className="container-site py-16">
          <SectionHeading
            eyebrow="Danh mục"
            title="Khám phá theo chủ đề"
            description="Từ văn học đến khoa học, tìm thấy dòng sách phù hợp với bạn."
            action={
              <Link
                href="/categories"
                className="focus-ring text-sm font-medium text-primary hover:underline"
              >
                Tất cả danh mục →
              </Link>
            }
          />
          <div className="mt-8">
            <CategoryGrid />
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="container-site py-16">
        <SectionHeading
          eyebrow="Trải nghiệm"
          title="Được thiết kế cho việc đọc"
          description="Một hệ sinh thái liền mạch cho người viết và người đọc."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {capabilities.map((item) => (
            <Card key={item.title} className="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="border-t border-border bg-surface/50">
        <div className="container-site py-16">
          <SectionHeading
            eyebrow="Cộng đồng"
            title="Đọc cùng nhau"
            description="Chia sẻ cảm nhận, đánh giá sách và kết nối với những độc giả cùng sở thích."
          />
          <div className="mt-8">
            <EmptyState
              icon={<UserIcon className="h-6 w-6" />}
              title="Cộng đồng đang được xây dựng"
              description="Hoạt động, bình luận và đánh giá sẽ hiển thị tại đây khi tính năng cộng đồng sẵn sàng."
              action={
                <Link
                  href="/community"
                  className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Ghé thăm cộng đồng
                </Link>
              }
            />
          </div>
        </div>
      </section>
    </>
  );
}
