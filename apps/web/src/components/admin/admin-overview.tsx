import { MetricCard } from '@/components/admin/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { BellIcon, ClockIcon } from '@/components/icons';

const metrics = [
  { label: 'Tổng người dùng', value: '0' },
  { label: 'Tổng sách', value: '0' },
  { label: 'Tổng lượt đọc', value: '0' },
  { label: 'Tổng lượt tải', value: '0' },
  { label: 'Sách chờ kiểm duyệt', value: '0' },
  { label: 'Báo cáo mới', value: '0' },
];

export function AdminOverview() {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Tổng quan</p>
        <h1 className="mt-2 font-serif text-3xl text-foreground">Bảng điều khiển</h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} hint="Chưa có dữ liệu" />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
            <ClockIcon className="h-5 w-5 text-primary" />
            Hoạt động gần đây
          </h2>
          <EmptyState
            icon={<BellIcon className="h-5 w-5" />}
            title="Chưa có hoạt động"
            description="Nhật ký hoạt động quản trị sẽ xuất hiện khi backend được kết nối."
          />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-serif text-lg text-foreground">Tăng trưởng</h2>
          <EmptyState
            icon={<BellIcon className="h-5 w-5" />}
            title="Chưa có dữ liệu biểu đồ"
            description="Biểu đồ tăng trưởng người dùng và lượt đọc sẽ hiển thị tại đây."
          />
        </Card>
      </div>
    </>
  );
}
