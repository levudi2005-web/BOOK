import type { BookLayout } from '@/lib/api';

export const TRIM_PRESETS = [
  { value: 'A4', label: 'A4 · 21 × 29,7 cm', widthMm: 210, heightMm: 297 },
  { value: 'A5', label: 'A5 · 14,8 × 21 cm', widthMm: 148, heightMm: 210 },
  { value: 'B5', label: 'B5 · 17,6 × 25 cm', widthMm: 176, heightMm: 250 },
  { value: '13x19', label: '13 × 19 cm', widthMm: 130, heightMm: 190 },
  { value: 'pocket', label: 'Bỏ túi · 11 × 17,8 cm', widthMm: 110, heightMm: 178 },
  { value: 'custom', label: 'Tự đặt kích thước', widthMm: 148, heightMm: 210 },
] as const;

export const DEFAULT_BOOK_LAYOUT: BookLayout = {
  trimSize: 'A5',
  widthMm: 148,
  heightMm: 210,
  pageStyle: 'lines',
  pageEffect: 'paper',
  showPageNumbers: true,
  readerDefaultMode: 'page',
};

export const PAGE_STYLE_OPTIONS = [
  { value: 'blank', label: 'Trang trắng' },
  { value: 'lines', label: 'Dòng kẻ ngang' },
  { value: 'grid', label: 'Ô ly' },
] as const;

export const PAGE_EFFECT_OPTIONS = [
  { value: 'paper', label: 'Trang sách thật' },
  { value: 'flip', label: 'Lật sách' },
  { value: 'web', label: 'Đọc web thường' },
] as const;

export const READER_MODE_OPTIONS = [
  { value: 'page', label: 'Trang sách thật' },
  { value: 'flip', label: 'Lật sách' },
  { value: 'scroll', label: 'Web đọc thường' },
] as const;

export function layoutFromBook(book: { layout?: Partial<BookLayout> | null }): BookLayout {
  return {
    ...DEFAULT_BOOK_LAYOUT,
    ...book.layout,
    widthMm: Number(book.layout?.widthMm ?? DEFAULT_BOOK_LAYOUT.widthMm),
    heightMm: Number(book.layout?.heightMm ?? DEFAULT_BOOK_LAYOUT.heightMm),
    showPageNumbers: book.layout?.showPageNumbers ?? DEFAULT_BOOK_LAYOUT.showPageNumbers,
  };
}

export function trimPreset(value: string) {
  return TRIM_PRESETS.find((preset) => preset.value === value) ?? TRIM_PRESETS[1];
}

export function estimateWordsPerPage(layout: BookLayout): number {
  const area = Math.max(1, layout.widthMm * layout.heightMm);
  // Ước lượng thận trọng cho cỡ chữ đọc 18px, lề 9%: ưu tiên không tràn trang.
  return Math.max(90, Math.round((area / (148 * 210)) * 220));
}

export function pageFrameStyle(layout: BookLayout, maxWidth = 720) {
  const width = Math.min(maxWidth, Math.max(280, layout.widthMm * 3.78));
  return {
    width: `min(100%, ${Math.round(width)}px)`,
    aspectRatio: `${layout.widthMm} / ${layout.heightMm}`,
  } as const;
}

export function pageTextureStyle(layout: BookLayout) {
  if (layout.pageStyle === 'blank') return { backgroundImage: 'none' };
  if (layout.pageStyle === 'grid') {
    return {
      backgroundImage:
        'linear-gradient(to right, rgba(100,116,139,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,.16) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
    };
  }
  return {
    backgroundImage:
      'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(100,116,139,.2) 28px)',
    backgroundSize: '100% 28px',
  };
}

export function htmlWordCount(html: string): number {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  }
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return (body.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function wrapText(tagName: string, text: string): string {
  const element = document.createElement(tagName || 'p');
  element.textContent = text;
  return element.outerHTML;
}

/**
 * Chia HTML thành các trang theo số từ, giữ cấu trúc khối cơ bản.
 * Đoạn quá dài được cắt thành nhiều đoạn để không tràn khung trang.
 */
export function paginateHtml(html: string, wordsPerPage: number): string[] {
  if (typeof window === 'undefined') return [html];
  const wordsLimit = Math.max(40, wordsPerPage);
  const source = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks = Array.from(source.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
    return node.nodeType === Node.ELEMENT_NODE;
  });
  const pages: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  const flush = () => {
    if (current.length > 0) {
      pages.push(current.join(''));
      current = [];
      currentWords = 0;
    }
  };

  for (const block of blocks) {
    const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
    const count = text ? text.split(' ').length : 0;
    const tagName = (block as HTMLElement).tagName?.toLowerCase() || 'p';
    if (count <= wordsLimit && currentWords + count <= wordsLimit) {
      current.push((block as HTMLElement).outerHTML ?? wrapText(tagName, text));
      currentWords += count;
      continue;
    }
    if (count <= wordsLimit) {
      flush();
      current.push((block as HTMLElement).outerHTML ?? wrapText(tagName, text));
      currentWords = count;
      continue;
    }
    const words = text.split(' ');
    for (let start = 0; start < words.length; start += wordsLimit) {
      flush();
      current.push(wrapText(tagName, words.slice(start, start + wordsLimit).join(' ')));
      currentWords = Math.min(wordsLimit, words.length - start);
      flush();
    }
  }
  flush();
  return pages.length > 0 ? pages : [''];
}

