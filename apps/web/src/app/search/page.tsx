import { Suspense } from 'react';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { Skeleton } from '@/components/ui/skeleton';

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
        </div>
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
            <SearchResults />
          </Suspense>
        </div>
      </div>
    </>
  );
}

