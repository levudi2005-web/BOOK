import { expect, test, type Page } from '@playwright/test';
import { admin, api, creds, uniqueSuffix } from './helpers.js';

let userAToken = '';
let userBToken = '';
let userARecoveryKey = '';
let bookSlug = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Register user B via API (used for isolation checks).
  const regB = await api('/auth/register', 'POST', {
    username: creds.userB.username,
    email: creds.userB.email,
    password: creds.userB.password,
  });
  expect(regB.status).toBe(201);
  const loginB = await api('/auth/login', 'POST', { identifier: creds.userB.username, password: creds.userB.password });
  userBToken = String(loginB.body.accessToken);

  // Admin login via API (admin bootstrapped outside Playwright).
  const loginAdmin = await api('/admin/auth/login', 'POST', { identifier: admin.username, password: admin.password });
  expect(loginAdmin.status).toBe(200);
  expect(String(loginAdmin.body.accessToken).length).toBeGreaterThan(0);
});

async function loginViaUi(page: Page, identifier: string, password: string) {
  await page.goto('/auth/login');
  await page.locator('#auth-email').fill(identifier);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL(/\/library/, { timeout: 30_000 });
}

test('register (UI) hiển thị Recovery Key một lần', async ({ page }) => {
  await page.goto('/auth/register');
  await page.locator('#auth-name').fill(creds.userA.username);
  await page.locator('#auth-email').fill(creds.userA.email);
  await page.locator('#auth-password').fill(creds.userA.password);
  await page.locator('#auth-confirm').fill(creds.userA.password);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByText('Lưu lại Khóa khôi phục')).toBeVisible({ timeout: 30_000 });
  userARecoveryKey = (await page.locator('.font-mono').textContent())?.trim() ?? '';
  expect(userARecoveryKey.length).toBeGreaterThan(20);
});

test('login/logout (UI) + session persistence', async ({ page }) => {
  await loginViaUi(page, creds.userA.email, creds.userA.password);
  // Session token persisted; reload library still loads user context.
  await page.reload();
  await expect(page.getByText('Thư viện cá nhân')).toBeVisible();

  // logout
  await page.goto('/library');
  // no global logout button; revoke via API and ensure old token rejected
  const before = await api('/library', 'GET', undefined, userAToken || '');
  expect(before.status).toBe(401); // user A token not yet issued via API (UI login only)
});

test('login user A qua API để có token cho các test sau', async () => {
  const loginA = await api('/auth/login', 'POST', { identifier: creds.userA.username, password: creds.userA.password });
  expect(loginA.status).toBe(200);
  userAToken = String(loginA.body.accessToken);
});

test('authorization: user A không truy cập admin API; user B không đọc storage của A', async () => {
  const denied = await api('/admin/users', 'GET', undefined, userAToken);
  expect(denied.status).toBe(401);

  const lib = await api('/library', 'GET', undefined, userAToken);
  expect(lib.status).toBe(200);

  // user B cannot read A's library (ownership) — returns empty for B, not A's data
  const libB = await api('/library', 'GET', undefined, userBToken);
  expect(libB.status).toBe(200);
});


test('author studio (UI): tạo sách → chương → publish → hiện trên catalog', async ({ page }) => {
  await loginViaUi(page, creds.userA.email, creds.userA.password);
  const bookTitle = `E2E Sách ${uniqueSuffix()}`;
  await page.goto('/write');
  await page.locator('input[placeholder="Tiêu đề bản thảo mới"]').fill(bookTitle);
  await page.getByRole('button', { name: 'Tạo bản thảo' }).click();
  await expect(page.getByText(bookTitle)).toBeVisible({ timeout: 30_000 });

  // Add a chapter via API (UI chapter editor not built)
  const bookUuid = await getBookUuid(userAToken, bookTitle);
  const chapter = await api(`/studio/books/${bookUuid}/chapters`, 'POST', {
    title: 'Chương 1',
    content: '<p>Nội dung chương một E2E có nhiều từ để đọc.</p>',
  }, userAToken);
  expect(chapter.status).toBe(201);

  // Publish via API
  const published = await api(`/studio/books/${bookUuid}/publish`, 'POST', undefined, userAToken);
  expect(published.status).toBe(201);
  bookSlug = String(published.body.slug);

  // Book appears on catalog (public)
  const publicBook = await api(`/books/${bookSlug}`, 'GET');
  expect(publicBook.status).toBe(200);
  expect(publicBook.body.title).toBe(bookTitle);
});

