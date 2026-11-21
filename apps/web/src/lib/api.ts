import {
  ApiConfigurationError,
  currentHostname,
  joinApiUrl,
  normalizeApiBase,
  resolveApiBaseStatus,
} from './api-url';

/**
 * Single source of truth for the API base URL. `NEXT_PUBLIC_API_URL` is inlined
 * at build time; see `lib/api-url.ts` for why a Cloudflare Worker var alone is
 * not enough to configure the browser bundle.
 */
const base = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

/** Builds an API URL from the configured base (also used for plain links). */
export function apiUrl(path: string): string {
  return joinApiUrl(base, path);
}

function assertApiBaseReachable(): void {
  const status = resolveApiBaseStatus(process.env.NEXT_PUBLIC_API_URL, { hostname: currentHostname() });
  if (status.misrouted) {
    throw new ApiConfigurationError(status.message ?? 'API base URL is not configured for this deployment.');
  }
}

export class ApiError extends Error {
  /** HTTP status code returned by the API (0 when the response had no status). */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function parseJsonBody(text: string, response: Response, url: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const contentType = response.headers.get('content-type') ?? 'unknown';
    throw new ApiError(
      `API trả về dữ liệu không phải JSON (HTTP ${response.status}, content-type: ${contentType}) từ ${url}. ` +
        'Kiểm tra NEXT_PUBLIC_API_URL của bản build.',
      response.status,
    );
  }
}

export type ApiBook = {
  book_uuid: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  excerpt?: string | null;
  language: string;
  publication_date: string | null;
  page_count: number | null;
  word_count: number | null;
  cover_storage_key: string | null;
  cover_mime_type?: string | null;
  average_rating: string | number;
  rating_count: number;
  review_count?: number;
  view_count: number;
  download_count: number;
  published_at: string | null;
  author_name: string | null;
  publisher_name: string | null;
  publication_year: number | null;
};

export type ApiCategory = {
  category_id: number;
  parent_category_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: number;
};

export type ApiAuthor = {
  author_id: number;
  author_uuid: string;
  name: string;
  slug: string;
  bio: string | null;
};

export type ApiPublisher = {
  publisher_id: number;
  name: string;
  slug: string;
  description: string | null;
};

export type BookListResponse = {
  data: ApiBook[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type BookDetail = ApiBook & {
  authors: Pick<ApiAuthor, 'author_id' | 'author_uuid' | 'name' | 'slug'>[];
  categories: Pick<ApiCategory, 'category_id' | 'name' | 'slug'>[];
};

export type BookQuery = {
  q?: string;
  category?: string;
  author?: string;
  publisher?: string;
  year?: string;
  sort?: 'newest' | 'popular' | 'rating' | 'title';
  page?: number;
  limit?: number;
};

async function get<T>(path: string): Promise<T> {
  const url = apiUrl(path);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return parseJsonBody(await response.text(), response, url) as T;
}

export async function fetchBooks(query: BookQuery = {}): Promise<BookListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.author) params.set('author', query.author);
  if (query.publisher) params.set('publisher', query.publisher);
  if (query.year) params.set('year', query.year);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return get<BookListResponse>(`/books?${params.toString()}`);
}

export async function fetchBook(slug: string): Promise<BookDetail> {
  return get<BookDetail>(`/books/${encodeURIComponent(slug)}`);
}

export type Chapter = {
  chapter_uuid: string;
  chapter_number: number;
  title: string;
  content: string | null;
  word_count: number;
  sort_order: number;
};

export async function fetchBookChapters(slug: string): Promise<{ data: Chapter[] }> {
  return get<{ data: Chapter[] }>(`/books/${encodeURIComponent(slug)}/chapters`);
}

export async function fetchCategories(): Promise<{ data: ApiCategory[] }> {
  return get<{ data: ApiCategory[] }>('/categories');
}

export async function fetchAuthors(): Promise<{ data: ApiAuthor[] }> {
  return get<{ data: ApiAuthor[] }>('/authors');
}

export async function fetchPublishers(): Promise<{ data: ApiPublisher[] }> {
  return get<{ data: ApiPublisher[] }>('/publishers');
}

