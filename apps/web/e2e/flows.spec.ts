import { readFile } from 'node:fs/promises';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * E2E chạy trên stack test riêng (MariaDB :3308 / Meili :7701 / API :3200 / web :3100).
 * Không dùng tài khoản, DB hay storage production nào.
 */
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3200';
const TOKEN_KEY = 'bff_access_token';

const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function unique(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

type JsonResult = { status: number; body: Record<string, unknown> };

async function json(
  request: APIRequestContext,
  path: string,
  method: string,
  body?: unknown,
  token?: string,
): Promise<JsonResult> {
  const response = await request.fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    data: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return { status: response.status(), body: parsed };
}

async function seedAuthor(request: APIRequestContext) {
  const username = unique('e2e');
  const password = 'password123';
  const registered = await json(request, '/auth/register', 'POST', {
    username,
    email: `${username}@example.com`,
    password,
  });
  expect(registered.status).toBe(201);

  const login = await json(request, '/auth/login', 'POST', { identifier: username, password });
  expect(login.status).toBe(200);
  const token = String(login.body.accessToken);

  const title = `E2E Studio ${username}`;
  const book = await json(request, '/studio/books', 'POST', { title }, token);
  expect(book.status).toBe(201);
  const bookUuid = String(book.body.bookUuid);

  const chapter = await json(
    request,
    `/studio/books/${bookUuid}/chapters`,
    'POST',
    { title: 'Chương 1', content: 'Nội dung ban đầu' },
    token,
  );
  expect(chapter.status).toBe(201);

  return { username, password, token, title, bookUuid };
}

async function signIn(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [TOKEN_KEY, token] as const,
  );
}
const ADMIN = {
  username: process.env.E2E_ADMIN_USER ?? 'e2e_admin',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'E2eAdminPass123!',
};

async function uiLogin(page: Page, identifier: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#auth-email').fill(identifier);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/library/, { timeout: 30_000 });
}

async function uiLogout(page: Page): Promise<void> {
  const logoutButton = page.getByRole('button', { name: 'Đăng xuất' }).first();
  if (!(await logoutButton.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Mở menu' }).click();
  }
  await page.getByRole('button', { name: 'Đăng xuất' }).first().click();
  await page.waitForFunction((key) => window.localStorage.getItem(key) === null, TOKEN_KEY, {
    timeout: 20_000,
  });
}

async function seedBookWithTwoChapters(request: APIRequestContext) {
  const author = await seedAuthor(request);
  const second = await json(
    request,
    `/studio/books/${author.bookUuid}/chapters`,
    'POST',
    { title: 'Chương 2', content: 'Nội dung chương hai' },
    author.token,
  );
  expect(second.status).toBe(201);
  return { ...author, secondChapterUuid: String(second.body.chapterUuid) };
}



test('auth: hồ sơ thật khi có token, đăng xuất xoá phiên', async ({ page, request }) => {
  const { username, token } = await seedAuthor(request);
  await signIn(page, token);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);

  await uiLogout(page);
  await page.goto('/profile');
  await expect(page.getByText('Đăng nhập để xem hồ sơ')).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY)).toBeNull();
});

test('auth: session 401 clears stale token and restores logged-out UI', async ({ page }) => {
  await page.addInitScript(
    ([key, token]) => window.localStorage.setItem(key as string, token as string),
    [TOKEN_KEY, 'invalid-e2e-session'] as const,
  );
  await page.goto('/profile');

  await expect(page.getByText('Đăng nhập để xem hồ sơ')).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY))
    .toBeNull();
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0);
});

test('mobile layout: header không tạo tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/office/writer');
  await expect(page.getByRole('banner')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test('studio: autosave chương, tải ảnh bìa, publish hiển thị công khai', async ({ page, request }) => {
  const { token, bookUuid } = await seedAuthor(request);
  await signIn(page, token);

  await page.goto(`/write/${bookUuid}`);
  const chapterTitle = page.getByText('Chương 1').first();
  if (await chapterTitle.isVisible().catch(() => false)) {
    await chapterTitle.click();
  }

  const content = page.locator('#chapter-content');
  await expect(content).toBeVisible();
  await content.fill('Nội dung đã sửa bằng E2E');
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(page.locator('#chapter-content')).toContainText('Nội dung đã sửa bằng E2E', { timeout: 20_000 });

  await page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp,image/gif"]').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: COVER_PNG,
  });
  await expect(page.getByAltText('Ảnh bìa hiện tại')).toBeVisible({ timeout: 30_000 });

  const published = await json(request, `/studio/books/${bookUuid}/publish`, 'POST', undefined, token);
  expect(published.status).toBe(201);
  const slug = String(published.body.slug);

  await page.goto(`/books/${slug}`);
  await expect(page.getByAltText(/Bìa sách/)).toBeVisible({ timeout: 20_000 });
});

