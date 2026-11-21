import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { startApp, type RunningApp } from './lib/harness.js';
import { DatabaseService } from '../src/database/database.service.js';

let app: RunningApp;
let db: DatabaseService;

const EXPECTED = [
  { name: 'Văn học', slug: 'van-hoc' },
  { name: 'Khoa học', slug: 'khoa-hoc' },
  { name: 'Lịch sử', slug: 'lich-su' },
  { name: 'Triết học', slug: 'triet-hoc' },
  { name: 'Nghệ thuật', slug: 'nghe-thuat' },
  { name: 'Kinh tế', slug: 'kinh-te' },
  { name: 'Tâm lý', slug: 'tam-ly' },
  { name: 'Kỹ năng sống', slug: 'ky-nang-song' },
  { name: 'Giáo dục', slug: 'giao-duc' },
  { name: 'Thiếu nhi', slug: 'thieu-nhi' },
];

function seedStatements(): string[] {
  const path = resolve(process.cwd(), '../../database/sql/migrations/012_seed_categories.sql');
  const sql = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function runSeed(): Promise<void> {
  for (const statement of seedStatements()) {
    await db.query(statement);
  }
}

before(async () => {
  app = await startApp();
  db = app.app.get(DatabaseService);
});

after(async () => {
  await app.app.close();
});

test('migration 012: seed 10 danh mục đúng slug/tên/thứ tự', async () => {
  await runSeed();

  const rows = await db.query<{ name: string; slug: string; sort_order: number; is_active: number }[]>(
    `SELECT name, slug, sort_order, is_active FROM categories WHERE slug IN (${EXPECTED.map(() => '?').join(',')})
     ORDER BY sort_order`,
    EXPECTED.map((item) => item.slug),
  );

  assert.equal(rows.length, EXPECTED.length);
  assert.deepEqual(
    rows.map((row) => row.slug),
    EXPECTED.map((item) => item.slug),
  );
  assert.deepEqual(
    rows.map((row) => row.name),
    EXPECTED.map((item) => item.name),
  );
  assert.ok(rows.every((row) => Number(row.is_active) === 1));

  const sortOrders = rows.map((row) => Number(row.sort_order));
  assert.deepEqual(sortOrders, [...sortOrders].sort((a, b) => a - b));
  assert.equal(new Set(sortOrders).size, sortOrders.length);
});

test('migration 012: chạy lại không tạo bản ghi trùng', async () => {
  const before = await db.query<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM categories WHERE slug IN (${EXPECTED.map(() => '?').join(',')})`,
    EXPECTED.map((item) => item.slug),
  );

  await runSeed();
  await runSeed();

  const after = await db.query<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM categories WHERE slug IN (${EXPECTED.map(() => '?').join(',')})`,
    EXPECTED.map((item) => item.slug),
  );

  assert.equal(Number(after[0].total), Number(before[0].total));
  assert.equal(Number(after[0].total), EXPECTED.length);
});
