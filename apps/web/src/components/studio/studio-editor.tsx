'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, BookIcon, ChevronDownIcon, ClockIcon, CloseIcon } from '@/components/icons';
import { PdfExport } from '@/components/studio/pdf-export';
import { RichTextEditor } from '@/components/studio/rich-text-editor';
import {
  completeUpload,
  createChapter,
  deleteChapter,
  deleteStudioBook,
  downloadStorageObject,
  getMyProfile,
  getStudioBook,
  initUpload,
  isAuthError,
  listBookVersions,
  listStudioCategories,
  publishBook,
  removeBookCover,
  reorderChapters,
  restoreBookVersion,
  setBookCover,
  setStudioCategories,
  setStudioTags,
  unpublishBook,
  updateChapter,
  uploadChunk,
  updateStudioBook,
  type StudioBookDetail,
  type StudioCategory,
  type StudioChapter,
  type StudioVersion,
} from '@/lib/api';
import {
  countWords,
  moveItem,
  statusLabel,
  validateChapter,
  validateForPublish,
  validateMetadata,
  visibilityLabel,
} from '@/lib/studio-validation';

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 2000;

const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_COVER_BYTES = 2 * 1024 * 1024;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

type MetaDraft = { title: string; subtitle: string; description: string; language: string };

function toMetaDraft(book: StudioBookDetail): MetaDraft {
  return {
    title: book.title,
    subtitle: book.subtitle ?? '',
    description: book.description ?? '',
    language: book.language || 'vi',
  };
}

function saveStateText(state: SaveState, savedAt: Date | null): string {
  if (state === 'saving') return 'Đang lưu…';
  if (state === 'dirty') return 'Có thay đổi chưa lưu';
  if (state === 'error') return 'Lưu thất bại — thử lại';
  if (state === 'saved' && savedAt) return `Đã lưu lúc ${savedAt.toLocaleTimeString('vi-VN')}`;
  return '';
}