test('studio rich text: format, autosave, reload and export Vietnamese PDF with image', async ({ page, request }) => {
  const { token, bookUuid } = await seedAuthor(request);
  await signIn(page, token);
  await page.goto(`/write/${bookUuid}`);

  const editor = page.locator('#chapter-content');
  await expect(editor).toBeVisible();
  const paragraphs = Array.from({ length: 100 }, (_, index) =>
    `Đoạn ${index + 1}: Tiếng Việt có dấu — sách, chương, độc giả và những câu chuyện được lưu tự động.`,
  ).join('\n');
  await editor.fill(paragraphs);
  await editor.press('Control+A');
  await page.getByRole('button', { name: 'Đậm (Ctrl+B)' }).click();
  await page.getByLabel('Phông chữ').selectOption('Georgia, serif');
  await page.getByLabel('Cỡ chữ').selectOption('24');
  await page.getByRole('button', { name: 'Căn giữa' }).click();
  await page.getByRole('button', { name: 'Danh sách dấu đầu dòng' }).click();
  await expect(editor.locator('strong').first()).toContainText('Tiếng Việt');
  await expect(editor.locator('span[style*="font-family"]').first()).toBeVisible();
  await expect(editor.locator('span[style*="24px"]').first()).toBeVisible();
  await expect(editor.locator('ul').first()).toBeVisible();

  await page.getByLabel('Tìm', { exact: true }).fill('được lưu tự động');
  await page.getByLabel('Thay bằng', { exact: true }).fill('đã được lưu');
  await page.getByRole('button', { name: 'Thay tất cả' }).click();
  await expect(editor).toContainText('đã được lưu');
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(editor).toContainText('được lưu tự động');
  await page.getByRole('button', { name: 'Làm lại' }).click();
  await expect(editor).toContainText('đã được lưu');

  await page.locator('input[type="file"]').last().setInputFiles({
    name: 'minh-hoa.png',
    mimeType: 'image/png',
    buffer: COVER_PNG,
  });
  await expect(page.getByText('Đã tải ảnh lên Bộ nhớ và chèn vào nội dung.')).toBeVisible({ timeout: 30_000 });
  await expect(editor.locator('img')).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(editor).toContainText('Tiếng Việt', { timeout: 20_000 });
  await expect(editor.locator('strong').first()).toContainText('Tiếng Việt');
  await expect(editor.locator('img')).toHaveCount(1, { timeout: 30_000 });

  await page.getByRole('button', { name: 'Xem trước' }).click();
  const preview = page.getByRole('dialog', { name: 'Xem trước bản thảo' });
  await expect(preview).toContainText('Tiếng Việt');
  await expect(preview.locator('img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Đóng' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const pdf = await readFile(path!);
  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0).toBeGreaterThan(1);
});

test('office writer: rich text persists and exports a PDF', async ({ page, request }) => {
  const { token } = await seedAuthor(request);
  await signIn(page, token);
  await page.goto('/office/writer');
  await page.getByRole('button', { name: '+ Tài liệu mới' }).click();

  const editor = page.locator('#document-content');
  await expect(editor).toBeVisible();
  await editor.fill('Tài liệu Office tiếng Việt có định dạng.');
  await editor.press('Control+A');
  await page.getByRole('button', { name: 'Đậm (Ctrl+B)' }).click();
  await expect(editor.locator('strong')).toContainText('Tài liệu Office');
  await expect(page.getByRole('status')).toHaveText('Đã lưu', { timeout: 20_000 });

  await page.reload();
  await expect(editor).toContainText('Tài liệu Office', { timeout: 20_000 });
  await expect(editor.locator('strong')).toContainText('Tài liệu Office');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide the downloaded PDF path.');
  const pdf = await readFile(path);
  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
});

test('comments: thêm, sửa, xoá bình luận của chính mình', async ({ page, request }) => {
  const { token, bookUuid } = await seedAuthor(request);
  const published = await json(request, `/studio/books/${bookUuid}/publish`, 'POST', undefined, token);
  const slug = String(published.body.slug);

  await signIn(page, token);
  await page.goto(`/books/${slug}`);

  await page.getByPlaceholder('Viết bình luận…').fill('Bình luận E2E');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText('Bình luận E2E')).toBeVisible();

  await page.getByRole('button', { name: 'Sửa' }).first().click();
  await page.getByPlaceholder('Sửa bình luận…').fill('Bình luận đã sửa');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Bình luận đã sửa')).toBeVisible();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Xoá' }).first().click();
  await expect(page.getByText('Bình luận đã sửa')).toHaveCount(0);
});

