import { PageHeader } from '@/components/page-header';
import { CategoryExplorer } from '@/components/categories/category-explorer';

export const metadata = {
  title: 'Danh mục',
};

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Danh mục"
        title="Khám phá theo chủ đề"
        description="8 nhóm lớn, 64 thể loại — mở từng nhóm để tìm đúng cuốn sách bạn cần."
      />
      <div className="container-site py-8">
        <CategoryExplorer />
      </div>
    </>
  );
}
