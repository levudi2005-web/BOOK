import Link from 'next/link';
import { Logo } from '@/components/logo';
import { primaryNav, siteConfig } from '@/lib/site';

const footerLinks = [
  { label: 'Điều khoản', href: '#' },
  { label: 'Quyền riêng tư', href: '#' },
  { label: 'Bản quyền', href: '#' },
  { label: 'Liên hệ', href: '#' },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/60">
      <div className="container-site py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.tagline} Một không gian đọc yên tĩnh, có chiều sâu và bản sắc riêng.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Khám phá
            </p>
            <ul className="space-y-2.5">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="focus-ring text-sm text-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Thông tin
            </p>
            <ul className="space-y-2.5">
              {footerLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="focus-ring text-sm text-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Bảo lưu mọi quyền.</p>
          <p className="sm:text-right">
            Phiên bản đầu tiên {siteConfig.version} — Hoàn thiện Writing Studio &amp; Office Writer.
            Các phiên bản sửa đổi và nâng cấp sau sẽ được cập nhật trong tương lai.
          </p>
        </div>
      </div>
    </footer>
  );
}
