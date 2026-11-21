'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  apiUrl,
  fetchBook,
  fetchBookChapters,
  getAccessToken,
  getProgress,
  saveProgress,
  type Chapter,
} from '@/lib/api';
import { ArrowLeftIcon } from '@/components/icons';
import { normalizeRichContent, sanitizeRichHtml } from '@/lib/rich-content';

type ReaderTheme = 'system' | 'sepia' | 'dark';

const readerPalettes: Record<ReaderTheme, { root: string; border: string; muted: string }> = {
  system: { root: 'bg-background text-foreground', border: 'border-border', muted: 'text-muted-foreground' },
  sepia: { root: 'bg-[#f4ecd8] text-[#3d3425]', border: 'border-[#dfd2b7]', muted: 'text-[#6b5c45]' },
  dark: { root: 'bg-[#111715] text-[#ece9dd]', border: 'border-[#303a33]', muted: 'text-[#aab4aa]' },
};

function isReaderTheme(value: string): value is ReaderTheme {
  return value === 'system' || value === 'sepia' || value === 'dark';
}

export function Reader() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [progressWarning, setProgressWarning] = useState('');
  const [showContents, setShowContents] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('system');
  const [fontSize, setFontSize] = useState(18);
  const [renderedContent, setRenderedContent] = useState('');
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
        const requestedChapter =
          typeof window === 'undefined'
            ? null
            : new URLSearchParams(window.location.search).get('chapter');
        let index = requestedChapter
          ? loadedChapters.findIndex((chapter) => chapter.chapter_uuid === requestedChapter)
          : -1;
        if (index < 0) index = 0;

        if (!requestedChapter && getAccessToken() && loadedChapters.length > 0) {
          try {
            const progress = await getProgress(slug);
            if (progress.chapterUuid) {
              const savedIndex = loadedChapters.findIndex(
                (chapter) => chapter.chapter_uuid === progress.chapterUuid,
              );
              if (savedIndex >= 0) index = savedIndex;
            }
          } catch {
            if (active) setProgressWarning('Không thể tải tiến độ đọc đã lưu.');
          }
        }

        if (!active) return;
        setTitle(book.title);
        setChapters(loadedChapters);
        setCurrent(index);
        const chapter = loadedChapters[index];
        if (chapter && typeof window !== 'undefined') {
          const search = new URLSearchParams(window.location.search);
          search.set('chapter', chapter.chapter_uuid);
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}?${search.toString()}`,
          );
        }
        if (chapter && getAccessToken()) {
          const percentComplete = Math.round(((index + 1) / loadedChapters.length) * 100);
          try {
            await saveProgress(slug, {
              percentComplete,
              isCompleted: index === loadedChapters.length - 1,
              chapterUuid: chapter.chapter_uuid,
            });
            if (active) setProgressWarning('');
          } catch {
            if (active) setProgressWarning('Không thể đồng bộ tiến độ đọc. Vui lòng đăng nhập lại.');
          }
        }
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

  useEffect(() => {
    const safeHtml = sanitizeRichHtml(normalizeRichContent(chapters[current]?.content ?? ''));
    const parsed = new DOMParser().parseFromString(safeHtml, 'text/html');
    for (const image of parsed.querySelectorAll<HTMLImageElement>('img[data-storage-uuid]')) {
      const uuid = image.getAttribute('data-storage-uuid');
      if (uuid) image.src = apiUrl(`/books/${encodeURIComponent(slug)}/images/${encodeURIComponent(uuid)}`);
    }
    setRenderedContent(parsed.body.innerHTML);
  }, [chapters, current, slug]);

  async function goTo(index: number) {
    const target = chapters[index];
    if (!target) return;
    setCurrent(index);
    setShowContents(false);
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      search.set('chapter', target.chapter_uuid);
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}?${search.toString()}`,
      );
    }
    if (getAccessToken()) {
      const percentComplete = Math.round(((index + 1) / chapters.length) * 100);
      try {
        await saveProgress(slug, {
          percentComplete,
          isCompleted: index === chapters.length - 1,
          chapterUuid: target.chapter_uuid,
        });
        setProgressWarning('');
      } catch {
        setProgressWarning('Không thể đồng bộ tiến độ đọc. Vui lòng đăng nhập lại.');
      }
    }
  }

  const chapter = chapters[current];

  return (
    <div className={`flex min-h-screen flex-col transition-colors ${palette.root}`}>
      <header className={`shrink-0 border-b px-3 py-3 sm:px-5 ${palette.border}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/library"
              aria-label="Quay lại thư viện"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
            >
              <ArrowLeftIcon />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none">{title || 'Trình đọc'}</p>
              <p className={`mt-1 truncate text-xs ${palette.muted}`}>
                {chapter ? `Chương ${chapter.chapter_number}: ${chapter.title}` : 'Chưa có nội dung'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm hover:bg-black/5 md:hidden"
            aria-expanded={showContents}
            aria-controls="reader-contents"
            onClick={() => setShowContents((visible) => !visible)}
          >
            Mục lục
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Điều hướng chương" className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => void goTo(current - 1)} disabled={current === 0}>
              ← Trước
            </button>
            <span className={palette.muted}>
              {chapters.length ? `${current + 1} / ${chapters.length}` : '0 / 0'}
            </span>
            <button
              type="button"
              onClick={() => void goTo(current + 1)}
              disabled={!chapters.length || current === chapters.length - 1}
            >
              Sau →
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Giảm cỡ chữ"
              className={`h-9 w-9 rounded-lg border text-sm hover:bg-black/5 ${palette.border}`}
              onClick={() => setFontSize((size) => Math.max(14, size - 1))}
            >
              A−
            </button>
            <button
              type="button"
              aria-label="Tăng cỡ chữ"
              className={`h-9 w-9 rounded-lg border text-sm hover:bg-black/5 ${palette.border}`}
              onClick={() => setFontSize((size) => Math.min(28, size + 1))}
            >
              A+
            </button>
            <label className="sr-only" htmlFor="reader-theme">Giao diện đọc</label>
            <select
              id="reader-theme"
              value={readerTheme}
              onChange={(event) => {
                if (isReaderTheme(event.target.value)) setReaderTheme(event.target.value);
              }}
              className={`h-9 max-w-32 rounded-lg border bg-transparent px-2 text-sm ${palette.border}`}
            >
              <option value="system">Theo hệ thống</option>
              <option value="sepia">Giấy</option>
              <option value="dark">Tối</option>
            </select>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          id="reader-contents"
          className={`${showContents ? 'block' : 'hidden'} max-h-[35vh] shrink-0 overflow-y-auto border-b p-4 md:block md:max-h-none md:w-64 md:border-b-0 md:border-r ${palette.border}`}
        >
          <p className="mb-2 text-sm font-semibold">Mục lục</p>
          {chapters.map((item, index) => (
            <button
              key={item.chapter_uuid}
              type="button"
              onClick={() => void goTo(index)}
              aria-current={index === current ? 'page' : undefined}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                index === current ? 'bg-black/10 font-medium' : 'hover:bg-black/5'
              }`}
            >
              {item.chapter_number}. {item.title}
            </button>
          ))}
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-2xl">
            {progressWarning ? (
              <p role="status" className={`mb-4 text-sm ${palette.muted}`}>{progressWarning}</p>
            ) : null}
            {loading ? (
              <p className={`text-sm ${palette.muted}`}>Đang tải…</p>
            ) : loadError ? (
              <p role="alert" className="text-sm text-destructive">{loadError}</p>
            ) : chapter ? (
              <article>
                <h1 className="mb-6 font-serif text-2xl">{chapter.title}</h1>
                <div
                  className="reader-rich-content break-words leading-[1.8]"
                  style={{ fontSize: `${fontSize}px` }}
                  dangerouslySetInnerHTML={{ __html: renderedContent }}
                />
              </article>
            ) : (
              <p className={`text-sm ${palette.muted}`}>Sách chưa có chương nào.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
