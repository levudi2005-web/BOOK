import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type MetricCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint, className, ...props }: MetricCardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-card p-5 shadow-soft', className)}
      {...props}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
