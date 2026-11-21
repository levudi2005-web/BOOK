import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startApp, jsonRequest, type RunningApp } from './lib/harness.js';
import { signGatewayRequest } from '../src/common/gateway-sign.util.js';
import { DatabaseService } from '../src/database/database.service.js';
import { AdminDatabaseService } from '../src/admin/admin-database.service.js';
import { AdminService } from '../src/admin/admin.service.js';
import { MailService } from '../src/mail/mail.service.js';

let app: RunningApp;
let userDb: DatabaseService;
let adminDb: AdminDatabaseService;
let adminService: AdminService;
let gatewaySecret = '';

const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const userA = { username: `test_a_${suffix}`, userId: 0, accessToken: '', bookUuid: '' };
const userB = { username: `test_b_${suffix}`, userId: 0, accessToken: '' };
const admin = { username: `test_admin_${suffix}`, adminId: 0, accessToken: '' };
let bookSlug = '';

function signedHeaders(method: string, path: string): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = `nonce-${Math.random().toString(36).slice(2)}`;
  const signature = signGatewayRequest({ secret: gatewaySecret, timestamp, nonce, method, path });
  return {
    'x-gateway-timestamp': timestamp,
    'x-gateway-nonce': nonce,
    'x-gateway-signature': signature,
  };
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

before(async () => {
  app = await startApp();
  gatewaySecret = process.env.GATEWAY_HMAC_SECRET ?? '';
  userDb = app.app.get(DatabaseService);
  adminDb = app.app.get(AdminDatabaseService);
  adminService = app.app.get(AdminService);
});

after(async () => {
  try {
    // Social data first (reading_history FK→books is RESTRICT).
    for (const id of [userA.userId, userB.userId]) {
      if (!id) continue;
      await userDb.query(`DELETE FROM user_library WHERE user_id = ?`, [id]);
      await userDb.query(`DELETE FROM reading_progress WHERE user_id = ?`, [id]);
      await userDb.query(`DELETE FROM reading_history WHERE user_id = ?`, [id]);
      await userDb.query(`DELETE FROM comments WHERE user_id = ?`, [id]);
      await userDb.query(`DELETE FROM reviews WHERE user_id = ?`, [id]);
    }
    if (userA.userId) {
      await userDb.query(`DELETE FROM books WHERE created_by_user_id = ?`, [userA.userId]);
      await userDb.query(`DELETE FROM office_documents WHERE owner_user_id = ?`, [userA.userId]);
    }
    if (userB.userId) {
      await userDb.query(`DELETE FROM books WHERE created_by_user_id = ?`, [userB.userId]);
      await userDb.query(`DELETE FROM office_documents WHERE owner_user_id = ?`, [userB.userId]);
    }
    if (admin.adminId) {
      await adminDb.query(`DELETE FROM admin_accounts WHERE admin_id = ?`, [admin.adminId]);
    }
    if (userA.userId) await userDb.query(`DELETE FROM users WHERE user_id = ?`, [userA.userId]);
    if (userB.userId) await userDb.query(`DELETE FROM users WHERE user_id = ?`, [userB.userId]);
  } finally {
    await app.app.close();
  }
});

test('auth: register (không email, active ngay) + login', async () => {
  const reg = await jsonRequest(`${app.url}/auth/register`, 'POST', {
    username: userA.username,
    email: `${userA.username}@example.com`,
    password: 'password123',
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.status, 'active');
  assert.ok(typeof reg.body.recoveryKey === 'string');
  userA.userId = Number(reg.body.userId);

  const login = await jsonRequest(`${app.url}/auth/login`, 'POST', {
    identifier: userA.username,
    password: 'password123',
  });
  assert.equal(login.status, 200);
  userA.accessToken = String(login.body.accessToken);
  assert.ok(userA.accessToken.length > 20);
});

test('gateway: HMAC health + catalog, và chặn khi thiếu/sai signature', async () => {
  const ok = await jsonRequest(`${app.url}/gateway/health`, 'GET', undefined, signedHeaders('GET', '/gateway/health'));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, 'ok');

  const books = await jsonRequest(`${app.url}/gateway/books`, 'GET', undefined, signedHeaders('GET', '/gateway/books'));
  assert.equal(books.status, 200);
  assert.ok(Array.isArray(books.body.data));

  const noSig = await jsonRequest(`${app.url}/gateway/health`, 'GET');
  assert.equal(noSig.status, 401);

  const badSig = await jsonRequest(`${app.url}/gateway/health`, 'GET', undefined, {
    ...signedHeaders('GET', '/gateway/health'),
    'x-gateway-signature': 'deadbeef',
  });
  assert.equal(badSig.status, 401);
});

