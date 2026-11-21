import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { startApp, jsonRequest, type RunningApp } from './lib/harness.js';
import { DatabaseService } from '../src/database/database.service.js';

/**
 * Regression cho HỢP ĐỒNG API mà frontend đang dùng:
 *  - danh mục seed hiển thị ở Catalog (`/categories`) và Author Studio (`/studio/categories`)
 *  - `/history` trả đúng sách + chương + thời điểm đọc để deep-link về Reader
 *  - `chapterUuid` không được ghi chéo sách
 *  - ảnh bìa công khai không phục vụ sách chưa publish
 *  - pagination được kẹp đúng biên
 */

const EXPECTED_CATEGORY_SLUGS = [
  'van-hoc',
  'khoa-hoc',
  'lich-su',
  'triet-hoc',
  'nghe-thuat',
  'kinh-te',
  'tam-ly',
  'ky-nang-song',
  'giao-duc',
  'thieu-nhi',
];

let app: RunningApp;
let db: DatabaseService;

const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const userA = { username: `contract_a_${suffix}`, userId: 0, token: '' };
const userB = { username: `contract_b_${suffix}`, userId: 0, token: '' };

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function registerAndLogin(username: string): Promise<{ userId: number; token: string }> {
  const reg = await jsonRequest(`${app.url}/auth/register`, 'POST', {
    username,
    email: `${username}@example.com`,
    password: 'password123',
  });
  assert.equal(reg.status, 201);
  const login = await jsonRequest(`${app.url}/auth/login`, 'POST', { identifier: username, password: 'password123' });
  assert.equal(login.status, 200);
  return { userId: Number(reg.body.userId), token: String(login.body.accessToken) };
}

