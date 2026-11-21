'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchBook, fetchBookChapters, saveProgress, type Chapter } from '@/lib/api';
import { ArrowLeftIcon } from '@/components/icons';

export function Reader() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [title, setTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBook(slug), fetchBookChapters(slug)])
      .then(async ([book, chaptersRes]) => {
        setTitle(book.title);
        setChapters(chaptersRes.data);
        setCurrent(0);
        if (chaptersRes.data.length > 0) {
          const pct = chaptersRes.data.length === 1 ? 100 : Math.round((1 / chaptersRes.data.length) * 100);
          try {
            await saveProgress(slug, { percentComplete: pct, isCompleted: chaptersRes.data.length === 1 });
          } catch {
            // progress is best-effort
          }
        }
      })
      .catch(() => setChapters([]))
      .finally(() => setLoading(false));
  }, [slug]);

  async function goTo(index: number) {
    setCurrent(index);
    if (chapters.length > 0) {
      const pct = Math.round(((index + 1) / chapters.length) * 100);
      try {
        await saveProgress(slug, { percentComplete: pct, isCompleted: index === chapters.length - 1 });
      } catch {
        // progress is best-effort
      }
    }
  }

  const chapter = chapters[current];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F4] text-[#242824]">
      <header className="flex h-14 items-center justify-between gap-2 border-b px-4" style={{ borderColor: 'rgb(0 0 0 / 0.12)' }}>
        <div className="flex items-center gap-2">
          <Link href="/library" aria-label="Quay lại thư viện" className="flex h-10 w-10 items-center justify-center rounded-full opacity-80 hover:opacity-100">
            <ArrowLeftIcon />
          </Link>
          <div>
            <p className="text-sm font-medium leading-none">{title || 'Trình đọc'}</p>
            <p className="mt-0.5 text-xs opacity-60">{chapter ? `Chương ${chapter.chapter_number}: ${chapter.title}` : 'Chưa có nội dung'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs opacity-70">
          <button type="button" onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}>← Trước</button>
          <span>{chapters.length ? `${current + 1} / ${chapters.length}` : '0 / 0'}</span>
          <button type="button" onClick={() => goTo(Math.min(chapters.length - 1, current + 1))} disabled={!chapters.length || current === chapters.length - 1}>Sau →</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto border-r p-4" style={{ borderColor: 'rgb(0 0 0 / 0.12)' }}>
          <p className="mb-2 text-sm font-semibold">Mục lục</p>
          {chapters.map((c, index) => (
            <button
              key={c.chapter_uuid}
              type="button"
              onClick={() => goTo(index)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${index === current ? 'bg-black/10 font-medium' : 'opacity-70 hover:opacity-100'}`}
            >
              {c.chapter_number}. {c.title}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-12">
          {loading ? (
            <p className="text-sm opacity-60">Đang tải…</p>
          ) : chapter ? (
            <article className="mx-auto max-w-2xl">
              <h1 className="mb-6 font-serif text-2xl">{chapter.title}</h1>
              <div className="leading-loose" dangerouslySetInnerHTML={{ __html: chapter.content ?? '' }} />
            </article>
          ) : (
            <p className="text-sm opacity-60">Sách chưa có chương nào.</p>
          )}
        </main>
      </div>
    </div>
  );
}
