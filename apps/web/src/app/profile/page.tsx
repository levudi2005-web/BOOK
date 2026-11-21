import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { BookIcon, UserIcon } from '@/components/icons';

export const metadata = {
  title: 'Hồ sơ cá nhân',
};

const stats = [
  { label: 'Sách đã lưu', value: '0' },
  { label: 'Đang đọc', value: '0' },
  { label: 'Đã hoàn thành', value: '0' },
  { label: 'Người theo dõi', value: '0' },
];

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Hồ sơ" title="Trang cá nhân" />
      <div className="container-site py-8">
        <Card className="p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-serif text-primary">
              B
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-foreground">Độc giả</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Đăng nhập để đồng bộ thư viện, tiến độ đọc và hoạt động của bạn.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              <UserIcon className="h-4 w-4" />
              Đăng nhập
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface/50 p-4 text-center">
                <p className="font-serif text-2xl text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
              <BookIcon className="h-5 w-5 text-primary" />
              Sách yêu thích
            </h3>
            <p className="text-sm text-muted-foreground">
              Chưa có sách yêu thích nào. Khi đăng nhập, những cuốn sách bạn yêu thích sẽ xuất hiện tại đây.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 font-serif text-lg text-foreground">Hoạt động gần đây</h3>
            <p className="text-sm text-muted-foreground">
              Lịch sử đọc và hoạt động sẽ được ghi lại tại đây.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
