'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadStorageObject } from '@/lib/api';
import { sanitizeRichHtml } from '@/lib/rich-content';

function errorMessage(cause: unknown, fallback: string): string {
  if (typeof cause === 'string' && cause) return cause;
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message;
  }
  return fallback;
}

function getPdfBlob(pdf: { getBlob: (callback: (blob: Blob) => void) => void }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      pdf.getBlob(resolve);
    } catch (error) {
      reject(error);
    }
  });
}

export type PdfChapter = {
  chapterUuid?: string;
  title: string;
  content: string;
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Không thể đọc ảnh từ Bộ nhớ.'));
    reader.onerror = () => reject(new Error('Không thể đọc ảnh từ Bộ nhớ.'));
    reader.readAsDataURL(blob);
  });
}

async function replaceStorageImages(
  html: string,
  convert: (blob: Blob) => Promise<string>,
): Promise<string> {
  const document = new DOMParser().parseFromString(sanitizeRichHtml(html), 'text/html');
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-storage-uuid]'));
  await Promise.all(images.map(async (image) => {
    const uuid = image.getAttribute('data-storage-uuid');
    if (!uuid) throw new Error('Ảnh trong chương thiếu mã Bộ nhớ.');
    const blob = await downloadStorageObject(uuid);
    image.src = await convert(blob);
  }));
  return document.body.innerHTML;
}

function prepareHtmlForPdf(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const element of document.body.querySelectorAll<HTMLElement>('[style]')) {
    element.style.removeProperty('font-family');
    if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
  }
  return document.body.innerHTML;
}

function makeDocumentHtml(
  title: string,
  author: string,
  publisherName: string,
  publicationYear: number | null,
  coverUrl: string,
  chapters: PdfChapter[],
): string {
  const cover = coverUrl ? `<p><img src="${escapeHtml(coverUrl)}" alt="Bìa sách" /></p>` : '';
  const metadata = [
    author ? `Tác giả: ${escapeHtml(author)}` : '',
    publisherName ? `Nhà xuất bản: ${escapeHtml(publisherName)}` : '',
    publicationYear ? `Năm xuất bản: ${publicationYear}` : '',
  ].filter(Boolean).join('<br />');
  const header = `${cover}<h1>${escapeHtml(title)}</h1>${metadata ? `<p>${metadata}</p>` : ''}`;
  const body = chapters.map((chapter) =>
    `<h2>${escapeHtml(chapter.title)}</h2>${chapter.content}`,
  ).join('');
  return `${header}${body}`;
}

