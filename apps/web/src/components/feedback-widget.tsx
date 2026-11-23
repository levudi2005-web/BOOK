'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import { createFeedback, isAuthError } from '@/lib/api';
import { CloseIcon, MoreVerticalIcon } from '@/components/icons';

export function FeedbackWidget() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'feedback' | 'report' | 'idea'>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    try {
      await createFeedback({ kind, subject: subject.trim(), message: message.trim(), pagePath: pathname });
      toast('Đã gửi tới admin. Cảm ơn bạn đã đóng góp!', 'success');
      setOpen(false);
      setSubject('');
      setMessage('');
    } catch (error) {
      if (isAuthError(error)) toast('Vui lòng đăng nhập để gửi phản hồi.', 'default');
      else toast(error instanceof Error ? error.message : 'Không thể gửi phản hồi.', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Gửi phản hồi cho admin"
        className="focus-ring fixed bottom-4 right-4 z-40 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 text-xs font-medium text-foreground shadow-lift backdrop-blur transition hover:border-primary/50"
      >
        <MoreVerticalIcon className="h-3.5 w-3.5 text-primary" />
        Phản hồi
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="feedback-title" className="font-serif text-xl text-foreground">Gửi phản hồi / báo cáo</h2>
                <p className="mt-1 text-xs text-muted-foreground">Tin nhắn một chiều tới admin. Không hiển thị công khai.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-full p-1.5 hover:bg-surface">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="feedback-kind">Loại</Label>
                <Select id="feedback-kind" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                  <option value="feedback">Góp ý</option>
                  <option value="report">Báo cáo nội dung/lỗi</option>
                  <option value="idea">Ý tưởng mới</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="feedback-subject">Tiêu đề</Label>
                <Input id="feedback-subject" value={subject} required minLength={3} maxLength={200} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="feedback-message">Nội dung</Label>
                <Textarea id="feedback-message" value={message} required minLength={10} maxLength={8000} className="min-h-32" onChange={(event) => setMessage(event.target.value)} />
              </div>
              <p className="text-[11px] text-muted-foreground">Trang gửi: {pathname}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={sending}>{sending ? 'Đang gửi…' : 'Gửi cho admin'}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
