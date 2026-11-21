'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/toast';
import {
  completeUpload,
  deleteObject,
  getStorageQuota,
  initUpload,
  listObjects,
  listTrash,
  permanentDeleteObject,
  restoreObject,
  uploadChunk,
  type StorageObject,
  type StorageQuota,
} from '@/lib/api';

const CHUNK_SIZE = 4 * 1024 * 1024;

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export default function StoragePage() {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [trash, setTrash] = useState<StorageObject[]>([]);
  const [tab, setTab] = useState<'files' | 'trash'>('files');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [q, files, trashRes] = await Promise.all([getStorageQuota(), listObjects(), listTrash()]);
      setQuota(q);
      setObjects(files.data);
      setTrash(trashRes.data);
    } catch {
      toast('Không thể tải dữ liệu lưu trữ.', 'default');
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onUpload(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const init = await initUpload(file.name, file.type || 'application/octet-stream', file.size);
      for (let index = 0; index < init.chunkCount; index += 1) {
        const blob = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE));
        const arrayBuffer = await blob.arrayBuffer();
        await uploadChunk(init.sessionUuid, index, bytesToBase64(arrayBuffer));
        setProgress(Math.round(((index + 1) / init.chunkCount) * 100));
      }
      await completeUpload(init.sessionUuid);
      toast('Đã tải lên thành công.', 'default');
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Tải lên thất bại.', 'default');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onDelete(uuid: string) {
    try {
      await deleteObject(uuid);
      toast('Đã chuyển vào thùng rác.', 'default');
      await refresh();
    } catch {
      toast('Không thể xóa file.', 'default');
    }
  }

  async function onRestore(uuid: string) {
    try {
      await restoreObject(uuid);
      toast('Đã khôi phục file.', 'default');
      await refresh();
    } catch {
      toast('Không thể khôi phục file.', 'default');
    }
  }

  async function onPermanentDelete(uuid: string) {
    try {
      await permanentDeleteObject(uuid);
      toast('Đã xóa vĩnh viễn.', 'default');
      await refresh();
    } catch {
      toast('Không thể xóa vĩnh viễn.', 'default');
    }
  }

  const usedPct = quota ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100)) : 0;

  return (
    <div className="container-site py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Bộ nhớ của tôi</h1>
          <p className="text-sm text-muted-foreground">Lưu trữ cá nhân trong SQL, hạn mức 400 MiB.</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? `Đang tải ${progress}%…` : 'Tải file lên'}
        </Button>
      </div>

      {quota ? (
        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Đã dùng {formatBytes(quota.usedBytes)} / {formatBytes(quota.quotaBytes)}</span>
            <span className="text-muted-foreground">{usedPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usedPct}%` }} />
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab('files')} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === 'files' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          Tệp ({objects.length})
        </button>
        <button type="button" onClick={() => setTab('trash')} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === 'trash' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
          Thùng rác ({trash.length})
        </button>
      </div>

      <div className="grid gap-3">
        {(tab === 'files' ? objects : trash).length === 0 ? (
          <p className="text-sm text-muted-foreground">{tab === 'files' ? 'Chưa có tệp nào.' : 'Thùng rác trống.'}</p>
        ) : null}
        {(tab === 'files' ? objects : trash).map((obj) => (
          <Card key={obj.objectUuid} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{obj.filename}</p>
              <p className="text-xs text-muted-foreground">{obj.mimeType} · {formatBytes(obj.sizeBytes)} · {obj.status}</p>
            </div>
            <div className="flex gap-2">
              {tab === 'files' ? (
                <>
                  <a href={`${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/storage/objects/${obj.objectUuid}/download`} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm text-foreground hover:bg-surface">
                    Tải về
                  </a>
                  <Button variant="outline" onClick={() => onDelete(obj.objectUuid)}>Xóa</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onRestore(obj.objectUuid)}>Khôi phục</Button>
                  <Button variant="danger" onClick={() => onPermanentDelete(obj.objectUuid)}>Xóa vĩnh viễn</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

