'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { CategoryIcon } from '@/components/categories/category-icon';

export type CategoryPickerItem = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
};

export type CategoryPickerGroup = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  children: CategoryPickerItem[];
};

type CategoryPickerProps = {
  groups: CategoryPickerGroup[];
  selected: string[];
  onChange: (values: string[]) => void;
  valueKey?: 'slug' | 'id';
  compact?: boolean;
  idPrefix?: string;
};

/**
 * Bộ chọn thể loại dùng chung cho Discover, Studio và trang sở thích.
 * 64 thể loại luôn được nhóm theo 8 nhóm lớn; nhóm có lựa chọn tự mở.
 */
export function CategoryPicker({
  groups,
  selected,
  onChange,
  valueKey = 'slug',
  compact = false,
  idPrefix = 'category',
}: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const valueOf = (item: CategoryPickerItem) => (valueKey === 'id' ? String(item.id) : item.slug);

  const allItems = useMemo(
    () =>
      groups.flatMap((group) =>
        group.children.map((item) => ({ ...item, groupName: group.name, groupSlug: group.slug })),
      ),
    [groups],
  );
  const selectedItems = allItems.filter((item) => selectedSet.has(valueOf(item)));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(normalizedQuery);
        const children = groupMatches
          ? group.children
          : group.children.filter(
              (item) =>
                item.name.toLowerCase().includes(normalizedQuery) ||
                (item.description ?? '').toLowerCase().includes(normalizedQuery),
            );
        return { ...group, children };
      })
      .filter((group) => group.children.length > 0 || group.name.toLowerCase().includes(normalizedQuery));
  }, [groups, normalizedQuery]);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange([...next]);
  }

  return (
    <div id={idPrefix} className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">
          Đã chọn <span className="text-primary">{selected.length}</span> thể loại
        </p>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] leading-normal text-muted transition-colors hover:text-danger"
          >
            Xoá tất cả
          </button>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
          {selectedItems.map((item) => (
            <button
              key={`${item.groupSlug}-${valueOf(item)}`}
              type="button"
              onClick={() => toggle(valueOf(item))}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] leading-normal text-primary transition-colors hover:bg-primary/15"
              title={`Bỏ chọn ${item.name}`}
            >
              <span className="truncate">{item.name}</span>
              <CloseIcon className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-b border-border p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            id={`${idPrefix}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm thể loại..."
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-xs leading-normal text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className={compact ? 'max-h-[260px] overflow-y-auto p-2' : 'max-h-[360px] overflow-y-auto p-2'}>
        {visibleGroups.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted">Không tìm thấy thể loại phù hợp.</p>
        ) : (
          <div className="space-y-1.5">
            {visibleGroups.map((group) => {
              const selectedInGroup = group.children.filter((item) => selectedSet.has(valueOf(item))).length;
              const isOpen =
                Boolean(normalizedQuery) || openGroups.has(group.slug) || selectedInGroup > 0;
              return (
                <div key={group.slug} className="overflow-hidden rounded-lg border border-border/80">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((previous) => {
                        const next = new Set(previous);
                        if (next.has(group.slug)) next.delete(group.slug);
                        else next.add(group.slug);
                        return next;
                      })
                    }
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 bg-muted/40 px-2.5 py-2 text-left transition-colors hover:bg-muted/70"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                      <CategoryIcon icon={group.icon} className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold leading-normal text-foreground">
                        {group.name}
                      </span>
                      <span className="block text-[10px] leading-normal text-muted">
                        {group.children.length} thể loại
                        {selectedInGroup > 0 ? ` · đã chọn ${selectedInGroup}` : ''}
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="divide-y divide-border/60">
                      {group.children.map((item) => {
                        const value = valueOf(item);
                        const checked = selectedSet.has(value);
                        return (
                          <label
                            key={`${group.slug}-${value}`}
                            className={`flex cursor-pointer items-start gap-2 px-2.5 py-2 transition-colors ${
                              checked ? 'bg-primary/5' : 'bg-card hover:bg-muted/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`${idPrefix}-${group.slug}-${value}`}
                              checked={checked}
                              onChange={() => toggle(value)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--primary)]"
                            />
                            <span className="min-w-0">
                              <span className="block text-[11px] font-medium leading-normal text-foreground">
                                {item.name}
                              </span>
                              {item.description ? (
                                <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
