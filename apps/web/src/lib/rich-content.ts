'use client';

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'em', 'h1', 'h2', 'h3', 'hr', 'img', 'li', 'ol',
  'p', 's', 'span', 'strong', 'strike', 'table', 'tbody', 'td', 'th', 'thead',
  'tr', 'u', 'ul',
];

const ALLOWED_ATTR = [
  'alt', 'class', 'colspan', 'data-storage-uuid', 'height', 'href', 'rel',
  'rowspan', 'src', 'start', 'style', 'target', 'title', 'width',
];

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeRichContent(content: string): string {
  if (!content.trim()) return '<p></p>';
  if (/<\/?[a-z][^>]*>/i.test(content)) return sanitizeRichHtml(content) || '<p></p>';

  return `<p>${escapeHtml(content).replace(/\r\n?|\n/g, '<br>')}</p>`;
}
