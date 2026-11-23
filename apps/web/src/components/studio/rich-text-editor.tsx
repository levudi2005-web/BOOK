'use client';

import { Extension } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cancelUpload, completeUpload, downloadStorageObject, getStorageQuota, initUpload, uploadChunk } from '@/lib/api';
import { normalizeRichContent } from '@/lib/rich-content';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
        },
      },
    }];
  },
});

function StoredImageView({ node }: NodeViewProps) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const storageUuid = typeof node.attrs.storageUuid === 'string' ? node.attrs.storageUuid : '';
  const externalSrc = typeof node.attrs.src === 'string' ? node.attrs.src : '';

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);

    if (!storageUuid) {
      setSrc(externalSrc);
      return () => {
        active = false;
      };
    }

    setSrc('');
    downloadStorageObject(storageUuid)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [externalSrc, storageUuid]);

  return (
    <NodeViewWrapper as="div" className="my-4">
      {src ? (
        <img
          src={src}
          alt={typeof node.attrs.alt === 'string' ? node.attrs.alt : ''}
          title={typeof node.attrs.title === 'string' ? node.attrs.title : undefined}
          className="h-auto max-w-full rounded-lg"
        />
      ) : failed ? (
        <span className="text-sm text-danger">Không thể tải ảnh từ Bộ nhớ.</span>
      ) : (
        <span className="text-sm text-muted-foreground">Đang tải ảnh…</span>
      )}
    </NodeViewWrapper>
  );
}

const StoredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      storageUuid: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-storage-uuid'),
        renderHTML: (attributes) => attributes.storageUuid
          ? { 'data-storage-uuid': attributes.storageUuid, src: '' }
          : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(StoredImageView);
  },
}).configure({ allowBase64: false, resize: false });

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
  }),
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder: 'Bắt đầu viết nội dung…' }),
  StoredImage,
  Table.configure({ resizable: true, renderWrapper: true }),
  TableRow,
  TableHeader,
  TableCell,
];

type Match = { from: number; to: number };

function getMatches(editor: NonNullable<ReturnType<typeof useEditor>>, query: string): Match[] {
  if (!query) return [];
  const needle = query.toLocaleLowerCase();
  const matches: Match[] = [];

  editor.state.doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLocaleLowerCase();
    let offset = 0;
    while (offset <= text.length - needle.length) {
      const found = text.indexOf(needle, offset);
      if (found < 0) break;
      matches.push({ from: position + found, to: position + found + needle.length });
      offset = found + Math.max(needle.length, 1);
    }
  });

  return matches;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`toolbar-btn border border-border disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-primary/10 text-primary' : ''
      }`}
    >
      {children}
    </button>
  );
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, index + step));
  }
  return btoa(binary);
}

function getTextStats(text: string): { words: number; characters: number } {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    characters: Array.from(text).length,
  };
}

