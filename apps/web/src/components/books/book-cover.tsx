'use client';

import { useCallback, useEffect, useState } from 'react';
import { downloadStorageObject, publicCoverUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

type CoverState = 'empty' | 'loading' | 'ready' | 'error';

export type BookCoverProps = {
  title: string;
  subtitle?: string | null;
  authorName?: string | null;
  /** Public catalog slug, required for the public cover endpoint. */
  slug?: string | null;
  /** `books.cover_storage_key` / `coverStorageKey` — the storage object uuid. */
  coverKey?: string | null;
  /** Set for books the current user owns (enables the owner-only cover route). */
  ownerBookUuid?: string | null;
  /** Known publication visibility. `undefined` = try the public route first. */
  isPublic?: boolean;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  showSpine?: boolean;
  placeholderLabel?: string;
  /** Gradient-only placeholder for tiny thumbnails (search rows, etc.). */
  minimal?: boolean;
  /** Overrides the default `Bìa sách <title>` alt text. */
  alt?: string;
};

const palettes = [
  ['#245B5C', '#4CCFD0'],
  ['#0F3D3E', '#8DE8E8'],
  ['#2E6F70', '#4CCFD0'],
  ['#163B3C', '#6FDEDE'],
  ['#3B7C7D', '#8DE8E8'],
  ['#1B4A4B', '#A5F0F0'],
];

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function paletteFor(seed: string): [string, string] {
  const palette = palettes[hash(seed) % palettes.length];
  return [palette[0], palette[1]];
}


/**
 * Single source of truth for rendering a book cover.
 *
 * 1. public book   -> `GET /books/:slug/cover?v=<coverKey>`
 * 2. owner-only    -> `GET /studio/books/:bookUuid/cover` (Bearer auth, blob)
 * 3. missing/broken-> designed placeholder labelled "Bìa thay thế"
 *
 * `?v=` is the storage key, so a replaced cover gets a brand new URL and the
 * browser/CDN can never serve the previous image.
 */
export function BookCover({
  title,
  subtitle,
  authorName,
  slug,
  coverKey,
  ownerBookUuid,
  isPublic,
  className,
  imgClassName,
  priority = false,
  showSpine = true,
  placeholderLabel = 'Bìa thay thế',
  minimal = false,
  alt,
}: BookCoverProps) {
  const [state, setState] = useState<CoverState>('empty');
  const [src, setSrc] = useState('');
  const [publicFailed, setPublicFailed] = useState(false);

  const preferOwnerStream = Boolean(coverKey && ownerBookUuid && isPublic === false);
  const canUsePublicRoute = Boolean(coverKey && slug && isPublic !== false);

  useEffect(() => {
    setPublicFailed(false);
  }, [coverKey, slug]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!coverKey) {
      setSrc('');
      setState('empty');
      return undefined;
    }

    if (preferOwnerStream && ownerBookUuid) {
      setState('loading');
      downloadStorageObject(coverKey)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (active) {
            setSrc(objectUrl);
            setState('ready');
          }
        })
        .catch(() => {
          if (active) {
            setSrc('');
            setState('error');
          }
        });
      return () => {
        active = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    if (canUsePublicRoute && slug) {
      setSrc(publicCoverUrl(slug, coverKey));
      setState('loading');
      return undefined;
    }

    setSrc('');
    setState('empty');
    return undefined;
  }, [coverKey, slug, ownerBookUuid, preferOwnerStream, canUsePublicRoute]);

  const fallbackToOwnerStream = useCallback(() => {
    if (!coverKey || !ownerBookUuid || publicFailed) {
      setSrc('');
      setState('error');
      return;
    }
    setPublicFailed(true);
    downloadStorageObject(coverKey)
      .then((blob) => {
        setSrc(URL.createObjectURL(blob));
        setState('ready');
      })
      .catch(() => {
        setSrc('');
        setState('error');
      });
  }, [coverKey, ownerBookUuid, publicFailed]);

  const [from, to] = paletteFor(slug || title);
  const showImage = Boolean(src) && state !== 'error';
  const showPlaceholder = !showImage;

  return (
    <div className={cn('relative isolate aspect-[2/3] overflow-hidden rounded-md bg-surface shadow-soft', className)}>
      {showPlaceholder ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-2 py-3 text-center"
          style={{ background: `linear-gradient(155deg, ${from} 0%, ${to} 100%)` }}
          role={coverKey ? 'img' : undefined}
          aria-label={coverKey ? `Bìa sách ${title}` : undefined}
          aria-hidden={coverKey ? undefined : true}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background:
                'repeating-linear-gradient(115deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 1px, transparent 1px, transparent 9px)',
            }}
          />
          <span className="pointer-events-none absolute inset-y-0 left-0 w-[6px] bg-black/25" />
          <span className="pointer-events-none absolute inset-1 rounded-[4px] border border-white/20" />
          {!minimal ? (
            <>
              <span className="relative line-clamp-4 pb-0.5 text-[clamp(0.65rem,0.7vw+0.45rem,1rem)] font-semibold leading-normal text-white">
                {title}
              </span>
              {subtitle ? (
                <span className="relative mt-1 line-clamp-2 leading-normal text-[0.5rem] uppercase tracking-[0.08em] text-white/65">
                  {subtitle}
                </span>
              ) : null}
              {authorName ? <span className="relative mt-1.5 text-[0.55rem] text-white/75">{authorName}</span> : null}
              {placeholderLabel ? (
                <span className="relative mt-2 rounded-full border border-white/30 px-1.5 py-[1px] text-[0.42rem] uppercase tracking-[0.12em] text-white/70">
                  {placeholderLabel}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {showImage ? (
        <img
          src={src}
          alt={alt ?? `Bìa sách ${title}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setState('ready')}
          onError={fallbackToOwnerStream}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            state === 'ready' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      ) : null}

      {state === 'loading' ? (
        <span className="pointer-events-none absolute inset-0 animate-pulse bg-surface/70" aria-hidden />
      ) : null}

      {showSpine && showImage ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-[5px] bg-gradient-to-r from-black/35 to-transparent" />
      ) : null}
    </div>
  );
}
