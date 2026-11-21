import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BookOpenIcon } from '@/components/icons';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('focus-ring group inline-flex items-center gap-2.5 rounded-full', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform duration-300 group-hover:-rotate-6">
        <BookOpenIcon className="h-5 w-5" />
      </span>
      <span className="leading-none">
        <span className="block font-serif text-base font-semibold tracking-tight text-foreground sm:text-lg">
          BOOKFOR<span className="text-accent">FREEDOM</span>
        </span>
        <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
          Digital Library
        </span>
      </span>
    </Link>
  );
}
