'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryPicker } from '@/components/categories/category-picker';
import { BookIcon } from '@/components/icons';
import { useToast } from '@/components/toast';
import {
  fetchCategories,
  getReadingPreferences,
  isAuthError,
  updateReadingPreferences,
  type CategoryGroup,
} from '@/lib/api';

export default function PreferencesPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCategories(), getReadingPreferences()])
      .then(([categoryResponse, preferenceResponse]) => {
        if (!active) return;
        setGroups(categoryResponse.groups);
        setSelected(preferenceResponse.categorySlugs);
      })
      .catch((error) => {
        if (active && isAuthError(error)) setAuthRequired(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const result = await updateReadingPreferences(selected);
      setSelected(result.categorySlugs);
      toast('Đã lưu sở thích đọc sách.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể lưu sở thích.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-80" />
        <Skeleton className="mt-8 h-72 rounded-2xl" />
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="container-site py-16">
        <EmptyState
          icon={<BookIcon className="h-6 w-6" />}
          title="Đăng nhập để chọn sở thích đọc"
          description="Sở thích đọc được lưu theo tài khoản để gợi ý sách phù hợp hơn."
          action={
            <Link
              href="/auth/login"
              className="focus-ring inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Đăng nhập
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-site max-w-4xl py-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">Sở thích đọc sách</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn các thể loại bạn quan tâm. Hệ thống dùng thông tin này để gợi ý và sắp xếp nội dung phù hợp.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <CategoryPicker
          idPrefix="preference-category"
          groups={groups.map((group) => ({
            id: group.category_id,
            name: group.name,
            slug: group.slug,
            description: group.description,
            icon: group.icon,
            children: group.children.map((child) => ({
              id: child.category_id,
              name: child.name,
              slug: child.slug,
              description: child.description,
              icon: child.icon,
            })),
          }))}
          selected={selected}
          valueKey="slug"
          onChange={setSelected}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu sở thích'}
          </Button>
          <Link
            href={selected.length > 0 ? `/discover?categories=${encodeURIComponent(selected.join(','))}` : '/discover'}
            className="focus-ring inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Xem sách theo sở thích
          </Link>
        </div>
      </Card>
    </div>
  );
}
