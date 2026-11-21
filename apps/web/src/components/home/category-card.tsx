import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ChevronRightIcon } from '@/components/icons';

const tones = ['#173F35', '#315C4C', '#6B4F2A', '#4A3B52', '#7A4A3A', '#3A4A5C', '#2F5C54', '#5C523A'];

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
};

export function CategoryCard({ category }: { category: CategoryCardData }) {
  const tone = toneFor(category.slug);
  return (
    <Link href={`/discover?category=${category.slug}`} className="focus-ring group block rounded-2xl">
      <Card className="h-full overflow-hidden p-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
        <div
          className="relative h-24 w-full overflow-hidden"
          style={{ background: `linear-gradient(120deg, ${tone}, ${tone}cc)` }}
        >
          <div className="absolute -right-4 -top-6 h-24 w-24 rounded-full opacity-30" style={{ backgroundColor: tone }} />
          <span className="absolute bottom-3 left-4 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
            Thể loại
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-foreground">{category.name}</h3>
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {category.description ?? 'Chưa có mô tả.'}
          </p>
        </div>
      </Card>
    </Link>
  );
}
