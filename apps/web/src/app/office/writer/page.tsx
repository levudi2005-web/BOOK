'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  type OfficeDocument,
} from '@/lib/api';

type Content = { text: string };

function exec(command: string, value?: string): void {
  document.execCommand(command, false, value);
}

export default function WriterPage() {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef('');
  const [documents, setDocuments] = useState<OfficeDocument[]>([]);
  const [currentUuid, setCurrentUuid] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void listDocuments()
      .then((res) => setDocuments(res.data))
      .catch(() => toast('Không thể tải danh sách tài liệu.', 'default'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDocument(uuid: string) {
    try {
      const doc = await getDocument(uuid);
      setCurrentUuid(uuid);
      setTitle(doc.title);
      const content = (doc.content as Content | null)?.text ?? '';
      if (editorRef.current) editorRef.current.innerHTML = content;
    } catch {
      toast('Không thể mở tài liệu.', 'default');
    }
  }

  async function newDocument() {
    try {
      const created = await createDocument('Tài liệu mới');
      setCurrentUuid(created.documentUuid);
      setTitle(created.title);
      titleRef.current = created.title;
      if (editorRef.current) editorRef.current.innerHTML = '';
      const res = await listDocuments();
      setDocuments(res.data);
    } catch {
      toast('Không thể tạo tài liệu.', 'default');
    }
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 800);
  }

  async function save() {
    if (!currentUuid) return;
    setSaving(true);
    try {
      const content: Content = { text: editorRef.current?.innerHTML ?? '' };
      await updateDocument(currentUuid, { title: titleRef.current, content });
      setSaving(false);
    } catch {
      setSaving(false);
      toast('Không thể lưu tài liệu.', 'default');
    }
  }

  return (
    <div className="container-site py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Office Writer</h1>
          <p className="text-sm text-muted-foreground">Soạn thảo văn bản, lưu trực tiếp vào SQL Storage.</p>
        </div>
        <Button onClick={newDocument}>+ Tài liệu mới</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tài liệu</h2>
          <ul className="space-y-1">
            {documents.length === 0 ? (
              <li className="text-sm text-muted-foreground">Chưa có tài liệu.</li>
            ) : null}
            {documents.map((doc) => (
              <li key={doc.documentUuid}>
                <button
                  type="button"
                  onClick={() => openDocument(doc.documentUuid)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface ${
                    doc.documentUuid === currentUuid ? 'bg-surface font-medium text-primary' : 'text-foreground'
                  }`}
                >
                  {doc.title}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              titleRef.current = e.target.value;
              scheduleSave();
            }}
            placeholder="Tiêu đề tài liệu"
            className="mb-3 text-lg font-semibold"
          />
          <div className="mb-3 flex flex-wrap gap-1 border-b pb-3">
            <button type="button" className="toolbar-btn" onClick={() => exec('bold')}><b>B</b></button>
            <button type="button" className="toolbar-btn" onClick={() => exec('italic')}><i>I</i></button>
            <button type="button" className="toolbar-btn" onClick={() => exec('underline')}><u>U</u></button>
            <button type="button" className="toolbar-btn" onClick={() => exec('formatBlock', '<h2>')}>H2</button>
            <button type="button" className="toolbar-btn" onClick={() => exec('insertUnorderedList')}>•&nbsp;List</button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onInput={scheduleSave}
            className="min-h-[16rem] rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            suppressContentEditableWarning
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {saving ? 'Đang lưu…' : 'Tự động lưu khi bạn ngừng gõ.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
