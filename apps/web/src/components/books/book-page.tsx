import type { CSSProperties, ReactNode } from 'react';
import type { BookLayout } from '@/lib/api';
import { pageFrameStyle, pageTextureStyle } from '@/lib/book-layout';
import { cn } from '@/lib/utils';

type BookPageProps = {
  layout: BookLayout;
  children: ReactNode;
  pageNumber?: number;
  totalPages?: number;
  maxWidth?: number;
  className?: string;
  contentClassName?: string;
  animate?: boolean;
};

/**
 * Khung trang sách dùng chung cho Author Studio, xem trước và trình đọc.
 * Kích thước lấy trực tiếp từ layout người dùng đã đặt (mm).
 */
export function BookPage({
  layout,
  children,
  pageNumber,
  totalPages,
  maxWidth = 720,
  className,
  contentClassName,
  animate = false,
}: BookPageProps) {
  const texture = pageTextureStyle(layout);
  const style: CSSProperties = {
    ...pageFrameStyle(layout, maxWidth),
    ...texture,
    backgroundColor: '#fffdf8',
    boxShadow:
      layout.pageEffect === 'web'
        ? '0 0 0 1px rgba(15,23,42,.08)'
        : '0 18px 55px rgba(15,23,42,.18), 0 2px 0 rgba(255,255,255,.8) inset',
  };

  return (
    <div
      data-page-effect={layout.pageEffect}
      className={cn(
        'relative mx-auto overflow-hidden rounded-[3px] border border-black/10 text-[#29251f]',
        animate && layout.pageEffect === 'flip' ? 'book-page-animate' : '',
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          'relative z-10 flex h-full min-h-0 flex-col px-[9%] pb-[12%] pt-[9%]',
          contentClassName,
        )}
      >
        <div className="book-page-content min-h-0 flex-1 overflow-hidden break-words font-serif leading-[1.85]">
          {children}
        </div>
        {layout.showPageNumbers && pageNumber ? (
          <div className="pointer-events-none mt-2 flex items-center justify-center gap-2 text-[10px] tracking-[0.18em] text-[#857968]">
            <span>{pageNumber}</span>
            {totalPages ? <span className="opacity-50">/ {totalPages}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