export function PdfExport({
  title,
  author = '',
  publisherName = '',
  publicationYear = null,
  coverStorageKey = '',
  chapters,
  selectedChapterUuid = '',
  allowAll = true,
}: {
  title: string;
  author?: string;
  publisherName?: string;
  publicationYear?: number | null;
  coverStorageKey?: string;
  chapters: PdfChapter[];
  selectedChapterUuid?: string;
  allowAll?: boolean;
}) {
  const [chapterUuid, setChapterUuid] = useState(selectedChapterUuid);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    setChapterUuid(selectedChapterUuid);
  }, [selectedChapterUuid]);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
  }, []);

  const selectedChapters = useMemo(() => {
    if (!allowAll && chapters.length === 1) return chapters;
    const selected = chapters.find((chapter) => chapter.chapterUuid === chapterUuid);
    return selected ? [selected] : chapters;
  }, [allowAll, chapterUuid, chapters]);

  function clearPreviewUrls() {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current = [];
  }

  async function preparePreview() {
    if (selectedChapters.length === 0) return;
    setBusy(true);
    setError('');
    clearPreviewUrls();
    try {
      let coverUrl = '';
      if (coverStorageKey) {
        const coverBlob = await downloadStorageObject(coverStorageKey);
        const url = URL.createObjectURL(coverBlob);
        previewUrls.current.push(url);
        coverUrl = url;
      }
      const chaptersHtml = await Promise.all(selectedChapters.map(async (chapter) => ({
        ...chapter,
        content: await replaceStorageImages(chapter.content, async (blob) => {
          const url = URL.createObjectURL(blob);
          previewUrls.current.push(url);
          return url;
        }),
      })));
      setPreviewHtml(makeDocumentHtml(title, author, publisherName, publicationYear, coverUrl, chaptersHtml));
      setPreviewOpen(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Không thể tạo bản xem trước.'));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (selectedChapters.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const htmlToPdfmakeModule = await import('html-to-pdfmake');
      const [pdfMakeModule, fontModule] = await Promise.all([
        import('pdfmake/build/pdfmake.js'),
        import('pdfmake/build/vfs_fonts.js'),
      ]);
      const pdfMake = pdfMakeModule.default;
      pdfMake.addVirtualFileSystem(fontModule.default);

      const content = [];
      const pdfImages: Record<string, string> = {};
      if (coverStorageKey) {
        const coverBlob = await downloadStorageObject(coverStorageKey);
        pdfImages.cover = await blobToDataUrl(coverBlob);
        content.push({
          image: 'cover',
          width: 150,
          alignment: 'center' as const,
          margin: [0, 0, 0, 18] as [number, number, number, number],
        });
      }
      content.push({ text: title, style: 'bookTitle' });
      if (author.trim()) content.push({ text: author, style: 'bookAuthor' });
      if (publisherName.trim()) content.push({ text: `Nhà xuất bản: ${publisherName}`, style: 'bookMetadata' });
      if (publicationYear) content.push({ text: `Năm xuất bản: ${publicationYear}`, style: 'bookMetadata' });

      for (const [index, chapter] of selectedChapters.entries()) {
        content.push({
          text: chapter.title,
          style: 'chapterTitle',
          ...(index > 0 ? { pageBreak: 'before' as const } : {}),
        });
        const html = await replaceStorageImages(chapter.content, blobToDataUrl);
        const converted = htmlToPdfmakeModule.default(prepareHtmlForPdf(html), { window });
        if (Array.isArray(converted)) content.push(...converted);
        else content.push(converted);
      }

      const pdf = pdfMake.createPdf({
        info: { title, author },
        images: pdfImages,
        pageSize: 'A4',
        pageMargins: [56, 64, 56, 60],
        defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
        styles: {
          bookTitle: { fontSize: 26, bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
          bookAuthor: { fontSize: 12, alignment: 'center', margin: [0, 0, 0, 30] },
          bookMetadata: { fontSize: 10, alignment: 'center', margin: [0, 0, 0, 4] },
          chapterTitle: { fontSize: 19, bold: true, margin: [0, 0, 0, 18] },
          h1: { fontSize: 19, bold: true, margin: [0, 14, 0, 8] },
          h2: { fontSize: 16, bold: true, margin: [0, 12, 0, 6] },
          h3: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
        },
        footer: (currentPage: number, pageCount: number) => ({
          text: `${currentPage} / ${pageCount}`,
          alignment: 'center',
          fontSize: 9,
          color: '#666666',
          margin: [0, 18, 0, 0],
        }),
        content,
      });

      const blob = await getPdfBlob(pdf);
      if (blob.type !== 'application/pdf' || blob.size < 100) {
        throw new Error('Trình xuất không tạo được tệp PDF hợp lệ.');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${title.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'ban-thao'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(errorMessage(cause, 'Không thể xuất PDF.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowAll && chapters.length > 1 ? (
        <select
          aria-label="Phạm vi xuất PDF"
          value={chapterUuid || 'all'}
          onChange={(event) => setChapterUuid(event.target.value === 'all' ? '' : event.target.value)}
          className="h-10 max-w-56 rounded-full border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">Toàn bộ sách</option>
          {chapters.map((chapter, index) => (
            <option key={chapter.chapterUuid ?? index} value={chapter.chapterUuid ?? ''}>
              {chapter.title}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="button" variant="outline" onClick={() => void preparePreview()} disabled={busy || !chapters.length}>
        {busy ? 'Đang chuẩn bị…' : 'Xem trước'}
      </Button>
      <Button type="button" onClick={() => void downloadPdf()} disabled={busy || !chapters.length}>
        {busy ? 'Đang xuất…' : 'Tải PDF'}
      </Button>
      {error ? <p role="alert" className="basis-full text-sm text-danger">{error}</p> : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setPreviewOpen(false);
            setPreviewHtml('');
            clearPreviewUrls();
          }
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-preview-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border p-4">
              <h2 id="pdf-preview-title" className="font-serif text-xl text-foreground">Xem trước bản thảo</h2>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => void downloadPdf()} disabled={busy}>
                  {busy ? 'Đang xuất…' : 'Tải PDF'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setPreviewOpen(false);
                  setPreviewHtml('');
                  clearPreviewUrls();
                }}>Đóng</Button>
              </div>
            </header>
            <article
              className="pdf-preview-content min-h-0 flex-1 overflow-y-auto p-6 sm:p-12"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
