import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { DiscoverExplorer } from '@/components/discover/discover-explorer';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Khám phá sách',
};

export default function DiscoverPage() {
  return (
    <>
      <PageHeader
        eyebrow="Khám phá"
        title="Tìm cuốn sách tiếp theo của bạn"
        description="Duyệt theo danh mục, tác giả, nhà xuất bản và đánh giá — với trải nghiệm lọc mượt trên mọi thiết bị."
      />
      <div className="container-site py-8">
        <Suspense
          fallback={
            <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
              <Skeleton className="h-80 rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-72 rounded-2xl" />
              </div>
            </div>
          }
        >
          <DiscoverExplorer />
        </Suspense>
      </div>
    </>
  );
}
