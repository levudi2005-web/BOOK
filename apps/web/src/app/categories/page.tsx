import { PageHeader } from '@/components/page-header';
import { CategoryGrid } from '@/components/home/category-grid';

export const metadata = {
  title: 'Danh mục',
};

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Danh mục"
        title="Khám phá theo chủ đề"
        description="Mỗi danh mục là một cánh cửa dẫn vào một thế giới tri thức riêng."
      />
      <div className="container-site py-8">
        <CategoryGrid />
      </div>
    </>
  );
}
