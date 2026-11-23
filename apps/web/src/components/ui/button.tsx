import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft',
  accent:
    'bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-surface',
  ghost: 'bg-transparent text-foreground hover:bg-surface',
  danger: 'bg-danger text-danger-foreground hover:bg-danger/90 shadow-soft',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-full font-medium leading-normal transition-all duration-200',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
