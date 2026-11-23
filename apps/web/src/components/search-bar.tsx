'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SearchIcon } from '@/components/icons';

export function SearchBar({
  large = false,
  inputId,
  onSearch,
}: {
  large?: boolean;
  inputId?: string;
  /** When provided, search stays on the current page instead of routing to /search. */
  onSearch?: (value: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (onSearch) {
      onSearch(value);
      return;
    }
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex w-full items-center gap-1.5 rounded-full border border-border bg-card transition focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 ${
        large ? 'h-11 p-1' : 'h-9 p-0.5'
      }`}
    >
      <SearchIcon className="ml-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm sách, tác giả, danh mục…"
        aria-label="Tìm kiếm"
        className="focus-ring h-full min-w-0 flex-1 bg-transparent px-1 text-[13px] text-foreground placeholder:text-muted-foreground/70"
      />
      <button
        type="submit"
        className="focus-ring hidden h-8 shrink-0 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 sm:inline-flex"
      >
        Tìm kiếm
      </button>
    </form>
  );
}
