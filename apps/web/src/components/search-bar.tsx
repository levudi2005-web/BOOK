'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SearchIcon } from '@/components/icons';

export function SearchBar({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex w-full items-center gap-2 rounded-full border border-border bg-card shadow-soft transition focus-within:border-ring ${
        large ? 'h-14 p-1.5' : 'h-12 p-1'
      }`}
    >
      <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm sách, tác giả, danh mục…"
        aria-label="Tìm kiếm"
        className="focus-ring h-full min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground/70"
      />
      <button
        type="submit"
        className="focus-ring hidden h-full shrink-0 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:inline-flex"
      >
        Tìm kiếm
      </button>
    </form>
  );
}
