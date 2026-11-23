'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldIcon } from '@/components/icons';
import {
  adminCategories,
  adminCreateCategory,
  adminDeleteCategory,
  adminUpdateCategory,
  getAdminToken,
  isAuthError,
  type AdminCategory,
  type AdminCategoryGroup,
  type AdminCategoryInput,
} from '@/lib/api';

type Draft = {
  parentCategoryId: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
};

const blankDraft: Draft = {
  parentCategoryId: '',
  name: '',
  slug: '',
  description: '',
  icon: 'book-open',
  sortOrder: '0',
  isActive: true,
};

export default function AdminCategoriesPage() {
  const [groups, setGroups] = useState<AdminCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await adminCategories();
      setGroups(result.groups);
      setError('');
    } catch (loadError) {
      if (isAuthError(loadError)) setAuthRequired(true);
      else setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh mục.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate(parentCategoryId = '') {
    setEditing(null);
    setDraft({ ...blankDraft, parentCategoryId });
    setMessage('');
  }

  function startEdit(category: AdminCategory) {
    setEditing(category);
    setDraft({
      parentCategoryId: category.parent_category_id ? String(category.parent_category_id) : '',
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      icon: category.icon ?? '',
      sortOrder: String(category.sort_order),
      isActive: Boolean(category.is_active),
    });
    setMessage('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const input: AdminCategoryInput = {
      parentCategoryId: draft.parentCategoryId ? Number(draft.parentCategoryId) : null,
      name: draft.name.trim(),
      slug: draft.slug.trim() || undefined,
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
      isActive: draft.isActive,
    };
    setSaving(true);
    setMessage('');
    try {
      if (editing) await adminUpdateCategory(editing.category_id, input);
      else await adminCreateCategory(input);
      setMessage(editing ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.');
      setEditing(null);
      setDraft(blankDraft);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu danh mục.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: AdminCategory) {
    try {
      await adminUpdateCategory(category.category_id, { isActive: !category.is_active });
      setMessage(category.is_active ? 'Đã ẩn danh mục.' : 'Đã hiện danh mục.');
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Không thể đổi trạng thái.');
    }
  }

  async function remove(category: AdminCategory) {
    if (!window.confirm(`Xoá "${category.name}"? Chỉ xoá được khi chưa có sách hoặc thể loại con.`)) return;
    try {
      await adminDeleteCategory(category.category_id);
      setMessage('Đã xoá danh mục.');
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không thể xoá danh mục.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (authRequired) {
    return (
      <EmptyState
        icon={<ShieldIcon className="h-6 w-6" />}
        title="Cần đăng nhập quản trị"
        description="Phiên quản trị đã hết hạn hoặc chưa đăng nhập."
        action={
          <Link
            href="/admin/login"
            className="focus-ring inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Đăng nhập quản trị
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Danh mục sách</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            8 nhóm lớn · {groups.reduce((total, group) => total + group.children.length, 0)} thể loại.
            Ẩn danh mục thay vì xoá khi đã có sách sử dụng.
          </p>
        </div>
        <Button type="button" onClick={() => startCreate('')}>
          Thêm nhóm
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-3">
          {groups.length === 0 ? (
            <EmptyState
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Chưa có danh mục"
              description="Thêm nhóm đầu tiên ở biểu mẫu bên phải."
            />
          ) : (
            groups.map((group) => (
              <Card key={group.category_id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg text-foreground">{group.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          group.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {group.is_active ? 'Đang hiện' : 'Đang ẩn'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {group.children.length} thể loại
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => startCreate(String(group.category_id))}>
                      Thêm thể loại
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(group)}>
                      Sửa
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void toggleActive(group)}>
                      {group.is_active ? 'Ẩn' : 'Hiện'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void remove(group)}>
                      Xoá
                    </Button>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {group.children.map((category) => (
                    <div
                      key={category.category_id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {category.name}
                          {!category.is_active ? (
                            <span className="ml-2 text-[10px] text-muted-foreground">(ẩn)</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          /{category.slug} · {category.usage_count ?? 0} sách sử dụng
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void toggleActive(category)}>
                          {category.is_active ? 'Ẩn' : 'Hiện'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void remove(category)}>
                          Xoá
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="h-fit p-4 xl:sticky xl:top-20">
          <h2 className="font-serif text-lg text-foreground">
            {editing ? 'Sửa danh mục' : draft.parentCategoryId ? 'Thêm thể loại' : 'Thêm nhóm'}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Nhóm có 0 thể loại con; thể loại phải thuộc một nhóm.
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="admin-category-parent">Thuộc nhóm</Label>
              <Select
                id="admin-category-parent"
                value={draft.parentCategoryId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, parentCategoryId: event.target.value }))
                }
              >
                <option value="">— Đây là nhóm lớn —</option>
                {groups.map((group) => (
                  <option key={group.category_id} value={group.category_id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="admin-category-name">Tên</Label>
              <Input
                id="admin-category-name"
                value={draft.name}
                required
                maxLength={150}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-category-slug">Slug</Label>
              <Input
                id="admin-category-slug"
                value={draft.slug}
                maxLength={150}
                placeholder="Tự tạo từ tên nếu để trống"
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-category-description">Mô tả</Label>
              <Textarea
                id="admin-category-description"
                value={draft.description}
                className="min-h-20"
                maxLength={1000}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="admin-category-icon">Icon</Label>
                <Input
                  id="admin-category-icon"
                  value={draft.icon}
                  maxLength={50}
                  onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="admin-category-order">Thứ tự</Label>
                <Input
                  id="admin-category-order"
                  type="number"
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Đang hiển thị
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !draft.name.trim()}>
                {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm danh mục'}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setDraft(blankDraft);
                  }}
                >
                  Hủy
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
