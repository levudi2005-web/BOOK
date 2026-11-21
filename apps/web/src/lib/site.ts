export const siteConfig = {
  name: 'BOOKFORFREEDOM',
  tagline: 'Thư viện số cho những tâm hồn tự do.',
  description:
    'Nền tảng thư viện số cao cấp: viết, đọc, khám phá và chia sẻ sách trong một không gian yên tĩnh, có chiều sâu.',
  // Không hardcode domain production. Được inject qua env tại build time.
  url: process.env.NEXT_PUBLIC_APP_URL ?? '',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api',
} as const;

export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav: NavItem[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Khám phá', href: '/discover' },
  { label: 'Danh mục', href: '/categories' },
  { label: 'Thư viện', href: '/library' },
  { label: 'Cộng đồng', href: '/community' },
];

export type Category = {
  name: string;
  slug: string;
  description: string;
  /** CSS accent used only for the decorative cover tile. */
  tone: string;
};

export const categories: Category[] = [
  { name: 'Văn học', slug: 'van-hoc', description: 'Tiểu thuyết, truyện ngắn và thơ ca.', tone: '#173F35' },
  { name: 'Khoa học', slug: 'khoa-hoc', description: 'Khám phá tri thức và tự nhiên.', tone: '#315C4C' },
  { name: 'Lịch sử', slug: 'lich-su', description: 'Những trang sử và bài học thời đại.', tone: '#6B4F2A' },
  { name: 'Triết học', slug: 'triet-hoc', description: 'Tư tưởng và suy tưởng sâu sắc.', tone: '#4A3B52' },
  { name: 'Nghệ thuật', slug: 'nghe-thuat', description: 'Hội họa, nhiếp ảnh và sáng tạo.', tone: '#7A4A3A' },
  { name: 'Kinh tế', slug: 'kinh-te', description: 'Kinh doanh, tài chính và chiến lược.', tone: '#3F4A32' },
  { name: 'Tâm lý', slug: 'tam-ly', description: 'Hiểu con người và đời sống nội tâm.', tone: '#3A4A5C' },
  { name: 'Kỹ năng sống', slug: 'ky-nang-song', description: 'Phát triển bản thân mỗi ngày.', tone: '#5C523A' },
  { name: 'Giáo dục', slug: 'giao-duc', description: 'Học tập và phương pháp giảng dạy.', tone: '#2F5C54' },
  { name: 'Thiếu nhi', slug: 'thieu-nhi', description: 'Câu chuyện nuôi dưỡng trí tưởng tượng.', tone: '#7A5A8A' },
];