test('catalog + search: sách đã publish xuất hiện, trang search phản hồi', async ({ page, request }) => {
  const { token, bookUuid, title } = await seedAuthor(request);
  await json(request, `/studio/books/${bookUuid}/publish`, 'POST', undefined, token);

  await page.goto(`/discover?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`/search?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('catalog filters: category, author và publisher gửi bộ lọc trên desktop và mobile', async ({ page }, testInfo) => {
  const bookQueries: string[] = [];
  await page.route('**/categories', (route) =>
    route.fulfill({
      json: {
        data: [{ category_id: 1, parent_category_id: null, name: 'Danh mục kiểm thử', slug: 'test-category', description: null, sort_order: 1, is_active: 1 }],
      },
    }),
  );
  await page.route('**/authors', (route) =>
    route.fulfill({
      json: {
        data: [{ author_id: 1, author_uuid: 'test-author-uuid', name: 'Tác giả kiểm thử', slug: 'test-author', bio: null }],
      },
    }),
  );
  await page.route('**/publishers', (route) =>
    route.fulfill({
      json: {
        data: [{ publisher_id: 1, name: 'Nhà xuất bản kiểm thử', slug: 'test-publisher', description: null }],
      },
    }),
  );
  await page.route('**/books?*', (route) =>
    route.fulfill({ json: { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } } }),
  );
  page.on('request', (request) => {
    if (request.url().includes('/books?')) bookQueries.push(request.url());
  });

  await page.goto('/discover');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  }
  const suffix = testInfo.project.name === 'mobile' ? 'mobile' : 'desktop';
  const categoryFilter = page.locator(`#discover-category-${suffix}`);
  const authorFilter = page.locator(`#discover-author-${suffix}`);
  const publisherFilter = page.locator(`#discover-publisher-${suffix}`);
  await expect(categoryFilter.locator('option[value="test-category"]')).toHaveCount(1);
  await expect(authorFilter.locator('option[value="test-author"]')).toHaveCount(1);
  await expect(publisherFilter.locator('option[value="test-publisher"]')).toHaveCount(1);
  await categoryFilter.selectOption('test-category');
  await expect(page).toHaveURL(/category=test-category/);
  await authorFilter.selectOption('test-author');
  await expect(page).toHaveURL(/author=test-author/);
  await publisherFilter.selectOption('test-publisher');
  await expect(page).toHaveURL(/publisher=test-publisher/);
  await expect
    .poll(() =>
      bookQueries.some((url) => {
        const query = new URL(url).searchParams;
        return (
          query.get('category') === 'test-category' &&
          query.get('author') === 'test-author' &&
          query.get('publisher') === 'test-publisher'
        );
      }),
    )
    .toBe(true);
});

test('history: trang lịch sử đọc hiển thị trạng thái rỗng hoặc dữ liệu', async ({ page, request }) => {
  const { token } = await seedAuthor(request);
  await signIn(page, token);
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Lịch sử đọc', exact: true })).toBeVisible();
});

test('responsive: không tràn ngang trên thiết bị nhỏ', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.locator('main, body').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('auth UI: đăng nhập bằng username, giữ phiên sau reload và đăng xuất', async ({ page, request }) => {
  const { username, password } = await seedAuthor(request);
  await uiLogin(page, username, password);
  await expect(page.getByText('Kệ sách của tôi')).toBeVisible();

  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);

  await uiLogout(page);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY)).toBeNull();

  await page.goto('/profile');
  await expect(page.getByText('Đăng nhập để xem hồ sơ')).toBeVisible();
});

