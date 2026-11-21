import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldIcon } from '@/components/icons';

export function AdminSection({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader eyebrow="Quản trị" title={title} description={description} />
      <div className="mt-8">
        <EmptyState
          icon={<ShieldIcon className="h-6 w-6" />}
          title="Chưa có dữ liệu"
          description="Khu vực này sẽ hiển thị dữ liệu và thao tác quản trị khi backend tương ứng được triển khai."
        />
      </div>
    </>
  );
}
