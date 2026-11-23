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
    <footer className="mt-8 border-t border-border bg-surface/40">
      <div className="container-site flex flex-col gap-1.5 py-2.5 text-[10px] text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="flex min-w-0 shrink-0 items-center">
          <Logo />
        </div>

        <nav aria-label="Liên kết chân trang" className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring text-[10px] text-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <span className="h-2.5 w-px bg-border" aria-hidden="true" />
          {footerLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="focus-ring text-[10px] text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 flex-wrap items-center gap-x-1 text-[9px] lg:whitespace-nowrap">
          <span>© {new Date().getFullYear()} {siteConfig.name}</span>
          <span aria-hidden="true">·</span>
          <span>v{siteConfig.version.replace(/^v/, '')}</span>
          <span aria-hidden="true">·</span>
          <span>Đang phát triển</span>
        </div>
      </div>
    </footer>
  );
}