test('studio UI: tạo sách, sửa thông tin, chương, autosave, reorder, publish/unpublish', async ({ page, request }) => {
  const { username, password, token } = await seedAuthor(request);
  await uiLogin(page, username, password);

  await page.goto('/write');
  const title = `E2E UI Studio ${Date.now().toString(36)}`;
  await page.locator('#new-title').fill(title);
  await page.locator('#new-subtitle').fill('Phụ đề E2E');
  await page.getByRole('button', { name: 'Tạo bản thảo' }).click();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

  const books = await json(request, '/studio/books', 'GET', undefined, token);
  const created = (books.body.data as { bookUuid: string; title: string }[]).find((book) => book.title === title);
  expect(created?.bookUuid).toBeTruthy();
  const bookUuid = String(created?.bookUuid);

  await page.goto(`/write/${bookUuid}`);
  await page.locator('#studio-title').fill(`${title} (sửa)`);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Đã lưu thông tin sách.')).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder('Chương 1').fill('Chương 1');
  await page.getByRole('button', { name: 'Thêm chương' }).click();
  await expect(page.getByText('1. Chương 1')).toBeVisible({ timeout: 20_000 });

  await expect(page.locator('#chapter-content')).toBeVisible();
  await page.locator('#chapter-content').fill('Nội dung chương một đã sửa bằng E2E');
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible({ timeout: 25_000 });

  await page.getByPlaceholder('Chương 2').fill('Chương 2');
  await page.getByRole('button', { name: 'Thêm chương' }).click();
  await expect(page.getByText('2. Chương 2')).toBeVisible({ timeout: 20_000 });
  await page.locator('#chapter-content').fill('Nội dung chương hai bằng E2E');
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible({ timeout: 25_000 });

  await page.getByRole('button', { name: 'Đưa "Chương 1" xuống' }).click();
  await expect(page.locator('ol li').first()).toContainText('Chương 2', { timeout: 20_000 });

  await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
  await expect(page.getByText('Đã xuất bản').first()).toBeVisible({ timeout: 25_000 });

  const publishedBooks = await json(request, `/books?q=${encodeURIComponent(`${title} (sửa)`)}`, 'GET');
  const publishedRow = (publishedBooks.body.data as { slug: string; title: string }[]).find((book) => book.title === `${title} (sửa)`);
  expect(publishedRow?.slug).toBeTruthy();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Gỡ xuất bản' }).click();
  await expect(page.getByText('Bản nháp').first()).toBeVisible({ timeout: 25_000 });
});

test('reader + library + history: đọc sách, lưu thư viện và deep-link đúng chương', async ({ page, request }, testInfo) => {
  const { token, bookUuid, title } = await seedBookWithTwoChapters(request);
  const published = await json(request, `/studio/books/${bookUuid}/publish`, 'POST', undefined, token);
  expect(published.status).toBe(201);
  const slug = String(published.body.slug);

  const chapters = await json(request, `/books/${slug}/chapters`, 'GET');
  const chapterRows = chapters.body.data as { chapter_uuid: string }[];
  const secondChapterUuid = String(chapterRows[1].chapter_uuid);

  await signIn(page, token);
  await page.goto(`/library`);
  await expect(page.getByText('Kệ sách của tôi')).toBeVisible();

  const added = await json(request, `/library/${slug}`, 'POST', undefined, token);
  expect(added.status).toBe(201);
  await page.reload();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`/reader/${slug}`);
  await expect(page.getByRole('heading', { name: 'Chương 1' })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Nội dung ban đầu')).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: /Sau/ }).click();
  } else {
    await page.getByRole('button', { name: /Chương 2/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Chương 2' })).toBeVisible();
  await expect(page).toHaveURL(/chapter=/);

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Lịch sử đọc', exact: true })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Chương 2/).first()).toBeVisible();
  const deepLink = page.getByRole('link', { name: 'Đọc tiếp' }).first();
  await expect(deepLink).toHaveAttribute('href', new RegExp(`/reader/${slug}\\?chapter=`));

  await deepLink.click();
  await expect(page).toHaveURL(new RegExp(`/reader/${slug}\\?chapter=${secondChapterUuid}`));
  await expect(page.getByRole('heading', { name: 'Chương 2' })).toBeVisible({ timeout: 25_000 });
});

test('admin UI: đăng nhập quản trị, xem dashboard và danh sách người dùng', async ({ page }) => {
  await page.goto('/admin/login');
  await page.locator('#admin-email').fill(ADMIN.username);
  await page.locator('#admin-password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Đăng nhập quản trị' }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Tổng người dùng')).toBeVisible();

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Danh sách người dùng' })).toBeVisible({ timeout: 25_000 });
});

test('comments UI: người khác không thấy nút sửa/xoá bình luận của chủ sở hữu', async ({ page, request }) => {
  const author = await seedAuthor(request);
  const published = await json(request, `/studio/books/${author.bookUuid}/publish`, 'POST', undefined, author.token);
  const slug = String(published.body.slug);

  const other = await seedAuthor(request);
  const comment = await json(request, `/books/${slug}/comments`, 'POST', { body: 'Bình luận của tác giả' }, author.token);
  expect(comment.status).toBe(201);

  await signIn(page, other.token);
  await page.goto(`/books/${slug}`);
  await expect(page.getByText('Bình luận của tác giả')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Sửa' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xoá' })).toHaveCount(0);
});


