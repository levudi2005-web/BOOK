'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  apiUrl,
  fetchBook,
  fetchBookChapters,
  getAccessToken,
  getProgress,
  saveProgress,
  type BookLayout,
  type Chapter,
} from '@/lib/api';
import { ArrowLeftIcon, CloseIcon, MoreVerticalIcon } from '@/components/icons';
import { BookPage } from '@/components/books/book-page';
import { normalizeRichContent, sanitizeRichHtml } from '@/lib/rich-content';
import {
  DEFAULT_BOOK_LAYOUT,
  READER_MODE_OPTIONS,
  estimateWordsPerPage,
  layoutFromBook,
  paginateHtml,
} from '@/lib/book-layout';
import { cn } from '@/lib/utils';

type ReaderTheme = 'system' | 'sepia' | 'dark';
type ReaderMode = 'page' | 'flip' | 'scroll';
type BookPageItem = {
  chapterIndex: number;
  chapterUuid: string;
  chapterTitle: string;
  html: string;
};

const readerPalettes: Record<ReaderTheme, { root: string; border: string; muted: string }> = {
  system: { root: 'bg-background text-foreground', border: 'border-border', muted: 'text-muted-foreground' },
  sepia: { root: 'bg-[#e9e2d5] text-[#3d3425]', border: 'border-[#d6c9ae]', muted: 'text-[#6b5c45]' },
  dark: { root: 'bg-[#111715] text-[#ece9dd]', border: 'border-[#303a33]', muted: 'text-[#aab4aa]' },
};

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function chapterHtml(chapter: Chapter | undefined, slug: string): string {
  if (!chapter) return '';
  const safeHtml = sanitizeRichHtml(normalizeRichContent(chapter.content ?? ''));
  if (typeof window === 'undefined') return safeHtml;
  const parsed = new DOMParser().parseFromString(safeHtml, 'text/html');
  for (const image of parsed.querySelectorAll<HTMLImageElement>('img[data-storage-uuid]')) {
    const uuid = image.getAttribute('data-storage-uuid');
    if (uuid) image.src = apiUrl(`/books/${encodeURIComponent(slug)}/images/${encodeURIComponent(uuid)}`);
  }
  return parsed.body.innerHTML;
}

