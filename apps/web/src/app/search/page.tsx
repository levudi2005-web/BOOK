import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchIcon } from '@/components/icons';

export const metadata = {
  title: 'Tìm kiếm',
};

export default function SearchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tìm kiếm"
        title="Tìm trong thư viện"
        description="Tìm sách, tác giả và danh mục bằng từ khóa."
      />
      <div className="container-site py-8">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-full bg-surface" />}>
            <SearchBar />
          </Suspense>
          <div className="mt-8">
            <EmptyState
              icon={<SearchIcon className="h-6 w-6" />}
              title="Nhập từ khóa để bắt đầu"
              description="Kết quả tìm kiếm, gợi ý và lịch sử sẽ hiển thị tại đây khi thư viện có dữ liệu."
            />
          </div>
        </div>
      </div>
    </>
  );
}