// ---------------------------------------------------------------------------
// Auth / session (opaque bearer token)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'bff_access_token';
const ACCESS_TOKEN_CHANGE_EVENT = 'bff:access-token-change';
const AUTH_REQUESTS_THAT_MAY_REJECT_CREDENTIALS = new Set([
  '/auth/register',
  '/auth/login',
  '/auth/reset-password',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/email/verification/confirm',
  '/auth/change-password',
  '/auth/security-key/rotate',
  '/admin/auth/login',
]);

export function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}

export function subscribeToAccessTokenChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ACCESS_TOKEN_CHANGE_EVENT, listener);
  return () => window.removeEventListener(ACCESS_TOKEN_CHANGE_EVENT, listener);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(ACCESS_TOKEN_CHANGE_EVENT));
}

type AuthRegisterResponse = { status: string; userId: number; recoveryKey: string };
type AuthLoginResponse = { accessToken: string; expiresAt: string; userId: number };

function apiErrorMessage(data: unknown, response: Response): string {
  const message = (data as { message?: string | string[] } | null)?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? `Request failed: ${response.status}`);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  assertApiBaseReachable();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const url = apiUrl(path);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  const responseText = await response.text();
  if (
    response.status === 401 &&
    token &&
    getAccessToken() === token &&
    !AUTH_REQUESTS_THAT_MAY_REJECT_CREDENTIALS.has(path)
  ) {
    setAccessToken('');
  }
  const data = parseJsonBody(responseText, response, url);
  if (!response.ok) {
    throw new ApiError(apiErrorMessage(data, response), response.status);
  }
  return data as T;
}

export async function register(username: string, email: string, password: string): Promise<AuthRegisterResponse> {
  return request<AuthRegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(identifier: string, password: string): Promise<AuthLoginResponse> {
  return request<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    // Always drop the local session, even when the server call fails.
    setAccessToken('');
  }
}

// ---------------------------------------------------------------------------
// Storage (SQL Cloud Storage, 400 MiB/user)
// ---------------------------------------------------------------------------

export type StorageQuota = {
  quotaBytes: number;
  usedBytes: number;
  reservedBytes: number;
  availableBytes: number;
  usagePercent: number;
  warningLevel: number;
};

export type StorageObject = {
  objectUuid: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  status: string;
  checksumSha256: string | null;
};

export async function getStorageQuota(): Promise<StorageQuota> {
  return request<StorageQuota>('/storage/quota');
}

export async function initUpload(filename: string, mimeType: string, totalBytes: number): Promise<{ objectUuid: string; sessionUuid: string; chunkSize: number; chunkCount: number }> {
  return request('/storage/objects', { method: 'POST', body: JSON.stringify({ filename, mimeType, totalBytes }) });
}

export async function uploadChunk(sessionUuid: string, chunkIndex: number, data: string): Promise<{ chunkIndex: number; sizeBytes: number }> {
  return request(`/storage/objects/${sessionUuid}/chunks`, { method: 'POST', body: JSON.stringify({ chunkIndex, data }) });
}

export async function completeUpload(sessionUuid: string): Promise<StorageObject> {
  return request(`/storage/objects/${sessionUuid}/complete`, { method: 'POST' });
}

export async function cancelUpload(sessionUuid: string): Promise<{ status: string }> {
  return request(`/storage/objects/${sessionUuid}/cancel`, { method: 'POST' });
}

export async function listObjects(): Promise<{ data: StorageObject[] }> {
  return request('/storage/objects');
}

export async function deleteObject(objectUuid: string): Promise<{ status: string }> {
  return request(`/storage/objects/${objectUuid}`, { method: 'DELETE' });
}

/**
 * Downloads a stored object with the bearer session. An `<a href>` cannot send
 * the Authorization header, so the binary is fetched and handed to the browser
 * as a blob instead of exposing an unauthenticated URL.
 */