test('storage: upload chunk → complete → download → quota → delete (owner only)', async () => {
  const quota0 = await jsonRequest(`${app.url}/storage/quota`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(quota0.status, 200);
  assert.equal(quota0.body.quotaBytes, 419430400);

  const payload = Buffer.from('hello storage world', 'utf8');
  const cancelledInit = await jsonRequest(`${app.url}/storage/objects`, 'POST', {
    filename: 'cancelled.txt',
    mimeType: 'text/plain',
    totalBytes: payload.length,
  }, auth(userA.accessToken));
  assert.equal(cancelledInit.status, 201);
  const cancelled = cancelledInit.body as { objectUuid: string; sessionUuid: string };
  const cancelResult = await jsonRequest(
    `${app.url}/storage/objects/${cancelled.sessionUuid}/cancel`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(cancelResult.status, 201);
  assert.equal(cancelResult.body.status, 'ok');
  const quotaCancelled = await jsonRequest(`${app.url}/storage/quota`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(Number(quotaCancelled.body.reservedBytes), 0);
  const afterCancel = await jsonRequest(
    `${app.url}/storage/objects/${cancelled.sessionUuid}/chunks`,
    'POST',
    { chunkIndex: 0, data: payload.toString('base64') },
    auth(userA.accessToken),
  );
  assert.equal(afterCancel.status, 403);
  const cleanCancelled = await jsonRequest(
    `${app.url}/storage/objects/${cancelled.objectUuid}/permanent`,
    'DELETE',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(cleanCancelled.status, 200);

  const init = await jsonRequest(`${app.url}/storage/objects`, 'POST', {
    filename: 'test.txt',
    mimeType: 'text/plain',
    totalBytes: payload.length,
  }, auth(userA.accessToken));
  assert.equal(init.status, 201);
  const { objectUuid, sessionUuid } = init.body as { objectUuid: string; sessionUuid: string };

  const chunk = await jsonRequest(`${app.url}/storage/objects/${sessionUuid}/chunks`, 'POST', {
    chunkIndex: 0,
    data: payload.toString('base64'),
  }, auth(userA.accessToken));
  assert.equal(chunk.status, 201);

  const complete = await jsonRequest(`${app.url}/storage/objects/${sessionUuid}/complete`, 'POST', undefined, auth(userA.accessToken));
  assert.equal(complete.status, 201);
  assert.equal(complete.body.status, 'complete');

  const download = await fetch(`${app.url}/storage/objects/${objectUuid}/download`, { headers: auth(userA.accessToken) });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'hello storage world');

  const quota1 = await jsonRequest(`${app.url}/storage/quota`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(Number(quota1.body.usedBytes), payload.length);

  const regB = await jsonRequest(`${app.url}/auth/register`, 'POST', {
    username: userB.username, email: `${userB.username}@example.com`, password: 'password123',
  });
  userB.userId = Number(regB.body.userId);
  const loginB = await jsonRequest(`${app.url}/auth/login`, 'POST', { identifier: userB.username, password: 'password123' });
  userB.accessToken = String(loginB.body.accessToken);

  const forbidden = await jsonRequest(`${app.url}/storage/objects/${objectUuid}`, 'GET', undefined, auth(userB.accessToken));
  assert.equal(forbidden.status, 403);

  // Trash → usedBytes vẫn giữ (thùng rác tính quota) → restore → permanent delete.
  const del = await jsonRequest(`${app.url}/storage/objects/${objectUuid}`, 'DELETE', undefined, auth(userA.accessToken));
  assert.equal(del.status, 200);
  const quotaTrash = await jsonRequest(`${app.url}/storage/quota`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(Number(quotaTrash.body.usedBytes), payload.length);

  const trash = await jsonRequest(`${app.url}/storage/trash`, 'GET', undefined, auth(userA.accessToken));
  assert.ok((trash.body.data as { objectUuid: string }[]).some((o) => o.objectUuid === objectUuid));

  const restore = await jsonRequest(`${app.url}/storage/objects/${objectUuid}/restore`, 'POST', undefined, auth(userA.accessToken));
  assert.equal(restore.status, 201);

  await jsonRequest(`${app.url}/storage/objects/${objectUuid}`, 'DELETE', undefined, auth(userA.accessToken));
  const perm = await jsonRequest(`${app.url}/storage/objects/${objectUuid}/permanent`, 'DELETE', undefined, auth(userA.accessToken));
  assert.equal(perm.status, 200);
  const quota2 = await jsonRequest(`${app.url}/storage/quota`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(Number(quota2.body.usedBytes), 0);
});

test('author studio: tạo sách → chương → publish → xuất hiện trên catalog', async () => {
  const created = await jsonRequest(`${app.url}/studio/books`, 'POST', {
    title: `Sách ${suffix}`,
    subtitle: 'Phụ đề',
    language: 'vi',
  }, auth(userA.accessToken));
  assert.equal(created.status, 201);
  userA.bookUuid = String(created.body.bookUuid);

  const chapter = await jsonRequest(`${app.url}/studio/books/${userA.bookUuid}/chapters`, 'POST', {
    title: 'Chương 1',
    content: '<p>Nội dung chương một có bốn từ.</p>',
  }, auth(userA.accessToken));
  assert.equal(chapter.status, 201);

  const published = await jsonRequest(`${app.url}/studio/books/${userA.bookUuid}/publish`, 'POST', undefined, auth(userA.accessToken));
  assert.equal(published.status, 201);
  assert.equal(published.body.status, 'published');

  const slug = String(published.body.slug);
  bookSlug = slug;
  const publicBook = await jsonRequest(`${app.url}/books/${slug}`, 'GET');
  assert.equal(publicBook.status, 200);
  assert.equal(publicBook.body.title, `Sách ${suffix}`);
});

test('documents (office writer): tạo → cập nhật → đọc', async () => {
  const created = await jsonRequest(`${app.url}/documents`, 'POST', { title: 'Tài liệu văn phòng' }, auth(userA.accessToken));
  assert.equal(created.status, 201);
  const documentUuid = String(created.body.documentUuid);

  const updated = await jsonRequest(`${app.url}/documents/${documentUuid}`, 'PUT', {
    title: 'Tài liệu văn phòng',
    content: { text: 'Nội dung soạn thảo văn phòng' },
  }, auth(userA.accessToken));
  assert.equal(updated.status, 200);

  const fetched = await jsonRequest(`${app.url}/documents/${documentUuid}`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(fetched.status, 200);
  assert.equal((fetched.body.content as { text: string }).text, 'Nội dung soạn thảo văn phòng');

  const removed = await jsonRequest(`${app.url}/documents/${documentUuid}`, 'DELETE', undefined, auth(userA.accessToken));
  assert.equal(removed.status, 200);
  const listAfterDelete = await jsonRequest(`${app.url}/documents`, 'GET', undefined, auth(userA.accessToken));
  assert.ok(!(listAfterDelete.body.data as { documentUuid: string }[]).some((item) => item.documentUuid === documentUuid));
  const getAfterDelete = await jsonRequest(`${app.url}/documents/${documentUuid}`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(getAfterDelete.status, 404);
});

test('admin: bootstrap → login → RBAC list users → chặn user thường', async () => {
  const created = await adminService.createAdmin(admin.username, `${admin.username}@example.com`, 'admin-password-123', 'SUPER_ADMIN');
  admin.adminId = Number(created.adminId);

  const login = await jsonRequest(`${app.url}/admin/auth/login`, 'POST', {
    identifier: admin.username, password: 'admin-password-123',
  });
  assert.equal(login.status, 200);
  admin.accessToken = String(login.body.accessToken);

  const me = await jsonRequest(`${app.url}/admin/auth/me`, 'GET', undefined, auth(admin.accessToken));
  assert.equal(me.status, 200);
  assert.ok((me.body.roles as string[]).includes('SUPER_ADMIN'));

  const users = await jsonRequest(`${app.url}/admin/users`, 'GET', undefined, auth(admin.accessToken));
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body.data));

  const denied = await jsonRequest(`${app.url}/admin/users`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(denied.status, 401);
});


test('social: library → favorite → progress → comment → review', async () => {
  // Add to library + favorite
  const add = await jsonRequest(`${app.url}/library/${bookSlug}`, 'POST', undefined, auth(userA.accessToken));
  assert.equal(add.status, 201);
  const fav = await jsonRequest(`${app.url}/library/${bookSlug}`, 'PATCH', { isFavorite: true, status: 'reading' }, auth(userA.accessToken));
  assert.equal(fav.status, 200);
  const lib = await jsonRequest(`${app.url}/library`, 'GET', undefined, auth(userA.accessToken));
  assert.ok((lib.body.data as { slug: string; isFavorite: boolean }[]).some((b) => b.slug === bookSlug && b.isFavorite));

  // Progress
  const prog = await jsonRequest(`${app.url}/progress/${bookSlug}`, 'PUT', { percentComplete: 42 }, auth(userA.accessToken));
  assert.equal(prog.status, 200);
  assert.equal(Number(prog.body.percentComplete), 42);
  const got = await jsonRequest(`${app.url}/progress/${bookSlug}`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(Number(got.body.percentComplete), 42);
  const hist = await jsonRequest(`${app.url}/history`, 'GET', undefined, auth(userA.accessToken));
  assert.ok((hist.body.data as { slug: string }[]).some((h) => h.slug === bookSlug));

  // Comment
  const comment = await jsonRequest(`${app.url}/books/${bookSlug}/comments`, 'POST', { body: 'Bình luận E2E' }, auth(userA.accessToken));
  assert.equal(comment.status, 201);
  const comments = await jsonRequest(`${app.url}/books/${bookSlug}/comments`, 'GET');
  assert.ok((comments.body.data as { body: string }[]).some((c) => c.body === 'Bình luận E2E'));

  // Review
  const review = await jsonRequest(`${app.url}/books/${bookSlug}/reviews`, 'POST', { rating: 4.5, body: 'Sách hay' }, auth(userA.accessToken));
  assert.equal(review.status, 201);
  const reviews = await jsonRequest(`${app.url}/books/${bookSlug}/reviews`, 'GET');
  assert.ok(Number((reviews.body.meta as { average: number }).average) >= 4.5);
});

test('search (meilisearch): reindex qua gateway → tìm thấy sách đã publish', async () => {
  const reindex = await jsonRequest(
    `${app.url}/gateway/internal/search/reindex`,
    'POST',
    undefined,
    signedHeaders('POST', '/gateway/internal/search/reindex'),
  );
  assert.equal(reindex.status, 201);
  assert.ok(Number(reindex.body.books) >= 1);

  const results = await jsonRequest(`${app.url}/search?q=${encodeURIComponent(`Sách ${suffix}`)}`, 'GET');
  assert.equal(results.status, 200);
  const hits = (results.body.hits as { title?: string }[]) ?? [];
  assert.ok(hits.some((h) => h.title === `Sách ${suffix}`));
});




test('profile: đọc/cập nhật hồ sơ và không lộ dữ liệu nhạy cảm', async () => {
  const me = await jsonRequest(`${app.url}/me`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.username, userA.username);
  assert.ok(!('password_hash' in me.body));
  assert.ok(!('session_token_hash' in me.body));
  assert.ok(!('recoveryKey' in me.body));

  const patched = await jsonRequest(
    `${app.url}/me`,
    'PATCH',
    { displayName: 'E2E Author', bio: 'Hồ sơ kiểm thử', websiteUrl: 'https://example.test' },
    auth(userA.accessToken),
  );
  assert.equal(patched.status, 200);
  assert.equal((patched.body.profile as { displayName: string }).displayName, 'E2E Author');

  const invalid = await jsonRequest(`${app.url}/me`, 'PATCH', { websiteUrl: 'not-a-url' }, auth(userA.accessToken));
  assert.equal(invalid.status, 400);

  const anonymous = await jsonRequest(`${app.url}/me`, 'GET');
  assert.equal(anonymous.status, 401);
});

test('author studio: categories, tags, version restore, unpublish và ownership', async () => {
  const created = await jsonRequest(
    `${app.url}/studio/books`,
    'POST',
    { title: `E2E Studio ${suffix}`, description: 'Kiểm thử studio' },
    auth(userA.accessToken),
  );
  assert.equal(created.status, 201);
  const bookUuid = String(created.body.bookUuid);

  const categories = await jsonRequest(`${app.url}/studio/categories`, 'GET', undefined, auth(userA.accessToken));
  assert.equal(categories.status, 200);
  assert.ok(Array.isArray(categories.body.data));
  const categoryIds = (categories.body.data as { categoryId: number }[]).slice(0, 1).map((c) => c.categoryId);
  // Hệ thống có thể chưa có danh mục nào (bảng categories trống) — khi đó chỉ
  // kiểm tra endpoint hoạt động, còn gán danh mục được kiểm tra khi có dữ liệu.
  if (categoryIds.length > 0) {
    const withCategories = await jsonRequest(
      `${app.url}/studio/books/${bookUuid}/categories`,
      'PUT',
      { categoryIds },
      auth(userA.accessToken),
    );
    assert.equal(withCategories.status, 200);
    assert.equal((withCategories.body.categories as unknown[]).length, 1);
  }

  const withTags = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/tags`,
    'PUT',
    { tags: ['E2E', 'Kiểm thử'] },
    auth(userA.accessToken),
  );
  assert.equal(withTags.status, 200);
  assert.deepEqual(withTags.body.tags, ['E2E', 'Kiểm thử']);

  const chapter = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/chapters`,
    'POST',
    { title: 'Chương 1', content: 'Nội dung kiểm thử' },
    auth(userA.accessToken),
  );
  assert.equal(chapter.status, 201);

  const published = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/publish`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(published.status, 201);
  assert.equal(published.body.status, 'published');

  const versions = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/versions`,
    'GET',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(versions.status, 200);
  const versionNumber = (versions.body.data as { version_number: number }[])[0].version_number;

  const restored = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/versions/${versionNumber}/restore`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(restored.status, 201);
  assert.equal((restored.body as { restoredChapters: number }).restoredChapters, 1);

  const unpublished = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/unpublish`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(unpublished.status, 201);
  assert.equal(unpublished.body.status, 'draft');
  assert.equal(unpublished.body.visibility, 'private');

  const catalog = await jsonRequest(`${app.url}/books?q=${encodeURIComponent(`E2E Studio ${suffix}`)}`, 'GET');
  const catalogData = (catalog.body.data as { title: string }[]) ?? [];
  assert.ok(!catalogData.some((book) => book.title === `E2E Studio ${suffix}`));

  const foreignWrite = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/tags`,
    'PUT',
    { tags: ['hijack'] },
    auth(userB.accessToken),
  );
  assert.equal(foreignWrite.status, 403);
});

const COVER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function uploadImage(token: string, mimeType = 'image/png', filename = 'cover.png'): Promise<string> {
  const totalBytes = Buffer.from(COVER_PNG_BASE64, 'base64').length;
  const init = await jsonRequest(`${app.url}/storage/objects`, 'POST', { filename, mimeType, totalBytes }, auth(token));
  assert.equal(init.status, 201);
  const { sessionUuid } = init.body as { sessionUuid: string };
  const chunk = await jsonRequest(
    `${app.url}/storage/objects/${sessionUuid}/chunks`,
    'POST',
    { chunkIndex: 0, data: COVER_PNG_BASE64 },
    auth(token),
  );
  assert.equal(chunk.status, 201);
  const complete = await jsonRequest(`${app.url}/storage/objects/${sessionUuid}/complete`, 'POST', undefined, auth(token));
  assert.equal(complete.status, 201);
  return String(complete.body.objectUuid);
}

test('cover: public serve chỉ khi sách public + object public, ownership khi gán/xoá', async () => {
  const created = await jsonRequest(`${app.url}/studio/books`, 'POST', { title: `E2E Cover ${suffix}` }, auth(userA.accessToken));
  assert.equal(created.status, 201);
  const bookUuid = String(created.body.bookUuid);
  await jsonRequest(`${app.url}/studio/books/${bookUuid}/chapters`, 'POST', { title: 'Chương 1', content: 'Nội dung' }, auth(userA.accessToken));

  const objectUuid = await uploadImage(userA.accessToken);

  // userB không thể gán object của userA vào sách của userA
  const foreignAttach = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/cover`,
    'POST',
    { objectUuid },
    auth(userB.accessToken),
  );
  assert.equal(foreignAttach.status, 403);

  // Sai MIME bị từ chối
  const textObject = await uploadImage(userA.accessToken, 'text/plain', 'notes.txt');
  const wrongMime = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/cover`,
    'POST',
    { objectUuid: textObject },
    auth(userA.accessToken),
  );
  assert.equal(wrongMime.status, 400);

  const attached = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/cover`,
    'POST',
    { objectUuid },
    auth(userA.accessToken),
  );
  assert.equal(attached.status, 201);
  assert.equal(attached.body.coverStorageKey, objectUuid);

  const published = await jsonRequest(`${app.url}/studio/books/${bookUuid}/publish`, 'POST', undefined, auth(userA.accessToken));
  assert.equal(published.status, 201);
  const slug = String(published.body.slug);

  const publicCover = await fetch(`${app.url}/books/${slug}/cover`);
  assert.equal(publicCover.status, 200);
  assert.equal(publicCover.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await publicCover.arrayBuffer()), Buffer.from(COVER_PNG_BASE64, 'base64'));

  // Người khác vẫn không tải trực tiếp object qua API storage
  const direct = await jsonRequest(`${app.url}/storage/objects/${objectUuid}`, 'GET', undefined, auth(userB.accessToken));
  assert.equal(direct.status, 403);

  // Unpublish → cover không còn phục vụ công khai
  await jsonRequest(`${app.url}/studio/books/${bookUuid}/unpublish`, 'POST', undefined, auth(userA.accessToken));
  const afterUnpublish = await fetch(`${app.url}/books/${slug}/cover`);
  assert.equal(afterUnpublish.status, 404);

  // Xoá bìa (owner) → trường cover rỗng
  const removed = await jsonRequest(`${app.url}/studio/books/${bookUuid}/cover`, 'DELETE', undefined, auth(userA.accessToken));
  assert.equal(removed.status, 200);
  assert.equal(removed.body.coverStorageKey, null);
});

test('chapter images: chỉ phục vụ khi ảnh được tham chiếu trong chương của sách public', async () => {
  const created = await jsonRequest(
    `${app.url}/studio/books`,
    'POST',
    { title: `E2E Chapter Image ${suffix}` },
    auth(userA.accessToken),
  );
  assert.equal(created.status, 201);
  const bookUuid = String(created.body.bookUuid);
  const detail = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}`,
    'GET',
    undefined,
    auth(userA.accessToken),
  );
  const slug = String(detail.body.slug);
  const objectUuid = await uploadImage(userA.accessToken, 'image/png', 'chapter-image.png');
  const content = `<p>Minh họa chương</p><img src="" data-storage-uuid="${objectUuid}" alt="Minh họa" />`;
  const chapter = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/chapters`,
    'POST',
    { title: 'Chương có ảnh', content },
    auth(userA.accessToken),
  );
  assert.equal(chapter.status, 201);

  const beforePublish = await fetch(`${app.url}/books/${slug}/images/${objectUuid}`);
  assert.equal(beforePublish.status, 404);

  const published = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/publish`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(published.status, 201);
  const publicImage = await fetch(`${app.url}/books/${slug}/images/${objectUuid}`);
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), Buffer.from(COVER_PNG_BASE64, 'base64'));

  const unrelatedBook = await fetch(`${app.url}/books/not-the-image-book/images/${objectUuid}`);
  assert.equal(unrelatedBook.status, 404);

  await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/unpublish`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  const afterUnpublish = await fetch(`${app.url}/books/${slug}/images/${objectUuid}`);
  assert.equal(afterUnpublish.status, 404);
});

test('comments: sửa/xoá chỉ chủ sở hữu, danh sách phản ánh thay đổi', async () => {
  const created = await jsonRequest(`${app.url}/studio/books`, 'POST', { title: `E2E Comment ${suffix}` }, auth(userA.accessToken));
  const bookUuid = String(created.body.bookUuid);
  await jsonRequest(`${app.url}/studio/books/${bookUuid}/chapters`, 'POST', { title: 'Chương 1', content: 'Nội dung' }, auth(userA.accessToken));
  const published = await jsonRequest(`${app.url}/studio/books/${bookUuid}/publish`, 'POST', undefined, auth(userA.accessToken));
  const slug = String(published.body.slug);

  const added = await jsonRequest(`${app.url}/books/${slug}/comments`, 'POST', { body: 'Bình luận gốc' }, auth(userA.accessToken));
  assert.equal(added.status, 201);
  const commentUuid = String(added.body.commentUuid);

  const foreignEdit = await jsonRequest(`${app.url}/comments/${commentUuid}`, 'PATCH', { body: 'hijack' }, auth(userB.accessToken));
  assert.equal(foreignEdit.status, 403);

  const edited = await jsonRequest(`${app.url}/comments/${commentUuid}`, 'PATCH', { body: 'Đã sửa' }, auth(userA.accessToken));
  assert.equal(edited.status, 200);
  assert.equal(edited.body.body, 'Đã sửa');

  const list = await jsonRequest(`${app.url}/books/${slug}/comments`, 'GET');
  assert.ok((list.body.data as { body: string }[]).some((comment) => comment.body === 'Đã sửa'));

  const foreignDelete = await jsonRequest(`${app.url}/comments/${commentUuid}`, 'DELETE', undefined, auth(userB.accessToken));
  assert.equal(foreignDelete.status, 403);

  const deleted = await jsonRequest(`${app.url}/comments/${commentUuid}`, 'DELETE', undefined, auth(userA.accessToken));
  assert.equal(deleted.status, 200);
});

test('email verification + password reset: token một lần, hash trong DB, chống enumeration', async () => {
  const mail = app.app.get(MailService);

  const requested = await jsonRequest(
    `${app.url}/auth/email/verification/request`,
    'POST',
    undefined,
    auth(userA.accessToken),
  );
  assert.equal(requested.status, 202);
  assert.equal(requested.body.delivery, 'sent');

  const verifyMail = mail.outbox[mail.outbox.length - 1];
  const verifyToken = /token=([A-Za-z0-9_-]+)/.exec(verifyMail.text)?.[1] ?? '';
  assert.ok(verifyToken.length >= 40);

  // DB chỉ lưu hash nhị phân, không có token thô
  const stored = await userDb.query<{ token_hash: Buffer }[]>(
    `SELECT token_hash FROM user_security_tokens WHERE user_id = ? ORDER BY issued_at DESC LIMIT 1`,
    [userA.userId],
  );
  assert.equal(stored.length, 1);
  assert.ok(Buffer.isBuffer(stored[0].token_hash));
  assert.ok(!stored[0].token_hash.toString('utf8').includes(verifyToken));

  const confirmed = await jsonRequest(`${app.url}/auth/email/verification/confirm`, 'POST', { token: verifyToken });
  assert.equal(confirmed.status, 200);

  const reused = await jsonRequest(`${app.url}/auth/email/verification/confirm`, 'POST', { token: verifyToken });
  assert.equal(reused.status, 400);

  const verified = await userDb.query<{ email_verified_at: Date | null }[]>(
    `SELECT email_verified_at FROM users WHERE user_id = ? LIMIT 1`,
    [userA.userId],
  );
  assert.ok(verified[0].email_verified_at);

  // Forgot password: phản hồi giống nhau cho tài khoản tồn tại và không tồn tại
  const existing = await jsonRequest(`${app.url}/auth/password/forgot`, 'POST', { identifier: userB.username });
  const missing = await jsonRequest(`${app.url}/auth/password/forgot`, 'POST', { identifier: `missing_${suffix}` });
  assert.equal(existing.status, 202);
  assert.equal(missing.status, 202);
  assert.deepEqual(existing.body, missing.body);

  const resetMail = mail.outbox[mail.outbox.length - 1];
  const resetToken = /token=([A-Za-z0-9_-]+)/.exec(resetMail.text)?.[1] ?? '';
  assert.ok(resetToken.length >= 40);

  const weak = await jsonRequest(`${app.url}/auth/password/reset`, 'POST', { token: resetToken, password: 'short' });
  assert.equal(weak.status, 400);

  const reset = await jsonRequest(`${app.url}/auth/password/reset`, 'POST', { token: resetToken, password: 'newpassword456' });
  assert.equal(reset.status, 200);

  const loginNew = await jsonRequest(`${app.url}/auth/login`, 'POST', { identifier: userB.username, password: 'newpassword456' });
  assert.equal(loginNew.status, 200);
  const loginOld = await jsonRequest(`${app.url}/auth/login`, 'POST', { identifier: userB.username, password: 'password123' });
  assert.equal(loginOld.status, 401);

  const reuseReset = await jsonRequest(`${app.url}/auth/password/reset`, 'POST', { token: resetToken, password: 'anotherpass789' });
  assert.equal(reuseReset.status, 400);
});