export function Reader() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<BookLayout>(DEFAULT_BOOK_LAYOUT);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pages, setPages] = useState<BookPageItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<ReaderMode>('page');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [progressWarning, setProgressWarning] = useState('');
  const [showContents, setShowContents] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('system');
  const [fontSize, setFontSize] = useState(18);
  const [menuOpen, setMenuOpen] = useState(false);
  const secondsSinceSave = useRef(0);
  const palette = readerPalettes[readerTheme];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setProgressWarning('');

    async function loadReader() {
      try {
        const [book, chaptersResponse] = await Promise.all([fetchBook(slug), fetchBookChapters(slug)]);
        const loadedChapters = chaptersResponse.data;
        const nextLayout = layoutFromBook(book);
        const wordsPerPage = estimateWordsPerPage(nextLayout);
        const builtPages: BookPageItem[] = [];
        for (let chapterIndex = 0; chapterIndex < loadedChapters.length; chapterIndex += 1) {
          const chapter = loadedChapters[chapterIndex];
          const html = chapterHtml(chapter, slug);
          const chunks = paginateHtml(html || '<p></p>', wordsPerPage);
          chunks.forEach((chunk, pageIndex) => {
            builtPages.push({
              chapterIndex,
              chapterUuid: chapter.chapter_uuid,
              chapterTitle: chapter.title,
              html: pageIndex === 0 ? `<h1>${escapeHtml(chapter.title)}</h1>${chunk}` : chunk,
            });
          });
        }

        const requestedChapter =
          typeof window === 'undefined'
            ? null
            : new URLSearchParams(window.location.search).get('chapter');
        let initialPage = requestedChapter
          ? builtPages.findIndex((page) => page.chapterUuid === requestedChapter)
          : -1;
        if (initialPage < 0 && !requestedChapter && getAccessToken()) {
          try {
            const progress = await getProgress(slug);
            if (progress.chapterUuid) {
              initialPage = builtPages.findIndex((page) => page.chapterUuid === progress.chapterUuid);
            }
          } catch {
            if (active) setProgressWarning('Không thể tải tiến độ đọc đã lưu.');
          }
        }
        if (initialPage < 0) initialPage = 0;

        if (!active) return;
        setTitle(book.title);
        setLayout(nextLayout);
        setMode(nextLayout.readerDefaultMode);
        setChapters(loadedChapters);
        setPages(builtPages);
        setCurrentPage(initialPage);
      } catch {
        if (active) setLoadError('Không thể tải sách hoặc nội dung chương. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReader();
    return () => {
      active = false;
    };
  }, [slug]);

  const current = pages[currentPage];
  const currentChapter = chapters[current?.chapterIndex ?? 0];
  const totalPages = pages.length;

  const chapterStartPages = useMemo(() => {
    const starts = new Map<number, number>();
    pages.forEach((page, index) => {
      if (!starts.has(page.chapterIndex)) starts.set(page.chapterIndex, index);
    });
    return starts;
  }, [pages]);

  async function syncProgress(secondsRead = 0) {
    if (!getAccessToken() || !current) return;
    const percentComplete = totalPages > 1 ? Math.round(((currentPage + 1) / totalPages) * 100) : 100;
    try {
      await saveProgress(slug, {
        percentComplete,
        isCompleted: currentPage === totalPages - 1,
        chapterUuid: current.chapterUuid,
        secondsRead,
      });
      setProgressWarning('');
    } catch {
      setProgressWarning('Không thể đồng bộ tiến độ đọc. Vui lòng đăng nhập lại.');
    }
  }

  function goToPage(target: number) {
    const safe = Math.min(Math.max(0, target), Math.max(0, totalPages - 1));
    if (safe === currentPage) return;
    setCurrentPage(safe);
    setShowContents(false);
    setMenuOpen(false);
    const page = pages[safe];
    if (page && typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      search.set('chapter', page.chapterUuid);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search.toString()}`);
    }
  }

  useEffect(() => {
    if (!current) return;
    void syncProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pages.length]);

  useEffect(() => {
    if (!getAccessToken()) return undefined;
    const timer = window.setInterval(() => {
      secondsSinceSave.current += 30;
      void syncProgress(secondsSinceSave.current);
      secondsSinceSave.current = 0;
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      if (secondsSinceSave.current > 0) void syncProgress(secondsSinceSave.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pages.length, slug]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goToPage(currentPage - 1);
      if (event.key === 'ArrowRight') goToPage(currentPage + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pages.length]);

  const chapterContent = currentChapter ? chapterHtml(currentChapter, slug) : '';

  return (
    <div className={cn('flex min-h-screen flex-col transition-colors', palette.root)}>
      <header className={cn('sticky top-0 z-40 shrink-0 border-b bg-inherit/95 px-3 py-2 backdrop-blur sm:px-5', palette.border)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/library"
              aria-label="Quay lại thư viện"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-normal">{title || 'Trình đọc'}</p>
              <p className={cn('truncate text-[11px] leading-normal', palette.muted)}>
                {current ? `${current.chapterTitle} · trang ${currentPage + 1}/${totalPages}` : 'Chưa có nội dung'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center rounded-lg border border-current/15 p-0.5 sm:flex">
              {READER_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] leading-normal transition-colors',
                    mode === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-black/5',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowContents((value) => !value)}
              className="rounded-lg border border-current/15 px-2.5 py-1.5 text-xs hover:bg-black/5"
              aria-expanded={showContents}
            >
              Mục lục
            </button>
            <button
              type="button"
              aria-label="Thao tác đọc"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground"
            >
              {menuOpen ? <CloseIcon className="h-4 w-4" /> : <MoreVerticalIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="absolute right-3 top-[calc(100%+0.4rem)] z-50 w-64 rounded-xl border border-border bg-card p-3 text-foreground shadow-lift sm:right-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chế độ đọc</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {READER_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setMode(option.value);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    'rounded-lg px-1.5 py-2 text-[10px] leading-tight transition-colors',
                    mode === option.value ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-surface',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Màu nền</p>
            <div className="mt-1.5 flex gap-1">
              {(['system', 'sepia', 'dark'] as ReaderTheme[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setReaderTheme(theme)}
                  className={cn(
                    'flex-1 rounded-lg border px-2 py-1.5 text-[11px]',
                    readerTheme === theme ? 'border-primary text-primary' : 'border-border',
                  )}
                >
                  {theme === 'system' ? 'Hệ thống' : theme === 'sepia' ? 'Giấy' : 'Tối'}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Cỡ chữ {fontSize}px</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setFontSize((size) => Math.max(14, size - 1))} className="h-7 w-7 rounded border border-border text-xs">A−</button>
                <button type="button" onClick={() => setFontSize((size) => Math.min(28, size + 1))} className="h-7 w-7 rounded border border-border text-xs">A+</button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            showContents ? 'block' : 'hidden',
            'max-h-[calc(100vh-9rem)] w-64 shrink-0 overflow-y-auto border-r p-3 md:block',
            palette.border,
          )}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mục lục</p>
          {chapters.map((item, index) => (
            <button
              key={item.chapter_uuid}
              type="button"
              onClick={() => goToPage(chapterStartPages.get(index) ?? 0)}
              className={cn(
                'mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left text-xs leading-normal',
                index === current?.chapterIndex ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-black/5',
              )}
            >
              {item.chapter_number}. {item.title}
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          {progressWarning ? (
            <p className={cn('mx-auto max-w-3xl px-4 pt-3 text-xs', palette.muted)}>{progressWarning}</p>
          ) : null}
          {loading ? (
            <p className={cn('p-8 text-sm', palette.muted)}>Đang tải…</p>
          ) : loadError ? (
            <p role="alert" className="p-8 text-sm text-destructive">{loadError}</p>
          ) : mode === 'scroll' ? (
            <article className="mx-auto max-w-3xl px-5 py-10">
              <h1 className="mb-6 font-serif text-2xl">{currentChapter?.title}</h1>
              <div
                className="reader-rich-content break-words leading-[1.85]"
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{ __html: chapterContent }}
              />
              <div className="mt-8 flex justify-between border-t border-current/10 pt-4">
                <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 0} className="rounded-lg border border-current/15 px-3 py-2 text-sm disabled:opacity-30">
                  ← Trước
                </button>
                <span className={cn('self-center text-xs', palette.muted)}>{currentPage + 1} / {totalPages}</span>
                <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1} className="rounded-lg border border-current/15 px-3 py-2 text-sm disabled:opacity-30">
                  Sau →
                </button>
              </div>
            </article>
          ) : current ? (
            <div className="px-3 py-6 sm:px-8 sm:py-10">
              <BookPage
                layout={layout}
                pageNumber={currentPage + 1}
                totalPages={totalPages}
                maxWidth={820}
                animate={mode === 'flip'}
              >
                <div
                  className="reader-rich-content"
                  style={{ fontSize: `${fontSize}px` }}
                  dangerouslySetInnerHTML={{ __html: current.html }}
                />
              </BookPage>
              <div className="mx-auto mt-4 flex max-w-[820px] items-center justify-between gap-2">
                <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 0} className="rounded-lg border border-current/15 bg-white/40 px-3 py-2 text-sm text-[#3d3425] disabled:opacity-30">
                  ← Trang trước
                </button>
                <span className={cn('text-xs', palette.muted)}>
                  Trang {currentPage + 1} / {totalPages}
                  {currentPage === totalPages - 1 ? ' · Hết sách' : ''}
                </span>
                <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1} className="rounded-lg border border-current/15 bg-white/40 px-3 py-2 text-sm text-[#3d3425] disabled:opacity-30">
                  Trang sau →
                </button>
              </div>
            </div>
          ) : (
            <p className={cn('p-8 text-sm', palette.muted)}>Sách chưa có chương nào.</p>
          )}
        </main>
      </div>
    </div>
  );
}