export async function downloadStorageObject(objectUuid: string): Promise<Blob> {
  assertApiBaseReachable();
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const url = apiUrl(`/storage/objects/${encodeURIComponent(objectUuid)}/download`);
  const response = await fetch(url, { headers, cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed: ${response.status}`;
    try {
      const data = JSON.parse(text) as { message?: string | string[] };
      const parsed = data?.message;
      if (Array.isArray(parsed)) message = parsed.join(', ');
      else if (parsed) message = parsed;
    } catch {
      // Non-JSON error body (e.g. an HTML page) — keep the generic message.
    }
    if (response.status === 401 && token && getAccessToken() === token) {
      setAccessToken('');
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

// ---------------------------------------------------------------------------
// Author Studio
// ---------------------------------------------------------------------------

export type StudioBook = {
  bookUuid: string;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  language: string;
  status: string;
  visibility: string;
  publicationScope: string;
  authorName: string | null;
  publisherName: string | null;
  publicationYear: number | null;
  coverStorageKey?: string | null;
  publishedAt: string | null;
};

export type StudioChapter = {
  chapterUuid: string;
  chapterNumber: number;
  title: string;
  content: string | null;
  wordCount: number;
  sortOrder: number;
  status: string;
};

export type StudioBookDetail = StudioBook & {
  chapters: StudioChapter[];
  categories: StudioCategory[];
  tags: string[];
  coverStorageKey?: string | null;
  coverMimeType?: string | null;
};

export type StudioCategory = {
  categoryId: number;
  name: string;
  slug: string;
  parentCategoryId?: number | null;
};

export type StudioVersionDetail = {
  versionNumber: number;
  snapshot: string | null;
};

export type StudioVersion = {
  version_number: number;
  title: string;
  word_count: number;
  created_at: string;
};

export type StudioBookInput = {
  title?: string;
  subtitle?: string;
  description?: string;
  language?: string;
  authorName?: string;
  publisherName?: string;
  publicationYear?: number;
};

export async function listMyBooks(): Promise<{ data: StudioBook[] }> {
  return request('/studio/books');
}

export async function createBook(input: StudioBookInput & { title: string }): Promise<StudioBookDetail> {
  return request('/studio/books', { method: 'POST', body: JSON.stringify(input) });
}

export async function getStudioBook(bookUuid: string): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}`);
}

export async function updateStudioBook(bookUuid: string, input: StudioBookInput): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteStudioBook(bookUuid: string): Promise<{ status: string }> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}`, { method: 'DELETE' });
}

export async function createChapter(
  bookUuid: string,
  input: { title: string; content?: string },
): Promise<{ chapterUuid: string; chapterId: number; wordCount: number }> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/chapters`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateChapter(
  chapterUuid: string,
  input: { title?: string; content?: string },
): Promise<{ chapterUuid: string; wordCount: number }> {
  return request(`/studio/chapters/${encodeURIComponent(chapterUuid)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteChapter(chapterUuid: string): Promise<{ status: string }> {
  return request(`/studio/chapters/${encodeURIComponent(chapterUuid)}`, { method: 'DELETE' });
}

export async function reorderChapters(bookUuid: string, orderedUuids: string[]): Promise<{ status: string }> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/chapters/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedUuids }),
  });
}

export async function publishBook(
  bookUuid: string,
  input: { scope: 'private' | 'community'; authorName: string; publisherName?: string; publicationYear: number },
): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listBookVersions(bookUuid: string): Promise<{ data: StudioVersion[] }> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/versions`);
}

export async function getBookVersion(bookUuid: string, versionNumber: number): Promise<StudioVersionDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/versions/${versionNumber}`);
}

export async function restoreBookVersion(
  bookUuid: string,
  versionNumber: number,
): Promise<{ restoredChapters: number; skippedChapters: number; book: StudioBookDetail }> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/versions/${versionNumber}/restore`, {
    method: 'POST',
  });
}

export async function unpublishBook(bookUuid: string): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/unpublish`, { method: 'POST' });
}

export async function listStudioCategories(): Promise<{ data: StudioCategory[] }> {
  return request('/studio/categories');
}

export async function setStudioCategories(bookUuid: string, categoryIds: number[]): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/categories`, {
    method: 'PUT',
    body: JSON.stringify({ categoryIds }),
  });
}

