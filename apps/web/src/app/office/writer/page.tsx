'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PdfExport } from '@/components/studio/pdf-export';
import { RichTextEditor } from '@/components/studio/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import {
  createDocument,
  deleteDocument,
  getDocument,
  getMyProfile,
  listDocuments,
  updateDocument,
  type OfficeDocument,
} from '@/lib/api';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type Content = { text: string };

function documentHtml(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const text = (content as Record<string, unknown>).text;
  return typeof text === 'string' ? text : '';
}

function setDocumentRoute(uuid: string): void {
  const url = new URL(window.location.href);
  if (uuid) url.searchParams.set('document', uuid);
  else url.searchParams.delete('document');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function WriterPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<OfficeDocument[]>([]);
  const [currentUuid, setCurrentUuid] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [authorName, setAuthorName] = useState('');
  const titleRef = useRef('');
  const contentRef = useRef('');
  const currentUuidRef = useRef('');
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const refreshDocuments = useCallback(async () => {
    const response = await listDocuments();
    setDocuments(response.data);
    return response.data;
  }, []);

  useEffect(() => {
    getMyProfile()
      .then((profile) => setAuthorName(profile.profile.displayName.trim() || profile.username))
      .catch(() => setAuthorName(''));
  }, []);

  const save = useCallback(async () => {
    const uuid = currentUuidRef.current;
    if (!uuid) return;
    if (savingRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    savingRef.current = true;
    queuedSaveRef.current = false;
    setSaveState('saving');
    const revision = revisionRef.current;
    const snapshotTitle = titleRef.current;
    const snapshotContent = contentRef.current;
    const task = (async () => {
      try {
        const result = await updateDocument(uuid, {
          title: snapshotTitle,
          content: { text: snapshotContent } satisfies Content,
        });
        setDocuments((current) => current.map((document) =>
          document.documentUuid === uuid
            ? { ...document, title: snapshotTitle, wordCount: result.wordCount }
            : document,
        ));
        if (currentUuidRef.current === uuid) {
          if (revisionRef.current === revision) {
            dirtyRef.current = false;
            setSaveState('saved');
          } else {
            dirtyRef.current = true;
            queuedSaveRef.current = true;
            setSaveState('dirty');
          }
        }
      } catch (error) {
        if (currentUuidRef.current === uuid) {
          dirtyRef.current = true;
          queuedSaveRef.current = false;
          setSaveState('error');
        }
        toast(error instanceof Error ? error.message : 'Không thể lưu tài liệu.', 'error');
      } finally {
        savingRef.current = false;
        savePromiseRef.current = null;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          saveTimer.current = setTimeout(() => void saveRef.current(), 0);
        }
      }
    })();
    savePromiseRef.current = task;
    await task;
  }, [toast]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!dirtyRef.current) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), 800);
  }

  function markDirty() {
    revisionRef.current += 1;
    dirtyRef.current = true;
    setSaveState('dirty');
    scheduleSave();
  }

  const openDocument = useCallback(async (uuid: string) => {
    if (dirtyRef.current && !window.confirm('Tài liệu có thay đổi chưa lưu. Bỏ thay đổi và chuyển tài liệu?')) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savePromiseRef.current) await savePromiseRef.current;

    try {
      const document = await getDocument(uuid);
      const nextContent = documentHtml(document.content);
      currentUuidRef.current = uuid;
      revisionRef.current += 1;
      dirtyRef.current = false;
      setCurrentUuid(uuid);
      setTitle(document.title);
      titleRef.current = document.title;
      setContent(nextContent);
      contentRef.current = nextContent;
      setSaveState('saved');
      setDocumentRoute(uuid);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể mở tài liệu.', 'error');
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    refreshDocuments()
      .then((items) => {
        if (!active) return;
        const requestedUuid = new URLSearchParams(window.location.search).get('document') ?? '';
        if (!requestedUuid) return;
        if (items.some((item) => item.documentUuid === requestedUuid)) {
          void openDocument(requestedUuid);
        } else {
          setDocumentRoute('');
          toast('Tài liệu trong liên kết không còn tồn tại.', 'error');
        }
      })
      .catch(() => {
        if (active) toast('Không thể tải danh sách tài liệu.', 'error');
      });
    return () => {
      active = false;
    };
  }, [openDocument, refreshDocuments, toast]);

  async function newDocument() {
    if (dirtyRef.current && !window.confirm('Tài liệu có thay đổi chưa lưu. Bỏ thay đổi và tạo tài liệu mới?')) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savePromiseRef.current) await savePromiseRef.current;

    try {
      const created = await createDocument('Tài liệu mới');
      currentUuidRef.current = created.documentUuid;
      revisionRef.current += 1;
      dirtyRef.current = false;
      setCurrentUuid(created.documentUuid);
      setTitle(created.title);
      titleRef.current = created.title;
      setContent('');
      contentRef.current = '';
      setSaveState('saved');
      setDocumentRoute(created.documentUuid);
      await refreshDocuments();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể tạo tài liệu.', 'error');
    }
  }

  async function deleteCurrentDocument(uuid: string) {
    if (uuid === currentUuidRef.current && dirtyRef.current && !window.confirm('Xóa tài liệu và bỏ thay đổi chưa lưu?')) return;
    if (!window.confirm('Xóa tài liệu này? Thao tác không thể hoàn tác.')) return;
    if (uuid === currentUuidRef.current && saveTimer.current) clearTimeout(saveTimer.current);
    if (uuid === currentUuidRef.current && savePromiseRef.current) await savePromiseRef.current;
    try {
      await deleteDocument(uuid);
      setDocuments((current) => current.filter((document) => document.documentUuid !== uuid));
      if (currentUuidRef.current === uuid) {
        currentUuidRef.current = '';
        dirtyRef.current = false;
        setCurrentUuid('');
        setTitle('');
        titleRef.current = '';
        setContent('');
        contentRef.current = '';
        setSaveState('idle');
        setDocumentRoute('');
      }
      toast('Đã xóa tài liệu.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể xóa tài liệu.', 'error');
    }
  }

  return (
    <div className="container-site py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Office Writer</h1>
          <p className="text-sm text-muted-foreground">Soạn thảo văn bản có định dạng, lưu vào tài khoản của bạn.</p>
        </div>
        <Button onClick={() => void newDocument()}>+ Tài liệu mới</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card className="min-w-0 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tài liệu</h2>
          <ul className="space-y-1">
            {documents.length === 0 ? <li className="text-sm text-muted-foreground">Chưa có tài liệu.</li> : null}
            {documents.map((document) => (
              <li key={document.documentUuid} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void openDocument(document.documentUuid)}
                  className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface ${
                    document.documentUuid === currentUuid ? 'bg-surface font-medium text-primary' : 'text-foreground'
                  }`}
                >
                  {document.title}
                </button>
                <button
                  type="button"
                  aria-label={`Xóa tài liệu ${document.title}`}
                  onClick={() => void deleteCurrentDocument(document.documentUuid)}
                  className="focus-ring rounded-lg px-2 py-2 text-xs text-danger transition hover:bg-surface"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0 space-y-4 p-4 sm:p-5">
          {currentUuid ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span role="status" className="text-xs text-muted-foreground">
                  {saveState === 'saving' ? 'Đang lưu…' : saveState === 'dirty' ? 'Có thay đổi chưa lưu' : saveState === 'error' ? 'Lưu thất bại — thử lại' : saveState === 'saved' ? 'Đã lưu' : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <PdfExport
                    title={title || 'Tài liệu'}
                    author={authorName}
                    chapters={[{ title: title || 'Tài liệu', content }]}
                    allowAll={false}
                  />
                  <Button type="button" size="sm" variant="outline" disabled={!dirtyRef.current || saveState === 'saving'} onClick={() => void save()}>
                    Lưu ngay
                  </Button>
                </div>
              </div>
              <Input
                aria-label="Tiêu đề tài liệu"
                value={title}
                onChange={(event) => {
                  const next = event.target.value;
                  setTitle(next);
                  titleRef.current = next;
                  markDirty();
                }}
                placeholder="Tiêu đề tài liệu"
                className="text-lg font-semibold"
              />
              <RichTextEditor
                id="document-content"
                ariaLabel="Nội dung tài liệu"
                content={content}
                onChange={(next) => {
                  setContent(next);
                  contentRef.current = next;
                  markDirty();
                }}
                placeholder="Bắt đầu viết tài liệu…"
              />
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
              Chọn một tài liệu hoặc tạo tài liệu mới để bắt đầu.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
