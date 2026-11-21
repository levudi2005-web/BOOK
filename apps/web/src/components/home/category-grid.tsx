'use client';

import { useEffect, useState } from 'react';
import { fetchCategories, type ApiCategory } from '@/lib/api';
import { CategoryCard } from '@/components/home/category-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BookIcon } from '@/components/icons';

export function CategoryGrid() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((response) => {
        if (active) setCategories(response.data);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl" />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((category) => (
        <CategoryCard key={category.category_id} category={category} />
      ))}
    </div>
  );
}