export async function setStudioTags(bookUuid: string, tags: string[]): Promise<StudioBookDetail> {
  return request(`/studio/books/${encodeURIComponent(bookUuid)}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags }),
  });
}

// ---------------------------------------------------------------------------
// Office Documents (writer)
// ---------------------------------------------------------------------------

export type OfficeDocument = {
  documentUuid: string;
  title: string;
  kind: string;
  wordCount: number;
  updatedAt: string;
};

export async function listDocuments(): Promise<{ data: OfficeDocument[] }> {
  return request('/documents');
}

export async function createDocument(title: string): Promise<{ documentUuid: string; title: string }> {
  return request('/documents', { method: 'POST', body: JSON.stringify({ title, kind: 'writer' }) });
}

export async function updateDocument(documentUuid: string, input: { title?: string; content?: unknown }): Promise<{ wordCount: number }> {
  return request(`/documents/${documentUuid}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function getDocument(documentUuid: string): Promise<OfficeDocument & { content: unknown }> {
  return request(`/documents/${documentUuid}`);
}

export async function deleteDocument(documentUuid: string): Promise<{ status: string }> {
  return request(`/documents/${documentUuid}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_KEY = 'bff_admin_token';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  assertApiBaseReachable();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const token = getAdminToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const url = apiUrl(path);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  const responseText = await response.text();
  if (response.status === 401 && token && getAdminToken() === token) {
    setAdminToken('');
  }
  const data = parseJsonBody(responseText, response, url);
  if (!response.ok) {
    throw new ApiError(apiErrorMessage(data, response), response.status);
  }
  return data as T;
}

export async function adminLogin(identifier: string, password: string): Promise<{ accessToken: string; adminId: number; username: string }> {
  const result = await request<{ accessToken: string; adminId: number; username: string }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setAdminToken(result.accessToken);
  return result;
}

export async function adminMe(): Promise<{ username: string; email: string; roles: string[] }> {
  return adminRequest('/admin/auth/me');
}

// ---------------------------------------------------------------------------
// Cover ảnh bìa (StorageService): upload qua /storage/objects rồi gắn vào sách.
// ---------------------------------------------------------------------------

/** Ảnh bìa công khai — backend chỉ trả khi sách published + public. */
export function publicCoverUrl(slug: string): string {
  return apiUrl(`/books/${encodeURIComponent(slug)}/cover`);
}

export async function setBookCover(bookUuid: string, objectUuid: string): Promise<StudioBookDetail> {
  return request(`/studio/books/${bookUuid}/cover`, {
    method: 'POST',
    body: JSON.stringify({ objectUuid }),
  });
}

export async function removeBookCover(bookUuid: string): Promise<StudioBookDetail> {
  return request(`/studio/books/${bookUuid}/cover`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Reading history
// ---------------------------------------------------------------------------

export type ReadingHistoryItem = {
  history_id: number;
  started_at: string;
  pages_read: number | null;
  book_uuid: string;
  slug: string;
  title: string;
  chapter_uuid: string | null;
  chapter_number: number | null;
  chapter_title: string | null;
};

export async function listHistory(): Promise<{ data: ReadingHistoryItem[] }> {
  return request('/history');
}

// ---------------------------------------------------------------------------
// Comments (edit/delete theo ownership)
// ---------------------------------------------------------------------------

export async function updateComment(commentUuid: string, body: string): Promise<{ commentUuid: string; body: string }> {
  return request(`/comments/${commentUuid}`, { method: 'PATCH', body: JSON.stringify({ body }) });
}

export async function deleteComment(commentUuid: string): Promise<{ status: string }> {
  return request(`/comments/${commentUuid}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Email verification / password reset (SMTP adapter phía backend)
// ---------------------------------------------------------------------------

export async function requestEmailVerification(): Promise<{ status: string; delivery: string }> {
  return request('/auth/email/verification/request', { method: 'POST' });
}

export async function confirmEmailVerification(token: string): Promise<{ status: string }> {
  return request('/auth/email/verification/confirm', { method: 'POST', body: JSON.stringify({ token }) });
}

export async function requestPasswordReset(identifier: string): Promise<{ status: string }> {
  return request('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ identifier }) });
}

export async function resetPassword(token: string, password: string): Promise<{ status: string }> {
  return request('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function changePassword(input: {
  currentPassword: string;
  recoveryKey: string;
  newPassword: string;
}): Promise<{ status: string }> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function resetPasswordWithRecoveryKey(
  identifier: string,
  recoveryKey: string,
  newPassword: string,
): Promise<{ status: string }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ identifier, recoveryKey, newPassword }),
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminListUsers(): Promise<{ data: Array<Record<string, unknown>>; meta: { total: number } }> {
  return adminRequest('/admin/users');
}

export type AdminStats = {
  users: { total: number; active: number };
  books: { total: number; published: number; draft: number };
  comments: number;
  storage: { usedBytes: number; objects: number };
};

export type AdminListMeta = { page: number; limit: number; total: number };

export async function adminStats(): Promise<AdminStats> {
  return adminRequest('/admin/stats');
}

export async function adminUsers(page = 1, limit = 20): Promise<{ data: Array<Record<string, unknown>>; meta: AdminListMeta }> {
  return adminRequest(`/admin/users?page=${page}&limit=${limit}`);
}

export async function adminBooks(page = 1, limit = 20): Promise<{ data: Array<Record<string, unknown>>; meta: AdminListMeta }> {
  return adminRequest(`/admin/books?page=${page}&limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Profile (session-scoped)
// ---------------------------------------------------------------------------

export type MyProfile = {
  userId: number;
  userUuid: string;
  username: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  profile: { displayName: string; bio: string; websiteUrl: string; isPublic: boolean };
  stats: { library: number; reading: number; books: number; comments: number };
};

export async function getMyProfile(): Promise<MyProfile> {
  return request('/me');
}

export async function updateMyProfile(input: {
  displayName?: string;
  bio?: string;
  websiteUrl?: string;
  isPublic?: boolean;
}): Promise<MyProfile> {
  return request('/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function searchBooks(q: string): Promise<{ hits: Array<Record<string, unknown>>; estimatedTotalHits: number }> {
  return request(`/search?q=${encodeURIComponent(q)}`);
}

// ---------------------------------------------------------------------------
// Social (library, progress, comments, reviews)
// ---------------------------------------------------------------------------

export type LibraryItem = {
  book_uuid: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_storage_key: string | null;
  status: string;
  isFavorite: boolean;
  added_at: string;
  last_opened_at: string | null;
  finished_at: string | null;
};

export async function listLibrary(): Promise<{ data: LibraryItem[] }> {
  return request('/library');
}

export async function addToLibrary(slug: string): Promise<{ status: string }> {
  return request(`/library/${slug}`, { method: 'POST' });
}

export async function updateLibrary(slug: string, input: { status?: string; isFavorite?: boolean }): Promise<{ status: string }> {
  return request(`/library/${slug}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function removeFromLibrary(slug: string): Promise<{ status: string }> {
  return request(`/library/${slug}`, { method: 'DELETE' });
}

export async function getProgress(slug: string): Promise<{
  percentComplete: number;
  isCompleted: boolean;
  chapterUuid: string | null;
}> {
  return request(`/progress/${slug}`);
}

export async function saveProgress(slug: string, input: { percentComplete?: number; isCompleted?: boolean; chapterId?: number; chapterUuid?: string }): Promise<{ percentComplete: number; isCompleted: boolean }> {
  return request(`/progress/${slug}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function listComments(slug: string): Promise<{
  data: Array<{ comment_uuid: string; body: string; username: string; user_uuid: string; created_at: string }>;
}> {
  return request(`/books/${slug}/comments`);
}

export async function addComment(slug: string, body: string): Promise<{ commentUuid: string }> {
  return request(`/books/${slug}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

export async function listReviews(slug: string): Promise<{ data: Array<{ review_uuid: string; rating: number; title: string | null; body: string | null; username: string }>; meta: { average: number; count: number } }> {
  return request(`/books/${slug}/reviews`);
}

export async function addReview(slug: string, input: { rating: number; title?: string; body?: string }): Promise<{ reviewUuid: string; rating: number }> {
  return request(`/books/${slug}/reviews`, { method: 'POST', body: JSON.stringify(input) });
}

export async function listTrash(): Promise<{ data: StorageObject[] }> {
  return request('/storage/trash');
}

export async function restoreObject(objectUuid: string): Promise<StorageObject> {
  return request(`/storage/objects/${objectUuid}/restore`, { method: 'POST' });
}

export async function permanentDeleteObject(objectUuid: string): Promise<{ status: string }> {
  return request(`/storage/objects/${objectUuid}/permanent`, { method: 'DELETE' });
}


