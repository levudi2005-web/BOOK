'use client';

import { useTheme } from '@/components/theme-provider';
import { MoonIcon, SunIcon } from '@/components/icons';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:bg-surface active:scale-95"
    >
      {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
