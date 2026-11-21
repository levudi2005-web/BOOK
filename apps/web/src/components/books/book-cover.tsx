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
  /** Overrides the default `Bìa sách <title>` alt text. */
  alt?: string;
};

const palettes = [
  ['#12352c', '#2f6b56'],
  ['#3d2b22', '#7a5340'],
  ['#1f2a44', '#3f5b8c'],
  ['#3a2438', '#6d4368'],
  ['#243027', '#4d6b4a'],
  ['#402b2b', '#7d4c46'],
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
    <div className={cn('relative isolate aspect-[2/3] overflow-hidden rounded-lg bg-surface shadow-soft', className)}>
      {showPlaceholder ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-3 py-4 text-center"
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
          <span className="relative line-clamp-4 font-serif text-[clamp(0.8rem,1.1vw+0.5rem,1.35rem)] leading-snug text-white">
            {title}
          </span>
          {subtitle ? (
            <span className="relative mt-1.5 line-clamp-2 text-[0.62rem] uppercase tracking-[0.14em] text-white/60">
              {subtitle}
            </span>
          ) : null}
          {authorName ? <span className="relative mt-2 text-[0.65rem] text-white/75">{authorName}</span> : null}
          <span className="relative mt-3 rounded-full border border-white/30 px-2 py-[2px] text-[0.5rem] uppercase tracking-[0.18em] text-white/70">
            {placeholderLabel}
          </span>
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