export function RichTextEditor({
  id,
  content,
  onChange,
  placeholder = 'Bắt đầu viết nội dung…',
  ariaLabel = 'Nội dung chương',
  pageStyle,
  pageClassName,
}: {
  id?: string;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  pageStyle?: CSSProperties;
  pageClassName?: string;
}) {
  const { toast } = useToast();
  const onChangeRef = useRef(onChange);
  const imageInput = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: EDITOR_EXTENSIONS,
    content: normalizeRichContent(content),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        class: 'tiptap min-h-[20rem] w-full outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChangeRef.current(html);
      setStats(getTextStats(currentEditor.state.doc.textContent));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextContent = normalizeRichContent(content);
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
    setStats(getTextStats(editor.state.doc.textContent));
  }, [content, editor]);

  const findNext = useCallback(() => {
    if (!editor || !findText) return;
    const matches = getMatches(editor, findText);
    if (matches.length === 0) {
      toast('Không tìm thấy nội dung cần tìm.', 'default');
      return;
    }
    const currentFrom = editor.state.selection.to;
    const match = matches.find((item) => item.from >= currentFrom) ?? matches[0];
    editor.chain().focus().setTextSelection(match).run();
  }, [editor, findText, toast]);

  function replaceCurrent() {
    if (!editor || !findText) return;
    const matches = getMatches(editor, findText);
    if (matches.length === 0) {
      toast('Không tìm thấy nội dung cần thay.', 'default');
      return;
    }
    const currentFrom = editor.state.selection.from;
    const match = matches.find((item) => item.from >= currentFrom) ?? matches[0];
    editor.chain().focus().setTextSelection(match).insertContent({ type: 'text', text: replaceText }).run();
  }

  function replaceAll() {
    if (!editor || !findText) return;
    const matches = getMatches(editor, findText);
    if (matches.length === 0) {
      toast('Không tìm thấy nội dung cần thay.', 'default');
      return;
    }
    editor.chain().focus().command(({ tr }) => {
      for (const match of [...matches].reverse()) tr.insertText(replaceText, match.from, match.to);
      return true;
    }).run();
    editor.commands.focus('end');
    toast(`Đã thay ${matches.length.toLocaleString('vi-VN')} vị trí.`, 'success');
  }

  async function insertImage(file: File | undefined) {
    if (!editor || !file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      toast('Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast('Ảnh trong chương tối đa 10 MiB.', 'error');
      return;
    }

    setImageBusy(true);
    let sessionUuid = '';
    try {
      const quota = await getStorageQuota();
      if (file.size > quota.availableBytes) {
        throw new Error('Dung lượng Bộ nhớ còn lại không đủ cho ảnh này.');
      }

      const session = await initUpload(file.name, file.type, file.size);
      sessionUuid = session.sessionUuid;
      for (let index = 0; index < session.chunkCount; index += 1) {
        const start = index * session.chunkSize;
        const chunk = await file.slice(start, Math.min(file.size, start + session.chunkSize)).arrayBuffer();
        await uploadChunk(session.sessionUuid, index, bytesToBase64(chunk));
      }
      const stored = await completeUpload(session.sessionUuid);
      editor.chain().focus().insertContent({
        type: 'image',
        attrs: { src: '', alt: file.name, title: file.name, storageUuid: stored.objectUuid },
      }).run();
      toast('Đã tải ảnh lên Bộ nhớ và chèn vào nội dung.', 'success');
    } catch (error) {
      if (sessionUuid) {
        try {
          await cancelUpload(sessionUuid);
        } catch {
          toast('Không thể hủy phiên tải ảnh lỗi; reservation sẽ hết hạn theo thời hạn của máy chủ.', 'error');
        }
      }
      toast(error instanceof Error ? error.message : 'Không thể tải ảnh lên.', 'error');
    } finally {
      setImageBusy(false);
    }
  }

  function insertLink() {
    if (!editor) return;
    const value = window.prompt('Nhập địa chỉ liên kết (https:// hoặc mailto:):');
    if (!value) return;
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('protocol');
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.toString() }).run();
    } catch {
      toast('Địa chỉ liên kết không hợp lệ.', 'error');
    }
  }

  if (!editor) {
    return <div className="min-h-[24rem] animate-pulse rounded-xl border border-border bg-surface" aria-label="Đang tải trình soạn thảo" />;
  }

  return (
    <section className="min-w-0 overflow-visible rounded-xl border border-border bg-background" aria-label="Trình soạn thảo văn bản">
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-1 rounded-t-xl border-b border-border bg-background/95 p-2 backdrop-blur" role="toolbar" aria-label="Định dạng văn bản">
        <ToolbarButton label="Đậm (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
        <ToolbarButton label="Nghiêng (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
        <ToolbarButton label="Gạch chân (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
        <ToolbarButton label="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
        <select
          aria-label="Kiểu đoạn"
          value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
          onChange={(event) => {
            const level = Number(event.target.value);
            if (level) editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
          className="h-8 max-w-32 rounded-lg border border-border bg-background px-2 text-xs"
        >
          <option value="p">Đoạn văn</option><option value="1">Tiêu đề 1</option>
          <option value="2">Tiêu đề 2</option><option value="3">Tiêu đề 3</option>
        </select>
        <select
          aria-label="Phông chữ"
          value={editor.getAttributes('textStyle').fontFamily ?? ''}
          onChange={(event) => {
            if (event.target.value) editor.chain().focus().setFontFamily(event.target.value).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
          className="h-8 max-w-36 rounded-lg border border-border bg-background px-2 text-xs"
        >
          <option value="">Phông mặc định</option><option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option><option value="Inter, sans-serif">Inter</option>
          <option value="Noto Serif, serif">Noto Serif</option><option value="'Times New Roman', serif">Times New Roman</option>
        </select>
        <select
          aria-label="Cỡ chữ"
          value={editor.getAttributes('textStyle').fontSize?.replace(/px$/, '') ?? ''}
          onChange={(event) => {
            if (event.target.value) editor.chain().focus().setMark('textStyle', { fontSize: `${event.target.value}px` }).run();
            else editor.chain().focus().unsetMark('textStyle').run();
          }}
          className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-xs"
        >
          <option value="">Cỡ chữ</option><option value="12">12</option><option value="14">14</option>
          <option value="16">16</option><option value="18">18</option><option value="24">24</option><option value="32">32</option>
        </select>
        <label className="flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs" title="Màu chữ">
          A <input aria-label="Màu chữ" type="color" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" />
        </label>
        <ToolbarButton label="Tô sáng" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fff2a8' }).run()}><span className="bg-yellow-200 px-1">Màu</span></ToolbarButton>
        <ToolbarButton label="Căn trái" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>≡</ToolbarButton>
        <ToolbarButton label="Căn giữa" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>≡</ToolbarButton>
        <ToolbarButton label="Căn phải" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>≡</ToolbarButton>
        <ToolbarButton label="Căn đều" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>☰</ToolbarButton>
        <ToolbarButton label="Danh sách dấu đầu dòng" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
        <ToolbarButton label="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
        <ToolbarButton label="Đường kẻ ngang" onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</ToolbarButton>
        <ToolbarButton label="Chèn liên kết" active={editor.isActive('link')} onClick={insertLink}>Liên kết</ToolbarButton>
        <ToolbarButton label="Chèn ảnh" disabled={imageBusy} onClick={() => imageInput.current?.click()}>{imageBusy ? 'Đang tải ảnh…' : 'Ảnh'}</ToolbarButton>
        <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void insertImage(file);
        }} />
        <ToolbarButton label="Chèn bảng 2 cột" onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>Bảng</ToolbarButton>
        <ToolbarButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
        <ToolbarButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-b border-border bg-surface/40 p-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Tìm
          <input value={findText} onChange={(event) => setFindText(event.target.value)} className="h-8 w-36 rounded-lg border border-border bg-background px-2 text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Thay bằng
          <input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} className="h-8 w-36 rounded-lg border border-border bg-background px-2 text-foreground" />
        </label>
        <Button type="button" size="sm" variant="outline" onClick={findNext}>Tìm tiếp</Button>
        <Button type="button" size="sm" variant="outline" onClick={replaceCurrent}>Thay</Button>
        <Button type="button" size="sm" variant="outline" onClick={replaceAll}>Thay tất cả</Button>
      </div>

      <div
        className={cn(
          'book-writing-surface mx-auto my-5 rounded-[3px] border border-black/10 px-[9%] py-[8%]',
          pageClassName,
        )}
        style={pageStyle}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>{placeholder}</span>
        <span>{stats.words.toLocaleString('vi-VN')} từ · {stats.characters.toLocaleString('vi-VN')} ký tự</span>
      </div>
    </section>
  );
}
