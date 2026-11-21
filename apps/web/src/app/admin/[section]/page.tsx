import { AdminSection } from '@/components/admin/admin-section';

export const metadata = { title: 'Quản trị' };

const sectionMeta: Record<string, { title: string; description: string }> = {
  users: {
    title: 'Quản lý người dùng',
    description: 'Tìm kiếm, khóa/mở khóa, xem hồ sơ và ghi chú nội bộ cho người dùng.',
  },
  books: {
    title: 'Quản lý sách',
    description: 'Quản lý sách, tác giả, danh mục, nhà xuất bản, file và quyền sử dụng.',
  },
  moderation: {
    title: 'Kiểm duyệt',
    description: 'Xử lý báo cáo, kiểm duyệt bình luận và sách, phê duyệt nội dung.',
  },
  roles: {
    title: 'Admin & phân quyền',
    description: 'Quản lý tài khoản admin, vai trò, permission và hoạt động quản trị.',
  },
  security: {
    title: 'Bảo mật & nhật ký',
    description: 'Audit logs, security events, login attempts và hoạt động đáng ngờ.',
  },
  settings: {
    title: 'Cấu hình hệ thống',
    description: 'Cấu hình website, thông báo, tính năng, bảo trì và giao diện.',
  },
};

type Props = {
  params: Promise<{ section: string }>;
};

export default async function AdminSectionPage({ params }: Props) {
  const { section } = await params;
  const meta = sectionMeta[section] ?? {
    title: 'Khu vực quản trị',
    description: 'Khu vực này chưa được định nghĩa.',
  };

  return <AdminSection title={meta.title} description={meta.description} />;
}
