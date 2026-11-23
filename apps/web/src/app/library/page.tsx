import { PageHeader } from '@/components/page-header';
import { LibraryExplorer } from '@/components/library/library-explorer';
import { SectionQuickMenu } from '@/components/section-quick-menu';

export const metadata = {
  title: 'Thư viện của tôi',
};

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Thư viện cá nhân"
        title="Kệ sách của tôi"
        description="Sách đang đọc, đã hoàn thành, yêu thích và danh sách lưu trữ cá nhân."
      />
      <div className="container-site py-8">
        <LibraryExplorer />
      </div>
      <SectionQuickMenu active="/library" />
    </>
  );
}
