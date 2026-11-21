/**
 * Pure helpers for the Author Studio (no React, no network) so the draft and
 * publish rules can be unit tested without a backend.
 */

export const BOOK_TITLE_MIN = 2;
export const BOOK_TITLE_MAX = 500;
export const CHAPTER_TITLE_MAX = 300;

export type MetadataDraft = {
  title: string;
  subtitle?: string | null;
  description?: string | null;
};

export type ChapterDraft = {
  title: string;
  content: string | null;
};

export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ');
}

export function countWords(input: string): number {
  const normalized = stripTags(input).replace(/&nbsp;/g, ' ').trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

/** Returns the first validation error for book metadata, or null when valid. */
export function validateMetadata(draft: MetadataDraft): string | null {
  const title = draft.title.trim();
  if (title.length < BOOK_TITLE_MIN) return 'Tiêu đề sách cần ít nhất 2 ký tự.';
  if (title.length > BOOK_TITLE_MAX) return 'Tiêu đề sách không được vượt quá 500 ký tự.';
  const subtitle = (draft.subtitle ?? '').trim();
  if (subtitle.length > BOOK_TITLE_MAX) return 'Phụ đề không được vượt quá 500 ký tự.';
  return null;
}

/** Returns the first validation error for a chapter draft, or null when valid. */
export function validateChapter(draft: ChapterDraft): string | null {
  const title = draft.title.trim();
  if (!title) return 'Tiêu đề chương không được để trống.';
  if (title.length > CHAPTER_TITLE_MAX) return 'Tiêu đề chương không được vượt quá 300 ký tự.';
  return null;
}

/** Publish pre-flight mirroring the backend rules (chapters + content). */
export function validateForPublish(draft: MetadataDraft, chapters: ChapterDraft[]): string | null {
  const metadataError = validateMetadata(draft);
  if (metadataError) return metadataError;
  if (chapters.length === 0) return 'Cần ít nhất một chương trước khi xuất bản.';
  for (const chapter of chapters) {
    const chapterError = validateChapter(chapter);
    if (chapterError) return chapterError;
  }
  const totalWords = chapters.reduce((sum, chapter) => sum + countWords(chapter.content ?? ''), 0);
  if (totalWords === 0) return 'Chương chưa có nội dung để xuất bản.';
  return null;
}

/** Moves an item inside a list, returning the original list for no-op moves. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items;
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã gửi duyệt',
  under_review: 'Đang kiểm duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Bị từ chối',
  archived: 'Đã lưu trữ',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Công khai',
  restricted: 'Hạn chế',
  private: 'Riêng tư',
};

export function visibilityLabel(visibility: string): string {
  return VISIBILITY_LABELS[visibility] ?? visibility;
}