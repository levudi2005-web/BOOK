import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'accent' | 'outline' | 'muted';

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-accent-foreground',
  outline: 'border border-border text-muted-foreground',
  muted: 'bg-surface text-muted-foreground',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
