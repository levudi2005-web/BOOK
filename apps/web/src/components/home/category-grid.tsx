'use client';

import { useEffect, useState } from 'react';
import { fetchCategories } from '@/lib/api';
import { CategoryCard, type CategoryCardData } from '@/components/home/category-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BookIcon } from '@/components/icons';

export function CategoryGrid() {
  const [categories, setCategories] = useState<CategoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((response) => {
        if (!active) return;
        if (response.groups.length > 0) {
          setCategories(
            response.groups.map((group) => ({
              name: group.name,
              slug: group.slug,
              description: group.description,
              icon: group.icon,
              childrenCount: group.children.length,
              href: `/discover?group=${group.slug}`,
            })),
          );
        } else {
          setCategories(
            response.data.map((category) => ({
              name: category.name,
              slug: category.slug,
              description: category.description,
              icon: category.icon,
            })),
          );
        }
      })
      .catch(() => {
        if (active) setError('Không thể tải danh mục.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<BookIcon className="h-6 w-6" />} title="Lỗi tải danh mục" description={error} />;
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<BookIcon className="h-6 w-6" />}
        title="Chưa có danh mục"
        description="Danh mục sách sẽ hiển thị tại đây khi được thêm vào hệ thống."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} />
      ))}
    </div>
  );
}