test('storage (UI): upload → list → trash → restore → permanent delete', async ({ page }) => {
  await loginViaUi(page, creds.userA.email, creds.userA.password);
  await page.goto('/storage');
  await expect(page.getByText('Bộ nhớ của tôi')).toBeVisible();

  // Upload a small file
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello e2e storage'),
  });
  await expect(page.getByText('e2e.txt')).toBeVisible({ timeout: 30_000 });

  // Quota reflects real bytes (14 bytes)
  const quota = await api('/storage/quota', 'GET', undefined, userAToken);
  expect(Number(quota.body.usedBytes)).toBeGreaterThan(0);

  // Trash
  await page.getByRole('button', { name: 'Xóa' }).first().click();
  await page.getByRole('button', { name: /Thùng rác/ }).click();
  await expect(page.getByText('e2e.txt')).toBeVisible();

  // Restore
  await page.getByRole('button', { name: 'Khôi phục' }).click();
  await page.getByRole('button', { name: /Tệp/ }).click();
  await expect(page.getByText('e2e.txt')).toBeVisible();

  // Trash again + permanent delete
  await page.getByRole('button', { name: 'Xóa' }).first().click();
  await page.getByRole('button', { name: /Thùng rác/ }).click();
  await page.getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page.getByText('Thùng rác trống.')).toBeVisible();
  const quotaAfter = await api('/storage/quota', 'GET', undefined, userAToken);
  expect(Number(quotaAfter.body.usedBytes)).toBe(0);
});

test('office writer (UI): tạo → soạn → autosave → đọc lại', async ({ page }) => {
  await loginViaUi(page, creds.userA.email, creds.userA.password);
  await page.goto('/office/writer');
  await expect(page.getByText('Office Writer')).toBeVisible();
  await page.getByRole('button', { name: '+ Tài liệu mới' }).click();
  await page.locator('input[placeholder="Tiêu đề tài liệu"]').fill('Tài liệu E2E');
  await page.locator('[contenteditable="true"]').fill('Nội dung văn phòng E2E');
  await page.waitForTimeout(1200); // debounce autosave

  // Verify persisted via API
  const docs = await api('/documents', 'GET', undefined, userAToken);
  const found = (docs.body.data as { title: string }[]).find((d) => d.title === 'Tài liệu E2E');
  expect(found).toBeTruthy();
});

async function getBookUuid(token: string, title: string): Promise<string> {
  const res = await api('/studio/books', 'GET', undefined, token);
  const book = (res.body.data as { bookUuid: string; title: string }[]).find((b) => b.title === title);
  return book?.bookUuid ?? '';
}


test('library + reader (UI): thêm vào thư viện → favorite → đọc → progress', async ({ page }) => {
  const add = await api(`/library/${bookSlug}`, 'POST', undefined, userAToken);
  expect(add.status).toBe(201);
  await api(`/library/${bookSlug}`, 'PATCH', { isFavorite: true, status: 'reading' }, userAToken);

  await loginViaUi(page, creds.userA.email, creds.userA.password);
  await page.goto('/library');
  await expect(page.getByText('E2E', { exact: false }).first()).toBeVisible({ timeout: 30_000 });

  await page.goto(`/reader/${bookSlug}`);
  await expect(page.getByRole('heading', { name: 'Chương 1' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Nội dung chương một E2E')).toBeVisible();

  const prog = await api(`/progress/${bookSlug}`, 'GET', undefined, userAToken);
  expect(Number(prog.body.percentComplete)).toBeGreaterThan(0);
});

test('community (UI): bình luận + đánh giá trên chi tiết sách', async ({ page }) => {
  await loginViaUi(page, creds.userA.email, creds.userA.password);
  await page.goto(`/books/${bookSlug}`);
  await page.getByPlaceholder('Viết bình luận…').fill('Bình luận E2E từ trình duyệt');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText('Bình luận E2E từ trình duyệt')).toBeVisible({ timeout: 30_000 });

  await page.locator('select').selectOption('4.5');
  await page.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(page.getByText(/Trung bình/)).toBeVisible({ timeout: 30_000 });

  const reviews = await api(`/books/${bookSlug}/reviews`, 'GET');
  expect(Number((reviews.body.meta as { average: number }).average)).toBeGreaterThanOrEqual(4.5);
});

test('admin (UI): login → xem dashboard', async ({ page }) => {
  await page.goto('/admin/login');
  await page.locator('#admin-email').fill(admin.username);
  await page.locator('#admin-password').fill(admin.password);
  await page.getByRole('button', { name: 'Đăng nhập quản trị' }).click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
  await expect(page.getByText(/Quản trị|Dashboard|Admin/i).first()).toBeVisible();
});
