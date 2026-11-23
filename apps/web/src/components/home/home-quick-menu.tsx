'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchBooks, type ApiBook } from '@/lib/api';
import {
  BookIcon,
  BookOpenIcon,
  FilterIcon,
  LibraryIcon,
  MoreVerticalIcon,
  SearchIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons';

const sectionActions = [
  { href: '/discover', label: 'Khám phá', icon: FilterIcon },
  { href: '/categories', label: 'Danh mục', icon: BookIcon },
  { href: '/library', label: 'Thư viện', icon: LibraryIcon },
  { href: '/write', label: 'Viết sách', icon: SparkleIcon },
  { href: '/community', label: 'Cộng đồng', icon: UserIcon },
] as const;

/**
 * Floating 3-dot menu for the home page.
 *
 * It appears only after the user scrolls past the hero/search area and stays
 * fixed at the right edge (FIX.md Phase 1). The panel never moves with the
 * page; it opens next to the button and links to the main home actions.
 */
export function HomeQuickMenu() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'search'>('menu');
  const [searchDraft, setSearchDraft] = useState('');
  const [results, setResults] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setMode('menu');
    setSearchDraft('');
    setResults([]);
    setSearched('');
    setLoading(false);
  }

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchDraft.trim();
    if (!query) {
      setResults([]);
      setSearched('');
      return;
    }
    setLoading(true);
    setSearched(query);
    try {
      const response = await fetchBooks({ q: query, limit: 5 });
      setResults(response.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 220);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMode('menu');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setMode('menu');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 sm:right-5">
      <div className="relative flex items-center">
        <button
          type="button"
          aria-label={open ? 'Đóng menu trang chủ' : 'Mở menu trang chủ'}
          aria-expanded={open}
          aria-controls="home-quick-menu"
          onClick={() => {
            if (open) close();
            else setOpen(true);
          }}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
        >
          {open ? <MoreVerticalIcon className="h-5 w-5 rotate-90" /> : <MoreVerticalIcon className="h-5 w-5" />}
        </button>

        {open ? (
          <nav
            id="home-quick-menu"
            aria-label="Thao tác trang chủ"
            className="absolute right-[calc(100%+0.5rem)] top-1/2 max-h-[75vh] w-[min(15rem,calc(100vw-5rem))] origin-right -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-lift"
          >
            {mode === 'menu' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-surface"
                >
                  <BookOpenIcon className="h-4 w-4 text-primary" />
                  Trang chủ
                </button>

                <button
                  type="button"
                  onClick={() => setMode('search')}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-surface"
                >
                  <SearchIcon className="h-4 w-4 text-primary" />
                  Tìm kiếm
                </button>

                {sectionActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="focus-ring flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    <action.icon className="h-4 w-4 text-primary" />
                    {action.label}
                  </Link>
                ))}
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
                  aria-label="Tìm sách trên trang chủ"
                  className="focus-ring h-8 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-[12px] text-foreground outline-none transition-colors focus:border-ring"
                />
                <button
                  type="submit"
                  className="focus-ring h-8 w-full rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Tìm ngay
                </button>
                {loading ? (
                  <p className="px-1 py-1 text-[10px] text-muted-foreground">Đang tìm…</p>
                ) : searched ? (
                  results.length > 0 ? (
                    <div className="max-h-48 space-y-0.5 overflow-y-auto border-t border-border pt-1">
                      {results.map((book) => (
                        <Link
                          key={book.book_uuid}
                          href={`/books/${book.slug}`}
                          className="focus-ring block rounded-md px-1.5 py-1 transition-colors hover:bg-surface"
                        >
                          <span className="line-clamp-1 block text-[11px] font-medium text-foreground">{book.title}</span>
                          <span className="block line-clamp-1 text-[9px] text-muted-foreground">
                            {book.author_name || 'Tác giả ẩn danh'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-1 text-[10px] text-muted-foreground">Không tìm thấy sách phù hợp.</p>
                  )
                ) : null}
              </form>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
