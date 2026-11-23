'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchCategories, type CategoryGroup } from '@/lib/api';
import { BookIcon, ChevronDownIcon, SearchIcon } from '@/components/icons';
import { CategoryIcon } from '@/components/categories/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Trang /categories: 8 nhóm có thể mở/thu gọn, mỗi nhóm chỉ mở danh sách
 * thể loại con khi người dùng cần — không đổ 64 thể loại thành một cột dài.
 */
export function CategoryExplorer() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((response) => {
        if (active) setGroups(response.groups);
      })
      .catch(() => {
        if (active) setError('Không thể tải danh mục.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        children: group.children.filter(
          (child) =>
            child.name.toLowerCase().includes(normalizedQuery) ||
            (child.description ?? '').toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter(
        (group) =>
          group.name.toLowerCase().includes(normalizedQuery) || group.children.length > 0,
      );
  }, [groups, normalizedQuery]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Lỗi tải danh mục" description={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm trong 64 thể loại..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm leading-normal text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="h-6 w-6" />}
          title="Không tìm thấy thể loại"
          description="Thử từ khoá khác hoặc xoá nội dung tìm kiếm."
        />
      ) : (
        <div className="space-y-2.5">
          {visibleGroups.map((group) => (
            <details
              key={group.slug}
              open={Boolean(normalizedQuery) || groups.indexOf(group) === 0}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CategoryIcon icon={group.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{group.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {group.children.length} thể loại · {group.description}
                  </span>
                </span>
                <Link
                  href={`/discover?group=${group.slug}`}
                  onClick={(event) => event.stopPropagation()}
                  className="hidden shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium leading-normal text-foreground transition-colors hover:border-primary/50 sm:block"
                >
                  Xem sách
                </Link>
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-1.5 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.children.map((category) => (
                  <Link
                    key={category.category_id}
                    href={`/discover?categories=${category.slug}`}
                    className="rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/40"
                  >
                    <span className="block text-xs font-semibold text-foreground">{category.name}</span>
                    {category.description ? (
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {category.description}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
