import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BookOpenIcon } from '@/components/icons';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('focus-ring group inline-flex items-center gap-2 rounded-lg', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
        <BookOpenIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-normal">
        <span className="block text-[13px] font-bold tracking-tight text-foreground sm:text-sm">
          BOOKFOR<span className="text-primary">FREEDOM</span>
        </span>
        <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
          Digital Library
        </span>
      </span>
    </Link>
  );
}