function seedCategoryStatements(): string[] {
  const path = resolve(process.cwd(), '../../database/sql/migrations/012_seed_categories.sql');
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

before(async () => {
  app = await startApp();
  db = app.app.get(DatabaseService);

  // Migration 012 là idempotent — chạy lại để test không phụ thuộc thứ tự file.
  for (const statement of seedCategoryStatements()) {
    await db.query(statement);
  }

  const a = await registerAndLogin(userA.username);
  userA.userId = a.userId;
  userA.token = a.token;
  const b = await registerAndLogin(userB.username);
  userB.userId = b.userId;
  userB.token = b.token;
});

after(async () => {
  try {
    for (const id of [userA.userId, userB.userId]) {
      if (!id) continue;
      await db.query(`DELETE FROM user_library WHERE user_id = ?`, [id]);
      await db.query(`DELETE FROM reading_progress WHERE user_id = ?`, [id]);
      await db.query(`DELETE FROM reading_history WHERE user_id = ?`, [id]);
      await db.query(`DELETE FROM comments WHERE user_id = ?`, [id]);
    }
    if (userA.userId) {
      await db.query(`DELETE FROM books WHERE created_by_user_id = ?`, [userA.userId]);
      await db.query(`DELETE FROM users WHERE user_id = ?`, [userA.userId]);
    }
    if (userB.userId) {
      await db.query(`DELETE FROM books WHERE created_by_user_id = ?`, [userB.userId]);
      await db.query(`DELETE FROM users WHERE user_id = ?`, [userB.userId]);
    }
  } finally {
    await app.app.close();
  }
});

test('catalog + studio: 10 danh mục seed xuất hiện, đúng thứ tự hiển thị', async () => {
  const catalog = await jsonRequest(`${app.url}/categories`, 'GET');
  assert.equal(catalog.status, 200);
  const catalogRows = catalog.body.data as { slug: string; sort_order: number }[];
  const catalogSlugs = catalogRows.map((row) => row.slug);
  for (const slug of EXPECTED_CATEGORY_SLUGS) {
    assert.ok(catalogSlugs.includes(slug), `catalog thiếu danh mục ${slug}`);
  }

  const studio = await jsonRequest(`${app.url}/studio/categories`, 'GET', undefined, auth(userA.token));
  assert.equal(studio.status, 200);
  const studioRows = studio.body.data as { slug: string }[];
  for (const slug of EXPECTED_CATEGORY_SLUGS) {
    assert.ok(studioRows.some((row) => row.slug === slug), `author studio thiếu danh mục ${slug}`);
  }

  const sortOrders = catalogRows
    .filter((row) => EXPECTED_CATEGORY_SLUGS.includes(row.slug))
    .map((row) => Number(row.sort_order));
  assert.deepEqual(sortOrders, [...sortOrders].sort((a, b) => a - b));
});

test('history: ghi nhận chương đang đọc và trả dữ liệu deep-link về Reader', async () => {
  const book = await jsonRequest(
    `${app.url}/studio/books`,
    'POST',
    { title: `Contract History ${suffix}` },
    auth(userA.token),
  );
  assert.equal(book.status, 201);
  const bookUuid = String(book.body.bookUuid);

  const chapterOne = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/chapters`,
    'POST',
    { title: 'Chương một', content: 'Nội dung chương một' },
    auth(userA.token),
  );
  assert.equal(chapterOne.status, 201);
  const chapterOneUuid = String(chapterOne.body.chapterUuid);

  const chapterTwo = await jsonRequest(
    `${app.url}/studio/books/${bookUuid}/chapters`,
    'POST',
    { title: 'Chương hai', content: 'Nội dung chương hai' },
    auth(userA.token),
  );
  assert.equal(chapterTwo.status, 201);

  const published = await jsonRequest(`${app.url}/studio/books/${bookUuid}/publish`, 'POST', {
    scope: 'community', authorName: 'Tác giả kiểm thử', publicationYear: 2026,
  }, auth(userA.token));
  assert.equal(published.status, 201);
  const slug = String(published.body.slug);

  const saved = await jsonRequest(
    `${app.url}/progress/${slug}`,
    'PUT',
    { chapterUuid: chapterOneUuid, percentComplete: 40 },
    auth(userA.token),
  );
  assert.equal(saved.status, 200);

  const progress = await jsonRequest(`${app.url}/progress/${slug}`, 'GET', undefined, auth(userA.token));
  assert.equal(progress.status, 200);
  assert.equal(progress.body.chapterUuid, chapterOneUuid);

  const history = await jsonRequest(`${app.url}/history`, 'GET', undefined, auth(userA.token));
  assert.equal(history.status, 200);
  const item = (history.body.data as Record<string, unknown>[]).find((row) => row.slug === slug);
  assert.ok(item, 'history phải chứa lượt đọc vừa ghi');
  assert.equal(item?.chapter_uuid, chapterOneUuid);
  assert.equal(Number(item?.chapter_number), 1);
  assert.equal(item?.chapter_title, 'Chương một');
  assert.ok(typeof item?.started_at === 'string' || item?.started_at instanceof Date);

  // chapterUuid của sách khác không được ghi vào sách này
  const otherBook = await jsonRequest(
    `${app.url}/studio/books`,
    'POST',
    { title: `Contract Other ${suffix}` },
    auth(userA.token),
  );
  const otherBookUuid = String(otherBook.body.bookUuid);
  const otherChapter = await jsonRequest(
    `${app.url}/studio/books/${otherBookUuid}/chapters`,
    'POST',
    { title: 'Chương lạ', content: 'x' },
    auth(userA.token),
  );
  const foreignChapter = String(otherChapter.body.chapterUuid);

  const crossBook = await jsonRequest(
    `${app.url}/progress/${slug}`,
    'PUT',
    { chapterUuid: foreignChapter, percentComplete: 10 },
    auth(userA.token),
  );
  assert.equal(crossBook.status, 400);

  const anonymous = await jsonRequest(`${app.url}/history`, 'GET');
  assert.equal(anonymous.status, 401);

  const otherHistory = await jsonRequest(`${app.url}/history`, 'GET', undefined, auth(userB.token));
  assert.equal(otherHistory.status, 200);
  assert.ok(!(otherHistory.body.data as { slug: string }[]).some((row) => row.slug === slug));
});

test('catalog: pagination được kẹp biên và meta nhất quán', async () => {
  const oversized = await jsonRequest(`${app.url}/books?limit=1000&page=0`, 'GET');
  assert.equal(oversized.status, 200);
  const meta = oversized.body.meta as { page: number; limit: number; total: number; totalPages: number };
  assert.equal(meta.page, 1);
  assert.equal(meta.limit, 50);
  assert.equal(typeof meta.total, 'number');
  assert.equal(meta.totalPages, Math.ceil(meta.total / meta.limit));

  const sorted = await jsonRequest(`${app.url}/books?sort=title&limit=5`, 'GET');
  assert.equal(sorted.status, 200);
  const rows = sorted.body.data as { title: string }[];
  assert.ok(rows.length <= 5);
  assert.ok(rows.every((row) => typeof row.title === 'string'));
});

test('cover: sách chưa publish không phục vụ ảnh bìa qua endpoint công khai', async () => {
  const book = await jsonRequest(
    `${app.url}/studio/books`,
    'POST',
    { title: `Contract Cover ${suffix}` },
    auth(userA.token),
  );
  const bookUuid = String(book.body.bookUuid);
  const bookSlug = String(book.body.slug);
  const published = await jsonRequest(`${app.url}/studio/books/${bookUuid}/publish`, 'POST', {
    scope: 'community', authorName: 'Tác giả kiểm thử', publicationYear: 2026,
  }, auth(userA.token));
  // Chưa có chương → publish bị từ chối, sách vẫn draft/private.
  assert.equal(published.status, 400);

  const draftCover = await fetch(`${app.url}/books/${bookSlug}/cover`);
  assert.equal(draftCover.status, 404);

  const missingBookCover = await fetch(`${app.url}/books/khong-ton-tai-${suffix}/cover`);
  assert.equal(missingBookCover.status, 404);
});

test('auth: endpoint hồ sơ và studio đều fail-closed khi thiếu bearer token', async () => {
  for (const path of ['/me', '/studio/books', '/storage/quota', '/library']) {
    const response = await jsonRequest(`${app.url}${path}`, 'GET');
    assert.equal(response.status, 401, `${path} phải trả 401 khi chưa đăng nhập`);
  }
});

