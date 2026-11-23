'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiAuthor, ApiPublisher, CategoryGroup } from '@/lib/api';
import { FilterIcon, MoreVerticalIcon, SearchIcon } from '@/components/icons';
import { CategoryPicker } from '@/components/categories/category-picker';

type Sort = 'newest' | 'popular' | 'rating' | 'title';

type Props = {
  categoryGroups: CategoryGroup[];
  authors: ApiAuthor[];
  publishers: ApiPublisher[];
  group: string;
  selectedCategories: string[];
  author: string;
  publisher: string;
  year: string;
  query: string;
  sort: Sort;
  page: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onApply: (changes: Record<string, string>) => void;
  onReset: () => void;
  onPage: (page: number) => void;
};

type Mode = 'menu' | 'search' | 'filters';

const fieldClass =
  'focus-ring h-8 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-[12px] text-foreground outline-none transition-colors focus:border-ring';

/**
 * Discover-specific floating menu (FIX.md). Filters/search open in this fixed
 * panel, at the current scroll position — the page never jumps to the top.
 */
export function DiscoverQuickMenu(props: Props) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
  const [searchDraft, setSearchDraft] = useState(props.query);
  const [draft, setDraft] = useState({
    group: props.group,
    categories: props.selectedCategories,
    author: props.author,
    publisher: props.publisher,
    year: props.year,
    sort: props.sort,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 220);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function openMode(next: Mode) {
    if (!open) setOpen(true);
    setMode(next);
    if (next === 'search') setSearchDraft(props.query);
    if (next === 'filters') {
      setDraft({
        group: props.group,
        categories: props.selectedCategories,
        author: props.author,
        publisher: props.publisher,
        year: props.year,
        sort: props.sort,
      });
    }
  }

  function close() {
    setOpen(false);
    setMode('menu');
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onApply({ q: searchDraft.trim() });
    close();
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onApply({
      group: draft.group,
      categories: draft.categories.join(','),
      category: '',
      author: draft.author,
      publisher: draft.publisher,
      year: draft.year,
      sort: draft.sort,
    });
    close();
  }

  if (!visible) return null;

  return (
    <div ref={rootRef} className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 sm:right-5">
      <div className="relative flex items-center">
        <button
          type="button"
          aria-label={open ? 'Đóng menu khám phá' : 'Mở menu khám phá'}
          aria-expanded={open}
          aria-controls="discover-quick-menu"
          onClick={() => {
            if (open) close();
            else setOpen(true);
          }}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
        >
          <MoreVerticalIcon className="h-5 w-5" />
        </button>

        {open ? (
          <nav
            id="discover-quick-menu"
            aria-label="Thao tác khám phá"
            className="absolute right-[calc(100%+0.5rem)] top-1/2 max-h-[75vh] w-[min(18rem,calc(100vw-5rem))] origin-right -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lift"
          >
            {mode === 'menu' ? (
              <>
                <button
                  type="button"
                  onClick={() => openMode('search')}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-surface"
                >
                  <SearchIcon className="h-4 w-4 text-primary" />
                  Tìm kiếm
                </button>
                <button
                  type="button"
                  onClick={() => openMode('filters')}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-surface"
                >
                  <FilterIcon className="h-4 w-4 text-primary" />
                  Bộ lọc
                </button>
                <button
                  type="button"
                  disabled={!props.hasActiveFilters}
                  onClick={() => {
                    props.onReset();
                    close();
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
                >
                  Xóa bộ lọc
                </button>
                {props.totalPages > 1 ? (
                  <div className="mt-1 grid grid-cols-2 gap-1 border-t border-border pt-1.5">
                    <button
                      type="button"
                      disabled={props.page <= 1}
                      aria-label="Trang đầu"
                      title="Trang đầu"
                      onClick={() => {
                        props.onPage(1);
                        close();
                      }}
                      className="focus-ring h-8 rounded-lg border border-border px-2 text-[11px] font-semibold leading-normal text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                    >
                      {'<<'}
                    </button>
                    <button
                      type="button"
                      disabled={props.page >= props.totalPages}
                      aria-label="Trang cuối"
                      title="Trang cuối"
                      onClick={() => {
                        props.onPage(props.totalPages);
                        close();
                      }}
                      className="focus-ring h-8 rounded-lg border border-border px-2 text-[11px] font-semibold leading-normal text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                    >
                      {'>>'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            {mode === 'search' ? (
              <form onSubmit={submitSearch} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-foreground">Tìm sách</p>
                  <button
                    type="button"
                    onClick={() => setMode('menu')}
                    className="focus-ring text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Quay lại
                  </button>
                </div>
                <input
                  autoFocus
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Nhập từ khóa…"
                  aria-label="Tìm sách trong khám phá"
                  className={fieldClass}
                />
                <button
                  type="submit"
                  className="focus-ring h-8 w-full rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Tìm ngay
                </button>
              </form>
            ) : null}

            {mode === 'filters' ? (
              <form onSubmit={submitFilters} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-foreground">Bộ lọc</p>
                  <button
                    type="button"
                    onClick={() => setMode('menu')}
                    className="focus-ring text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Quay lại
                  </button>
                </div>
                <select
                  aria-label="Nhóm danh mục"
                  value={draft.group}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      group: event.target.value,
                      categories: [],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="">Tất cả nhóm</option>
                  {props.categoryGroups.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.name}</option>
                  ))}
                </select>
                <CategoryPicker
                  compact
                  idPrefix="discover-quick-category"
                  groups={props.categoryGroups.map((group) => ({
                    id: group.category_id,
                    name: group.name,
                    slug: group.slug,
                    description: group.description,
                    icon: group.icon,
                    children: group.children.map((child) => ({
                      id: child.category_id,
                      name: child.name,
                      slug: child.slug,
                      description: child.description,
                      icon: child.icon,
                    })),
                  }))}
                  selected={draft.categories}
                  valueKey="slug"
                  onChange={(values) =>
                    setDraft((value) => ({ ...value, categories: values, group: '' }))
                  }
                />
                <input
                  autoFocus
                  aria-label="Tác giả"
                  list="discover-quick-author-options"
                  value={draft.author}
                  placeholder="Nhập tên tác giả…"
                  autoComplete="off"
                  onChange={(event) => setDraft((value) => ({ ...value, author: event.target.value }))}
                  className={fieldClass}
                />
                <datalist id="discover-quick-author-options">
                  {props.authors.map((item) => <option key={item.slug} value={item.name} />)}
                </datalist>
                <input
                  aria-label="Nhà xuất bản"
                  list="discover-quick-publisher-options"
                  value={draft.publisher}
                  placeholder="Nhập tên nhà xuất bản…"
                  autoComplete="off"
                  onChange={(event) => setDraft((value) => ({ ...value, publisher: event.target.value }))}
                  className={fieldClass}
                />
                <datalist id="discover-quick-publisher-options">
                  {props.publishers.map((item) => <option key={item.slug} value={item.name} />)}
                </datalist>
                <input
                  aria-label="Năm xuất bản"
                  inputMode="numeric"
                  placeholder="Năm xuất bản (VD: 2024)"
                  value={draft.year}
                  onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))}
                  className={fieldClass}
                />
                <select
                  aria-label="Sắp xếp"
                  value={draft.sort}
                  onChange={(event) => setDraft((value) => ({ ...value, sort: event.target.value as Sort }))}
                  className={fieldClass}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Đọc nhiều</option>
                  <option value="rating">Đánh giá cao</option>
                  <option value="title">Tên sách A–Z</option>
                </select>
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      props.onReset();
                      close();
                    }}
                    className="focus-ring h-8 rounded-lg border border-border px-2 text-[11px] font-semibold text-foreground transition hover:bg-surface"
                  >
                    Xóa
                  </button>
                  <button
                    type="submit"
                    className="focus-ring h-8 rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Áp dụng
                  </button>
                </div>
              </form>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
