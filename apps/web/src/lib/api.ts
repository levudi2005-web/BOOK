const base = process.env.NEXT_PUBLIC_API_URL ?? '/api';

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

export type BookListResponse = {
  data: ApiBook[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type BookDetail = ApiBook & {
  authors: ApiAuthor[];
  categories: ApiCategory[];
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
  const response = await fetch(`${base}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return (await response.json()) as T;
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

// ---------------------------------------------------------------------------
// Auth / session (opaque bearer token)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'bff_access_token';

export function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type AuthRegisterResponse = { status: string; userId: number; recoveryKey: string };
type AuthLoginResponse = { accessToken: string; expiresAt: string; userId: number };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers, cache: 'no-store' });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message = (data as { message?: string | string[] } | null)?.message;
    throw new Error(Array.isArray(message) ? message.join(', ') : (message ?? `Request failed: ${response.status}`));
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
  await request('/auth/logout', { method: 'POST' });
  setAccessToken('');
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

export async function listObjects(): Promise<{ data: StorageObject[] }> {
  return request('/storage/objects');
}

export async function deleteObject(objectUuid: string): Promise<{ status: string }> {
  return request(`/storage/objects/${objectUuid}`, { method: 'DELETE' });
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
  publishedAt: string | null;
};

export async function listMyBooks(): Promise<{ data: StudioBook[] }> {
  return request('/studio/books');
}

export async function createBook(input: { title: string; subtitle?: string; description?: string; language?: string }): Promise<StudioBook> {
  return request('/studio/books', { method: 'POST', body: JSON.stringify(input) });
}

export async function createChapter(bookUuid: string, input: { title: string; content?: string }): Promise<{ chapterUuid: string }> {
  return request(`/studio/books/${bookUuid}/chapters`, { method: 'POST', body: JSON.stringify(input) });
}

export async function publishBook(bookUuid: string): Promise<StudioBook> {
  return request(`/studio/books/${bookUuid}/publish`, { method: 'POST' });
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
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const token = getAdminToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers, cache: 'no-store' });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message = (data as { message?: string | string[] } | null)?.message;
    throw new Error(Array.isArray(message) ? message.join(', ') : (message ?? `Request failed: ${response.status}`));
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

export async function adminListUsers(): Promise<{ data: Array<Record<string, unknown>>; meta: { total: number } }> {
  return adminRequest('/admin/users');
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

export async function getProgress(slug: string): Promise<{ percentComplete: number; isCompleted: boolean }> {
  return request(`/progress/${slug}`);
}

export async function saveProgress(slug: string, input: { percentComplete?: number; isCompleted?: boolean; chapterId?: number }): Promise<{ percentComplete: number; isCompleted: boolean }> {
  return request(`/progress/${slug}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function listComments(slug: string): Promise<{ data: Array<{ comment_uuid: string; body: string; username: string; created_at: string }> }> {
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