export function StudioEditor({ bookUuid }: { bookUuid: string }) {
  const { toast } = useToast();
  const router = useRouter();

  const [book, setBook] = useState<StudioBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [meta, setMeta] = useState<MetaDraft>({ title: '', subtitle: '', description: '', language: 'vi' });
  const [metaState, setMetaState] = useState<SaveState>('idle');
  const [metaSavedAt, setMetaSavedAt] = useState<Date | null>(null);

  const [selectedUuid, setSelectedUuid] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [chapterState, setChapterState] = useState<SaveState>('idle');
  const [chapterSavedAt, setChapterSavedAt] = useState<Date | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [confirmBookDelete, setConfirmBookDelete] = useState(false);
  const [versions, setVersions] = useState<StudioVersion[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<StudioCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [taxonomySaving, setTaxonomySaving] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const savingRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const chapterRevisionRef = useRef(0);
  const persistRef = useRef<(silent: boolean) => Promise<void>>(async () => {});

  const applyBook = useCallback((next: StudioBookDetail) => {
    setBook(next);
    setMeta(toMetaDraft(next));
    setMetaState('idle');
    setMetaSavedAt(null);
  }, []);

  const load = useCallback(async (): Promise<StudioBookDetail | null> => {
    try {
      const detail = await getStudioBook(bookUuid);
      applyBook(detail);
      setSelectedUuid((current) => current || detail.chapters[0]?.chapterUuid || '');
      setLoadError('');
      setAuthRequired(false);
      return detail;
    } catch (error) {
      if (isAuthError(error)) {
        setAuthRequired(true);
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải sách.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyBook, bookUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    listStudioCategories()
      .then((response) => {
        if (active) setCategoryOptions(response.data);
      })
      .catch(() => {
        if (active) setCategoryOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((profile) => {
        if (active) setAuthorName(profile.profile.displayName.trim() || profile.username);
      })
      .catch(() => {
        if (active) setAuthorName('');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!book) return;
    setSelectedCategories(book.categories.map((category) => category.categoryId));
    setTagsInput(book.tags.join(', '));
  }, [book]);

  const chapters = useMemo(() => book?.chapters ?? [], [book]);
  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.chapterUuid === selectedUuid) ?? null,
    [chapters, selectedUuid],
  );

  const metaDirty = useMemo(() => {
    if (!book) return false;
    const saved = toMetaDraft(book);
    return (
      meta.title !== saved.title ||
      meta.subtitle !== saved.subtitle ||
      meta.description !== saved.description ||
      meta.language !== saved.language
    );
  }, [book, meta]);

  const chapterDirty = useMemo(() => {
    if (!selectedChapter) return false;
    return chapterTitle !== selectedChapter.title || chapterContent !== (selectedChapter.content ?? '');
  }, [chapterContent, chapterTitle, selectedChapter]);

  const dirty = metaDirty || chapterDirty;

  useEffect(() => {
    if (metaDirty && metaState !== 'saving') setMetaState('dirty');
  }, [metaDirty, metaState]);

  // Populate the editor fields whenever a different chapter is selected.
  // Keyed on the chapter uuid so an autosave that updates `book` does not clobber
  // the user's in-progress text (same uuid ⇒ skip).
  const editingChapterUuid = useRef('');
  useEffect(() => {
    const uuid = selectedChapter?.chapterUuid ?? '';
    if (editingChapterUuid.current === uuid) return;
    editingChapterUuid.current = uuid;
    chapterRevisionRef.current += 1;
    setChapterTitle(selectedChapter?.title ?? '');
    setChapterContent(selectedChapter?.content ?? '');
    setChapterState('idle');
    setChapterSavedAt(null);
  }, [selectedChapter]);

  useEffect(() => {
    if (chapterDirty) {
      setChapterState((current) => (current === 'saving' ? current : 'dirty'));
      return;
    }
    setChapterState((current) => (current === 'saving' || current === 'saved' ? current : 'idle'));
  }, [chapterDirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Keep the autosave timer pointing at the latest chapter state without
  // re-arming it on every render.
  useEffect(() => {
    persistRef.current = persistChapter;
  });

  useEffect(() => {
    if (!selectedChapter || !chapterDirty) return undefined;
    if (chapterState === 'saving' || chapterState === 'error') return undefined;
    const timer = window.setTimeout(() => {
      void persistRef.current(true);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [chapterContent, chapterDirty, chapterState, chapterTitle, selectedChapter]);

  const [coverBusy, setCoverBusy] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');

  const coverKey = book?.coverStorageKey ?? '';

  useEffect(() => {
    if (!coverKey) {
      setCoverPreview('');
      return undefined;
    }
    let active = true;
    let objectUrl = '';
    downloadStorageObject(coverKey)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setCoverPreview(objectUrl);
      })
      .catch(() => {
        if (active) setCoverPreview('');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverKey]);

  async function onUploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !book) return;
    if (!COVER_MIME_TYPES.includes(file.type)) {
      toast('Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF.', 'error');
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast('Ảnh bìa tối đa 2 MiB.', 'error');
      return;
    }
    setCoverBusy(true);
    try {
      const init = await initUpload(file.name, file.type, file.size);
      const buffer = await file.arrayBuffer();
      const chunkCount = Math.max(1, init.chunkCount);
      for (let index = 0; index < chunkCount; index += 1) {
        const slice = buffer.slice(index * init.chunkSize, Math.min(buffer.byteLength, (index + 1) * init.chunkSize));
        await uploadChunk(init.sessionUuid, index, arrayBufferToBase64(slice));
      }
      const object = await completeUpload(init.sessionUuid);
      const updated = await setBookCover(book.bookUuid, object.objectUuid);
      setBook(updated);
      toast('Đã cập nhật ảnh bìa.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể tải ảnh bìa.', 'error');
    } finally {
      setCoverBusy(false);
    }
  }

  async function onRemoveCover() {
    if (!book) return;
    if (!window.confirm('Xoá ảnh bìa của sách này?')) return;
    setCoverBusy(true);
    try {
      const updated = await removeBookCover(book.bookUuid);
      setBook(updated);
      toast('Đã xoá ảnh bìa.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xoá ảnh bìa.', 'error');
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveMeta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!book) return;
    const error = validateMetadata(meta);
    if (error) {
      toast(error, 'error');
      return;
    }
    setMetaState('saving');
    try {
      const updated = await updateStudioBook(book.bookUuid, {
        title: meta.title.trim(),
        subtitle: meta.subtitle.trim(),
        description: meta.description,
        language: meta.language,
      });
      applyBook(updated);
      setMetaState('saved');
      setMetaSavedAt(new Date());
      toast('Đã lưu thông tin sách.', 'success');
    } catch (error) {
      setMetaState('dirty');
      toast(error instanceof Error ? error.message : 'Không thể lưu thông tin sách.', 'error');
    }
  }

  async function saveChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistChapter(false);
  }

  async function persistChapter(silent: boolean) {
    if (!selectedChapter) return;
    if (savingRef.current) {
      saveQueuedRef.current = true;
      return;
    }
    const error = validateChapter({ title: chapterTitle, content: chapterContent });
    if (error) {
      if (!silent) toast(error, 'error');
      return;
    }
    savingRef.current = true;
    saveQueuedRef.current = false;
    setChapterState('saving');
    const chapterUuid = selectedChapter.chapterUuid;
    const revision = chapterRevisionRef.current;
    const nextTitle = chapterTitle.trim();
    const nextContent = chapterContent;
    try {
      const result = await updateChapter(chapterUuid, { title: nextTitle, content: nextContent });
      setBook((current) =>
        current
          ? {
              ...current,
              chapters: current.chapters.map((chapter) =>
                chapter.chapterUuid === chapterUuid
                  ? { ...chapter, title: nextTitle, content: nextContent, wordCount: result.wordCount }
                  : chapter,
              ),
            }
          : current,
      );
      if (editingChapterUuid.current === chapterUuid && selectedUuid === chapterUuid) {
        if (chapterRevisionRef.current === revision) {
          setChapterState('saved');
          setChapterSavedAt(new Date());
        } else {
          saveQueuedRef.current = true;
          setChapterState('dirty');
        }
      }
      if (!silent) toast('Đã lưu chương.', 'success');
    } catch (error) {
      saveQueuedRef.current = false;
      if (editingChapterUuid.current === chapterUuid && selectedUuid === chapterUuid) {
        setChapterState('error');
      }
      toast(error instanceof Error ? error.message : 'Không thể lưu chương.', 'error');
    } finally {
      savingRef.current = false;
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        window.setTimeout(() => void persistRef.current(true), 0);
      }
    }
  }

  function selectChapter(uuid: string) {
    if (uuid === selectedUuid) return;
    if (chapterDirty && !window.confirm('Chương có thay đổi chưa lưu. Bỏ thay đổi và chuyển chương?')) return;
    chapterRevisionRef.current += 1;
    setSelectedUuid(uuid);
    setChapterState('idle');
    setChapterSavedAt(null);
  }

  async function addChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!book) return;
    if (metaDirty) {
      toast('Hãy lưu thông tin sách trước khi thêm chương để không mất thay đổi.', 'error');
      return;
    }
    const title = newChapterTitle.trim() || `Chương ${chapters.length + 1}`;
    const error = validateChapter({ title, content: '' });
    if (error) {
      toast(error, 'error');
      return;
    }
    setBusyAction('create-chapter');
    try {
      const created = await createChapter(book.bookUuid, { title, content: '' });
      await load();
      setNewChapterTitle('');
      setSelectedUuid(created.chapterUuid);
      toast('Đã thêm chương mới.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể thêm chương.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function removeChapter(chapter: StudioChapter) {
    if (metaDirty) {
      toast('Hãy lưu thông tin sách trước khi xóa chương để không mất thay đổi.', 'error');
      return;
    }
    if (!window.confirm(`Xóa chương "${chapter.title}"? Thao tác này không thể hoàn tác.`)) return;
    setBusyAction(`delete-${chapter.chapterUuid}`);
    try {
      await deleteChapter(chapter.chapterUuid);
      if (chapter.chapterUuid === selectedUuid) setSelectedUuid('');
      await load();
      toast('Đã xóa chương.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xóa chương.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function moveChapter(chapter: StudioChapter, direction: -1 | 1) {
    if (!book) return;
    if (metaDirty) {
      toast('Hãy lưu thông tin sách trước khi sắp xếp chương để không mất thay đổi.', 'error');
      return;
    }
    const index = chapters.findIndex((item) => item.chapterUuid === chapter.chapterUuid);
    const next = moveItem(chapters, index, index + direction);
    if (next === chapters) return;
    setBusyAction(`move-${chapter.chapterUuid}`);
    try {
      await reorderChapters(book.bookUuid, next.map((item) => item.chapterUuid));
      await load();
      toast('Đã cập nhật thứ tự chương.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể sắp xếp chương.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function onPublish() {
    if (!book) return;
    if (metaDirty) {
      toast('Hãy lưu thông tin sách trước khi xuất bản.', 'error');
      return;
    }
    if (chapterDirty) {
      toast('Hãy lưu chương đang chỉnh sửa trước khi xuất bản.', 'error');
      return;
    }
    const error = validateForPublish(meta, chapters);
    if (error) {
      toast(error, 'error');
      return;
    }
    setBusyAction('publish');
    try {
      const published = await publishBook(book.bookUuid);
      applyBook(published);
      toast('Sách đã được xuất bản công khai.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xuất bản sách.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function loadVersions() {
    if (!book) return;
    setVersionsLoading(true);
    try {
      const result = await listBookVersions(book.bookUuid);
      setVersions(result.data);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể tải lịch sử phiên bản.', 'error');
    } finally {
      setVersionsLoading(false);
    }
  }

  async function onDeleteBook() {
    if (!book) return;
    if (!confirmBookDelete) {
      setConfirmBookDelete(true);
      return;
    }
    setBusyAction('delete-book');
    try {
      await deleteStudioBook(book.bookUuid);
      toast('Đã xóa sách khỏi Author Studio.', 'success');
      router.push('/write');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xóa sách.', 'error');
    } finally {
      setBusyAction('');
    }
  }


  async function saveTaxonomy() {
    if (!book) return;
    if (selectedCategories.length > 5) {
      toast('Mỗi sách chỉ được chọn tối đa 5 danh mục.', 'error');
      return;
    }
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 10) {
      toast('Mỗi sách chỉ được gắn tối đa 10 nhãn.', 'error');
      return;
    }
    setTaxonomySaving(true);
    try {
      await setStudioCategories(book.bookUuid, selectedCategories);
      const updated = await setStudioTags(book.bookUuid, tags);
      applyBook(updated);
      toast('Đã lưu danh mục và nhãn.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể lưu danh mục/nhãn.', 'error');
    } finally {
      setTaxonomySaving(false);
    }
  }

  async function onUnpublish() {
    if (!book) return;
    if (!window.confirm('Gỡ xuất bản sách? Sách sẽ trở về bản nháp riêng tư và biến khỏi catalog công khai.')) {
      return;
    }
    setBusyAction('unpublish');
    try {
      const updated = await unpublishBook(book.bookUuid);
      applyBook(updated);
      toast('Đã gỡ xuất bản sách.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể gỡ xuất bản.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function onRestoreVersion(versionNumber: number) {
    if (!book) return;
    if (
      !window.confirm(
        `Khôi phục phiên bản v${versionNumber}? Nội dung hiện tại của các chương còn tồn tại sẽ bị ghi đè.`,
      )
    ) {
      return;
    }
    setBusyAction(`restore-${versionNumber}`);
    try {
      const result = await restoreBookVersion(book.bookUuid, versionNumber);
      applyBook(result.book);
      const skipped = result.skippedChapters > 0 ? ` (${result.skippedChapters} chương đã bị xoá, không thể khôi phục)` : '';
      toast(`Đã khôi phục v${versionNumber}: ${result.restoredChapters} chương${skipped}.`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể khôi phục phiên bản.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-9 w-64" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<BookIcon className="h-6 w-6" />}
          title="Cần đăng nhập"
          description="Author Studio cần phiên đăng nhập hợp lệ để mở sách của bạn."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/auth/login"
                className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Đăng nhập
              </Link>
              <Link
                href="/write"
                className="focus-ring inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground"
              >
                Về danh sách sách
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<BookIcon className="h-6 w-6" />}
          title="Không thể mở sách"
          description={loadError || 'Sách không tồn tại hoặc bạn không có quyền truy cập.'}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => { setLoading(true); void load(); }}>Thử lại</Button>
              <Link
                href="/write"
                className="focus-ring inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground"
              >
                Về danh sách sách
              </Link>
            </div>
          }
        />
      </div>
    );
  }


  const published = book.status === 'published';
  const totalWords = chapters.reduce((sum, chapter) => sum + Number(chapter.wordCount ?? 0), 0);
  const pdfChapters = chapters.map((chapter) => ({
    chapterUuid: chapter.chapterUuid,
    title: chapter.chapterUuid === selectedUuid ? chapterTitle : chapter.title,
    content: chapter.chapterUuid === selectedUuid ? chapterContent : chapter.content ?? '',
  }));

  return (
    <div className="container-site py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/write"
            onClick={(event) => {
              if (dirty && !window.confirm('Có thay đổi chưa lưu. Rời trang?')) event.preventDefault();
            }}
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Author Studio
          </Link>
          <h1 className="mt-2 truncate font-serif text-3xl text-foreground">{book.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={published ? 'default' : 'muted'}>{statusLabel(book.status)}</Badge>
            <Badge variant="outline">{visibilityLabel(book.visibility)}</Badge>
            <span className="text-xs text-muted-foreground">
              {chapters.length} chương · {totalWords.toLocaleString('vi-VN')} từ · /books/{book.slug}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {published ? (
            <Link
              href={`/books/${book.slug}`}
              target="_blank"
              className="focus-ring inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-surface"
            >
              Xem công khai
            </Link>
          ) : null}
          <Button onClick={onPublish} disabled={busyAction === 'publish'}>
            {busyAction === 'publish' ? 'Đang xuất bản…' : published ? 'Xuất bản lại' : 'Xuất bản'}
          </Button>
          {published ? (
            <Button variant="outline" onClick={onUnpublish} disabled={busyAction === 'unpublish'}>
              {busyAction === 'unpublish' ? 'Đang gỡ…' : 'Gỡ xuất bản'}
            </Button>
          ) : null}
          <Button variant="danger" onClick={onDeleteBook} disabled={busyAction === 'delete-book'}>
            {confirmBookDelete ? 'Xác nhận xóa sách' : 'Xóa sách'}
          </Button>
        </div>
      </div>

      {chapters.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <PdfExport
            title={book.title}
            author={authorName}
            chapters={pdfChapters}
            selectedChapterUuid={selectedUuid}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-foreground">Thông tin sách</h2>
              <span
                className={cn(
                  'text-xs',
                  metaState === 'dirty' ? 'text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                {saveStateText(metaState, metaSavedAt)}
              </span>
            </div>
            <form onSubmit={saveMeta} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="studio-title">Tiêu đề</Label>
                <Input
                  id="studio-title"
                  value={meta.title}
                  maxLength={500}
                  required
                  onChange={(event) => setMeta((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="studio-subtitle">Phụ đề</Label>
                <Input
                  id="studio-subtitle"
                  value={meta.subtitle}
                  maxLength={500}
                  onChange={(event) => setMeta((current) => ({ ...current, subtitle: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="studio-language">Ngôn ngữ</Label>
                <Select
                  id="studio-language"
                  value={meta.language}
                  onChange={(event) => setMeta((current) => ({ ...current, language: event.target.value }))}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="studio-description">Mô tả</Label>
                <Textarea
                  id="studio-description"
                  value={meta.description}
                  className="min-h-32"
                  onChange={(event) => setMeta((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <Button type="submit" disabled={metaState === 'saving' || !metaDirty}>
                {metaState === 'saving' ? 'Đang lưu…' : 'Lưu thông tin'}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-foreground">Ảnh bìa</h2>
              <span className="text-xs text-muted-foreground">JPEG/PNG/WebP/GIF · tối đa 2 MiB</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="h-32 w-24 overflow-hidden rounded-xl border border-border bg-surface">
                {coverPreview ? (
                  <img src={coverPreview} alt="Ảnh bìa hiện tại" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Chưa có</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="focus-ring inline-flex h-10 cursor-pointer items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
                  {coverBusy ? 'Đang xử lý…' : 'Tải ảnh lên'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    disabled={coverBusy}
                    onChange={(event) => void onUploadCover(event)}
                  />
                </label>
                {book.coverStorageKey ? (
                  <Button variant="outline" disabled={coverBusy} onClick={() => void onRemoveCover()}>
                    Xoá ảnh bìa
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ảnh bìa chỉ hiển thị công khai khi sách đã xuất bản.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-foreground">Danh mục &amp; nhãn</h2>
              <span className="text-xs text-muted-foreground">
                {selectedCategories.length}/5 danh mục
              </span>
            </div>
            {categoryOptions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Hệ thống chưa có danh mục nào được kích hoạt.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {categoryOptions.map((category) => {
                  const checked = selectedCategories.includes(category.categoryId);
                  return (
                    <label
                      key={category.categoryId}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                        checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-surface/60',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedCategories((current) =>
                            checked
                              ? current.filter((id) => id !== category.categoryId)
                              : current.length >= 5
                                ? current
                                : [...current, category.categoryId],
                          )
                        }
                        className="h-4 w-4 accent-[rgb(var(--primary))]"
                      />
                      <span className="text-foreground">{category.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Label htmlFor="studio-tags">Nhãn (phân tách bằng dấu phẩy, tối đa 10)</Label>
              <Input
                id="studio-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="tiểu thuyết, trinh thám, kỳ ảo"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void saveTaxonomy()}
              disabled={taxonomySaving}
            >
              {taxonomySaving ? 'Đang lưu…' : 'Lưu danh mục & nhãn'}
            </Button>
          </Card>


          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-foreground">Chương</h2>
              <span className="text-xs text-muted-foreground">{chapters.length} chương</span>
            </div>

            {chapters.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sách chưa có chương nào. Thêm chương đầu tiên bên dưới để bắt đầu viết.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {chapters.map((chapter, index) => (
                  <li key={chapter.chapterUuid} className="flex items-center gap-2 rounded-xl border border-border p-1.5">
                    <button
                      type="button"
                      onClick={() => selectChapter(chapter.chapterUuid)}
                      className={cn(
                        'focus-ring min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors',
                        chapter.chapterUuid === selectedUuid ? 'bg-surface' : 'hover:bg-surface/60',
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {chapter.chapterNumber}. {chapter.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Number(chapter.wordCount ?? 0).toLocaleString('vi-VN')} từ · {statusLabel(chapter.status)}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 pr-1">
                      <button
                        type="button"
                        aria-label={`Đưa "${chapter.title}" lên`}
                        disabled={index === 0 || busyAction === `move-${chapter.chapterUuid}`}
                        onClick={() => void moveChapter(chapter, -1)}
                        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-surface disabled:opacity-40"
                      >
                        <ChevronDownIcon className="h-4 w-4 rotate-180" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Đưa "${chapter.title}" xuống`}
                        disabled={index === chapters.length - 1 || busyAction === `move-${chapter.chapterUuid}`}
                        onClick={() => void moveChapter(chapter, 1)}
                        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-surface disabled:opacity-40"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Xóa "${chapter.title}"`}
                        disabled={busyAction === `delete-${chapter.chapterUuid}`}
                        onClick={() => void removeChapter(chapter)}
                        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-border text-danger transition hover:bg-surface disabled:opacity-40"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <form onSubmit={addChapter} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newChapterTitle}
                maxLength={300}
                placeholder={`Chương ${chapters.length + 1}`}
                onChange={(event) => setNewChapterTitle(event.target.value)}
                className="sm:max-w-sm"
              />
              <Button type="submit" variant="outline" disabled={busyAction === 'create-chapter'}>
                {busyAction === 'create-chapter' ? 'Đang thêm…' : 'Thêm chương'}
              </Button>
            </form>


            {selectedChapter ? (
              <form onSubmit={saveChapter} className="mt-6 space-y-3 border-t border-border pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-lg text-foreground">Chương {selectedChapter.chapterNumber}</h3>
                  <span
                    className={cn(
                      'text-xs',
                      chapterState === 'dirty' ? 'text-accent-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {saveStateText(chapterState, chapterSavedAt)}
                  </span>
                </div>
                <div>
                  <Label htmlFor="chapter-title">Tiêu đề chương</Label>
                  <Input
                    id="chapter-title"
                    value={chapterTitle}
                    maxLength={300}
                    required
                    onChange={(event) => {
                      chapterRevisionRef.current += 1;
                      setChapterTitle(event.target.value);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-content">Nội dung chương</Label>
                  <RichTextEditor
                    id="chapter-content"
                    content={chapterContent}
                    onChange={(content) => {
                      chapterRevisionRef.current += 1;
                      setChapterContent(content);
                    }}
                    placeholder="Bắt đầu viết nội dung chương…"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {countWords(chapterContent).toLocaleString('vi-VN')} từ
                  </span>
                  <Button type="submit" disabled={chapterState === 'saving' || !chapterDirty}>
                    {chapterState === 'saving' ? 'Đang lưu…' : 'Lưu chương'}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Chọn một chương để chỉnh sửa nội dung.</p>
            )}
          </Card>
        </div>


        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="font-serif text-lg text-foreground">Tổng quan</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd className="font-medium text-foreground">{statusLabel(book.status)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Hiển thị</dt>
                <dd className="font-medium text-foreground">{visibilityLabel(book.visibility)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Chương</dt>
                <dd className="font-medium text-foreground">{chapters.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Số từ</dt>
                <dd className="font-medium text-foreground">{totalWords.toLocaleString('vi-VN')}</dd>
              </div>
              {book.publishedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Xuất bản</dt>
                  <dd className="text-right font-medium text-foreground">
                    {new Date(book.publishedAt).toLocaleString('vi-VN')}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg text-foreground">Lịch sử phiên bản</h2>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mỗi lần xuất bản tạo một bản chụp nội dung sách.
            </p>
            {versions === null ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void loadVersions()}
                disabled={versionsLoading}
              >
                {versionsLoading ? 'Đang tải…' : 'Tải lịch sử'}
              </Button>
            ) : versions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Chưa có phiên bản nào.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {versions.map((version) => (
                  <li key={version.version_number} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">
                      v{version.version_number} · {version.title}
                    </p>
                    <p className="text-muted-foreground">
                      {Number(version.word_count ?? 0).toLocaleString('vi-VN')} từ ·{' '}
                      {new Date(version.created_at).toLocaleString('vi-VN')}
                    </p>
                    <button
                      type="button"
                      onClick={() => void onRestoreVersion(version.version_number)}
                      disabled={busyAction === `restore-${version.version_number}`}
                      className="focus-ring mt-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {busyAction === `restore-${version.version_number}` ? 'Đang khôi phục…' : 'Khôi phục'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

