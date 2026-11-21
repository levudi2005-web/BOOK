import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startApp, jsonRequest, type RunningApp } from './lib/harness.js';
import { signGatewayRequest } from '../src/common/gateway-sign.util.js';
import { DatabaseService } from '../src/database/database.service.js';
import { AdminDatabaseService } from '../src/admin/admin-database.service.js';
import { AdminService } from '../src/admin/admin.service.js';

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


