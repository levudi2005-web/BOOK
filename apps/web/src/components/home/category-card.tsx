import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ChevronRightIcon } from '@/components/icons';
import { CategoryIcon } from '@/components/categories/category-icon';

const tones = ['#4CCFD0', '#8DE8E8', '#245B5C', '#6FDEDE', '#3B7C7D', '#A5F0F0'];

function toneFor(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return tones[hash % tones.length];
}

export type CategoryCardData = {
  name: string;
  slug: string;
  description: string | null;
  icon?: string | null;
  childrenCount?: number;
  href?: string;
};

export function CategoryCard({ category }: { category: CategoryCardData }) {
  const tone = toneFor(category.slug);
  return (
    <Link
      href={category.href ?? `/discover?category=${category.slug}`}
      className="focus-ring group block"
    >
      <Card className="flex h-full items-center gap-2.5 p-2.5 transition-colors group-hover:border-primary/50 group-hover:bg-surface/50">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: tone }}
        >
          <CategoryIcon icon={category.icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">{category.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {category.description ?? 'Chưa có mô tả.'}
          </span>
          {category.childrenCount !== undefined ? (
            <span className="mt-0.5 block text-[10px] font-medium text-primary">
              {category.childrenCount} thể loại
            </span>
          ) : null}
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Card>
    </Link>
  );
}
