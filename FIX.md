# FIX.md — BOOKFORFREEDOM UI/UX Reference

> **Phase 1–2 — Homepage + Discover modernization** · 2026-11-23
> This file is the single source of truth for every AI/designer working on this repo.
> Read it before changing UI. Append a new phase section instead of rewriting old decisions.

---

## 1. Scope & principles

Phase 1 covers the **home page** and the shared design tokens/components used by it.

Principles:
1. **Modern, compact, utility-first** — inspired by Wattpad's dense book shelves, not a poetic/literary landing page.
2. **Smaller everything** — book covers, buttons, section spacing and type scale are intentionally compact.
3. **Sans-serif by default** — no serif headings on the home page. Lora may remain only inside the reader/book artwork.
4. **Consistent tokens** — never hardcode a new color/size in a component when a token exists below.
5. **Mobile first** — 3 book columns at 390px, no horizontal overflow.
6. **Stable floating actions** — the 3-dot home menu is fixed and never moves with scroll.
7. **Neutral copy** — short, functional sentences. Avoid poetic taglines such as “tâm hồn tự do”; use “đọc, viết, khám phá”.

Out of scope for Phase 1: auth, library, reader, studio, storage, admin, community feed.

---

## 2. Color tokens

Source: `apps/web/src/app/globals.css` + `apps/web/tailwind.config.ts`.

| Thành phần | Tên màu | HEX | CSS variable | Tailwind |
|---|---|---|---|---|
| Nền website | Soft Ivory White | `#FDFCF8` | `--background: 253 252 248` | `bg-background` |
| Header | Warm Pure White | `#FFFEFC` | `--header: 255 254 252` | `bg-header` |
| Card | Pure White | `#FFFFFF` | `--card: 255 255 255` | `bg-card` |
| Xanh nhấn | Soft Neon Aqua | `#8DE8E8` | `--accent: 141 232 232` | `bg-accent`, `text-accent` |
| Nút chính | Aqua Cyan | `#4CCFD0` | `--primary: 76 207 208` | `bg-primary`, `text-primary` |
| Xanh đậm | Deep Teal | `#245B5C` | `--primary-foreground: 36 91 92` | `text-primary-foreground` |
| Chữ chính | Charcoal | `#303633` | `--foreground: 48 54 51` | `text-foreground` |
| Viền | Light Gray | `#EAECE9` | `--border: 234 236 233` | `border-border` |

Supporting neutrals:
- `--surface: 244 247 246` (`#F4F7F6`) — hover bands, subtle panels.
- `--muted-foreground: 95 107 103` (`#5F6B67`) — secondary text.
- `--danger: 210 76 71` — destructive actions only.

Dark mode palette:

| Token | Value |
|---|---|
| background | `#0F1B1A` |
| header/card | `#142321` |
| surface | `#11201E` |
| foreground | `#ECF5F2` |
| border | `#243B38` |
| primary | `#4CCFD0` |
| accent | `#8DE8E8` |

Rules:
- Primary action = `bg-primary text-primary-foreground`.
- Secondary action = `border-border bg-card text-foreground`.
- Hover accent for cards = `border-primary/50` + `bg-surface/50`.
- Never use the old earthy green/gold palette (`#173F35`, `#C6A66B`, …) on new UI.

---

## 3. Typography

Font: **Inter** (`--font-sans`) for all UI. Lora is legacy artwork/reader only.

| Vai trò | Size | Weight | Class chuẩn |
|---|---:|---:|---|
| Hero H1 | 24px → 30px | 600 | `text-2xl sm:text-3xl font-semibold` |
| Section title | 18px → 20px | 600 | `text-lg sm:text-xl font-semibold` |
| Page header H1 | 24px → 30px | 600 | `text-2xl sm:text-3xl font-semibold` |
| Book title (card) | 13px | 600 | `text-[13px] font-semibold leading-snug` |
| Card/action title | 13–14px | 600 | `text-[13px] font-semibold` |
| Body | 13px | 400 | `text-[13px] leading-relaxed` |
| Meta (author, rating) | 10–11px | 400 | `text-[10px]` / `text-[11px]` |
| Eyebrow | 10px | 600 | `text-[10px] uppercase tracking-[0.12em]` |
| Button | 12–13px | 600 | `text-[12px] font-semibold` / `text-[13px]` |

Rules:
- Headings use the sans font. Do **not** add `font-serif` to new home components.
- Book titles are max 2 lines (`line-clamp-2`); author is 1 line.
- No body copy below 10px; no button text below 12px.

---

## 4. Layout & spacing

- Content container: `max-width: 72rem` (1152px), padding `1rem` / `1.5rem` (`container-site`).
- Header height: **56px** (`h-14`).
- Main min-height: `calc(100vh - 3.5rem)`.
- Section padding: `py-6` mobile / `py-8` desktop. Never `py-16` on the home page.
- Vertical rhythm: `mt-2` title groups, `mt-4` content after a section heading.
- Book grid gap: `gap-x-3` (12px), `gap-y-5` (20px).
- Category grid gap: `gap-2` (8px).
- Card radius: `rounded-xl` (12px). Cover radius: `rounded-md` (6px). Button/input radius: full (`rounded-full`).
- Shadows: `shadow-soft` for cards, `shadow-lift` for floating/dropdown UI.
- No oversized empty states: `px-4 py-8`, icon 40px.

Responsive breakpoints:
| Breakpoint | Book columns | Category columns |
|---|---:|---:|
| base (mobile) | 3 | 2 |
| `sm` 640px | 4 | 3 |
| `md` 768px | 4 | 3 |
| `lg` 1024px | 5 | 4 |
| `xl` 1280px | 5 | 5 |

Measured at 1440px: cover ≈ **211 × 317px**. At 390px: ≈ **111 × 167px**.
The home page uses the same **5-books-per-row** desktop standard as Discover (15 books = 3 rows).

---

## 5. Component standards

### 5.1 Header (`SiteHeader`, `Logo`)
- Height 56px; sticky; `bg-header/95` + blur; border bottom.
- Logo mark 32×32 (`rounded-lg`), wordmark 13–14px bold; subtitle 9px uppercase.
- Desktop nav links: `px-3 py-1.5 text-[13px]`, rounded-full.
- Icon buttons: 36×36, icon 16px.
- Account button: 36px height, avatar 24px.
- Mobile menu starts at `top-14`; links `px-3 py-2.5 text-sm`.
- Do not restore the 64px header or 40px icon buttons.

### 5.2 Search (`SearchBar`)
- Hero search: 44px height (`h-11`), pill, white card background, 1px border.
- Header/compact search: 36px height (`h-9`).
- Icon 16px; input 13px; submit button 32px height, 12px semibold.
- Focus: `border-ring` + subtle `ring-1 ring-ring/30`.

### 5.3 Buttons (`ui/button.tsx`)
| Size | Height | Text |
|---|---:|---|
| `sm` | 32px | 12px |
| `md` | 36px | 13px |
| `lg` | 40px | 14px |
| `icon` | 36×36 | — |

- Pill shape, `font-semibold` for primary CTAs.
- Primary = aqua; outline = border + card; ghost = transparent.
- No 48–56px buttons on the home page.

### 5.4 Book card (`BookCard` grid)
- No outer card border/background. Cover-first, Wattpad-style.
- Cover: `aspect-[2/3]`, `rounded-md`, full width.
- Title 13px semibold, max 2 lines.
- Author 11px muted, max 1 line.
- Meta row 10px: rating + language, separated by `·`.
- Hover: cover lifts 2px, title turns primary.
- List variant: compact 48px cover, 10px padding, max 2-line title.

### 5.5 Category card
- One-row tile, `p-2.5`, `gap-2.5`, `rounded-xl`.
- 36×36 colored icon tile (aqua palette).
- Name 13px semibold, description 11px muted, one line each.
- Chevron 16px.
- No 96px banner headers on category cards.

### 5.6 Section heading
- Eyebrow 10px uppercase primary, title 18–20px semibold, description 12–13px.
- Action link 12px semibold primary.
- “Xem tất cả / Tất cả danh mục” links use the **horizontal 3-dot icon** (`MoreHorizontalIcon`, 20px, dots `r=2.8` at `cx=4/12/20`), not an arrow.
- `mt-4` between heading and content.

### 5.7 Footer
- Thin single-row footer on desktop: `mt-8`, `py-3`, `text-[10px]`–`text-[11px]`.
- No “Khám phá” / “Thông tin” column headings, no multi-row link lists.
- Layout: `Logo` + optional tagline (xl only) · inline nav + legal links · copyright/version.
- Links wrap on small screens; footer remains compact, not a second navigation block.
- No long maintenance/legal warning copy.

---

## 6. Floating 3-dot home menu (`HomeQuickMenu`)

File: `apps/web/src/components/home/home-quick-menu.tsx`.

Behavior:
- Hidden while `window.scrollY <= 220` (above/at the hero search).
- Appears after scrolling past the toolbar/search area.
- **Fixed** at `right: 12px` (mobile) / `right: 20px` (sm+), vertically centered (`top: 50%`).
- Button: 44×44, aqua primary, three vertical dots, `z-index: 60`.
- Panel: 192px wide, opens to the left, `rounded-xl`, white card, border, shadow-lift.
- Panel does **not** move when the page scrolls.
- **In-page actions (no navigation):**
  - `Trang chủ` → scroll to top.
  - `Tìm kiếm` → focus `#home-search` and scroll it into view.
- **Top-level navigation links only:** Khám phá, Danh mục, Thư viện, Viết sách, Cộng đồng.
- Close on: outside click, `Escape`, selecting an item, or pressing the button again.
- Accessibility: `aria-expanded`, `aria-controls`, `aria-label`, visible focus ring.

Do not turn this into a scroll-following/sticky-in-flow element; it must stay at the same viewport coordinates.

### 6.1 Home search must stay in-page

- Hero search uses `HomeSearch` (`apps/web/src/components/home/home-search.tsx`) with `onSearch`.
- Submitting a query **must not** navigate to `/search`; results render in a compact panel under the input.
- Data source: `fetchBooks({ q, limit: 12 })` (catalog SQL), not the Meilisearch `/search` page.
- Panel: max-height 55vh, scrollable, 32px covers, 12px titles, 10px author/rating.
- Tiny result covers use `BookCover minimal` (gradient-only placeholder), so placeholder text never clips.
- Empty query closes the panel; `Close` clears results and refocuses `#home-search`.
- Hide the native WebKit search clear button (`::-webkit-search-cancel-button`); the panel has its own close control.
- The `/search` page keeps its full-page behaviour. On the home page, the header search icon also focuses `#home-search` instead of navigating to `/search`.

---

## 7. Home page structure

1. `Hero` — compact banner (max 2 lines of copy), **in-page `HomeSearch`**, 2 primary CTAs, 3 small feature chips, decorative aqua cover tiles on desktop only.
2. `Sách mới cập nhật` — 15 newest books, 5-column desktop grid (3 rows), "Xem tất cả".
3. `Khám phá theo chủ đề` — 10 compact category tiles, 2/3/4/5-column grid.
4. `Công cụ của bạn` — 3 compact action cards (Write, Storage, Office Writer).
5. `Cộng đồng đọc sách` — one slim CTA card, not a large empty state.
6. `HomeQuickMenu` — fixed 3-dot menu.

No giant BookShelf illustration, no 3-column large capability cards, no large empty-state blocks on the home page.

---

## 8. Accessibility

- All interactive elements keep `focus-ring`.
- Floating menu must be reachable by keyboard and closable with `Escape`.
- Icon-only buttons need `aria-label`.
- Text contrast: Charcoal on ivory, Deep Teal on aqua, white on Deep Teal.
- Respect `prefers-reduced-motion` (global CSS already disables animations).
- Maintain 0 horizontal overflow at 390px.

---

## 9. Do / Don't for other AIs

**Do**
- Reuse `bg-background`, `bg-header`, `bg-card`, `bg-primary`, `text-foreground`, `border-border`.
- Use `container-site` + `py-6 sm:py-8` for page sections.
- Use the compact book/category/button sizes above.
- Run typecheck + Playwright before declaring a UI change done.
- Append a new phase section to this file when changing the standard.

**Don't**
- Don't reintroduce `font-serif`, earthy greens/golds, 48–96px hero text, or `py-16` home sections.
- Don't wrap every book in a bordered card with 16px padding.
- Don't make the floating menu sticky-in-flow or move it with the page.
- Don't use placeholder/fake book data in production.
- Don't change the palette in only one component; change the tokens in `globals.css`.

---

## 10. Files touched in Phase 1

- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/lib/site.ts`
- `apps/web/src/components/home/hero.tsx`
- `apps/web/src/components/home/featured-books.tsx`
- `apps/web/src/components/home/category-grid.tsx`
- `apps/web/src/components/home/category-card.tsx`
- `apps/web/src/components/home/home-quick-menu.tsx` (new)
- `apps/web/src/components/home/home-search.tsx` (new)
- `apps/web/src/components/books/book-card.tsx`
- `apps/web/src/components/books/book-cover.tsx`
- `apps/web/src/components/search-bar.tsx`
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/components/site-footer.tsx`
- `apps/web/src/components/logo.tsx`
- `apps/web/src/components/theme-toggle.tsx`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/page-header.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/empty-state.tsx`
- `apps/web/src/components/ui/section-heading.tsx`
- `apps/web/src/components/icons.tsx`
- `FIX.md` (this file)

---

## 11. Verification checklist (Phase 1)

Local stack (isolated):
- Web: `http://127.0.0.1:3100`
- API: `http://127.0.0.1:3200`
- DB: `127.0.0.1:3308`, Meili: `127.0.0.1:7701`

Checks performed:
- [x] Body background `rgb(253, 252, 248)`.
- [x] H1 uses Inter (sans).
- [x] Desktop cover ≈ 211×317 (5 columns); mobile ≈ 111×167.
- [x] 3-dot menu hidden at top, visible after 900px scroll.
- [x] 3-dot button fixed at same coordinates at scroll 900 and 1800.
- [x] Menu opens with 7 links + "Lên đầu trang".
- [x] 0 console errors.
- [x] 0 horizontal overflow at 390px.
- [x] Dark mode background `rgb(15, 27, 26)`.
- [x] Footer desktop height ≈ 53px; mobile ≈ 111px; single-row layout.
- [x] Home “Xem tất cả / Tất cả danh mục” use horizontal 3-dot icon; no `→` text remains.
- [x] `pnpm --filter @bff/web typecheck` — pass.
- [x] `pnpm exec eslint apps/web/src --max-warnings=0` — pass.
- [x] `pnpm --filter @bff/web test` — 21/21 pass.
- [x] `pnpm --filter @bff/web build` — 23 routes, exit 0.

Build note: stop `next dev` and remove `apps/web/.next` before `next build`; running both on the same `.next` caused `Invariant: no direct app page entry found for /_not-found`. The black “N” circle in local screenshots is the Next.js dev indicator only.

Commands:
```bash
pnpm --filter @bff/web typecheck
pnpm --filter @bff/web test
# local visual check
node <playwright-script>
```

---

## 12. Phase 2 — Discover page

- Grid: **5 columns at desktop** (`lg`), 4 at `md`, 3 at `sm`, 2 on mobile.
- Page size is responsive so every page has **max 3 rows**:
  - 2 cols → 6 books
  - 3 cols → 9 books
  - 4 cols → 12 books
  - 5 cols → 15 books
- Pagination is always shown when `meta.total > 0` (even with one page).
  - Edges: `<<` (page 1) and `>>` (last page), with `aria-label`/`title`.
  - Middle: `Trước` / page numbers / `Sau`.
  - Page window: first, last, and current ±5.
  - Pages farther than 5 from the current page are hidden; any gap becomes `…`.
  - URL uses `?page=N`; page 1 omits the param.
  - Scroll position is preserved (`scroll: false`).
  - All pagination buttons: `h-8`, `leading-none`, centered text (no uneven baselines).
- `DiscoverQuickMenu` (fixed 3-dot):
  - Appears after `scrollY > 220`, fixed right center, 44×44, `z-index: 60`.
  - Panel: `w-[min(18rem,calc(100vw-5rem))]`, `max-h-[75vh]`, internal scroll.
  - Menu: Tìm kiếm, Bộ lọc, Xóa bộ lọc, Trang đầu, Trang cuối.
  - `Tìm kiếm` expands an input **in the panel**, autoFocus; submitting updates `?q=` in place.
  - `Bộ lọc` expands category/author/publisher/year/sort controls in the panel; the **author input autoFocus** so typing can start immediately; `Áp dụng` updates the URL in place.
  - No jump to the top; page remains at the current scroll position.
  - Compact fields: `h-8`, text 12px; buttons `h-8`, text 11px.
- Author/publisher are **free-text inputs** with datalist suggestions, not “all only” selects. Typing a name updates `?author=` / `?publisher=` and the backend matches both relational slugs and `books.author_name` / `books.publisher_name` with `LIKE`.
- Toolbar search `q` matches title, subtitle, description, author name and publisher name.
- Toolbar controls (`search`, `sort`, `Lưới`, `DS`, `Xóa bộ lọc`) all use height **36px**; pagination buttons use **32px** with `leading-normal`, preventing clipped Vietnamese diacritics.

### 12.1 Discover files

- `apps/web/src/components/discover/discover-explorer.tsx`
- `apps/web/src/components/discover/discover-quick-menu.tsx` (new)
- `apps/api/src/catalog/catalog.service.ts` (author/publisher name LIKE + q expansion)
- `apps/api/src/search/search.service.ts` (Meili authors fallback to `books.author_name`)
- `scripts/seed-demo.mjs` (local-only bulk demo books for pagination tests)

### 12.2 Discover verification

- Desktop 1440px: 15 cards, computed grid columns = 5, 3 rows.
- Mobile 390px: 6 cards, computed grid columns = 2, exactly 3 rows.
- Pagination: page 3 → `?page=3`, last → `?page=4` (60 books), first → `/discover`.
- Quick menu filter autoFocus lands on `Danh mục`; URL becomes `?category=...`; scroll stays at 600.
- Panel measured 288×264.5 on desktop, fits viewport; no horizontal overflow.
- Local 36 books: pagination shows `<< Trước 1 2 3 Sau >>`; `<<` disabled on page 1, `>>` jumps to page 3, `<<` returns to page 1; all button heights = 32px.
- Mock 300 books, page 10: `<< Trước 1 … 5 6 7 8 9 10 11 12 13 14 15 … 20 Sau >>` — pages farther than 5 collapse.
- Author input `USaD` → 36 results; publisher input `NXB` → 6; toolbar `q=NXB` → 6.
- Toolbar controls all measured 36px high; line-height 18px (no clipped diacritics).
- 0 console errors in tests.

---

## 13. Phase 3 — Hệ thống danh mục 8 nhóm / 64 thể loại + độ tuổi

### 13.1 Mô hình dữ liệu

- `categories` giữ nguyên khóa `category_id`; bổ sung cột `icon VARCHAR(50)`.
- 8 nhóm lớn là các row `parent_category_id = NULL`.
- 64 thể loại là row con (`parent_category_id` trỏ tới nhóm), quan hệ nhiều-nhiều với sách qua `book_categories`.
- Tái dùng 10 danh mục cũ thay vì tạo bản trùng:
  - `van-hoc`, `khoa-hoc`, `lich-su`, `triet-hoc`, `nghe-thuat`, `kinh-te`, `tam-ly`, `giao-duc`, `ky-nang-song`, `thieu-nhi`.
- `tam-ly` được đổi tên hiển thị thành **Tâm lý học**, giữ nguyên slug để không phá link cũ.
- Mỗi thể loại có `name`, `slug` duy nhất, `description`, `icon`, `sort_order`, `is_active`.
- Thứ tự nhóm: 10, 20, … 80; thể loại trong nhóm: 101–110, 201–210, … 808.
- `books.age_rating` là enum riêng: `all`, `6+`, `13+`, `16+`, `18+`, `19+`; mặc định `all`.
- Độ tuổi **không** trộn vào 64 thể loại.

Migration:
- `database/sql/migrations/015_category_groups_64.sql` — idempotent, dùng `ON DUPLICATE KEY UPDATE`, không xoá dữ liệu, không đổi ID đang được sách tham chiếu.
- `database/sql/migrations/016_age_rating.sql` — thêm `books.age_rating` bằng `ADD COLUMN IF NOT EXISTS`.

### 13.2 8 nhóm và phân bổ

| # | Nhóm | Số thể loại |
|---|------|-------------|
| 1 | Kiến thức và học thuật | 10 |
| 2 | Phát triển bản thân và sự nghiệp | 10 |
| 3 | Gia đình và các mối quan hệ | 8 |
| 4 | Sức khỏe và lối sống | 6 |
| 5 | Giải trí và truyện hư cấu | 9 |
| 6 | Công nghệ và chuyên ngành | 5 |
| 7 | Văn hóa và khám phá | 8 |
| 8 | Sách giáo dục và tài liệu chuyên biệt | 8 |
| | **Tổng** | **64** |

### 13.3 API

- `GET /categories` trả:
  - `data`: 64 thể loại đang active (tương thích client cũ),
  - `groups`: 8 nhóm kèm `children`,
  - `ageRatings`: danh sách độ tuổi.
- `GET /books` hỗ trợ:
  - `?categories=van-hoc,khoa-hoc`: OR giữa các thể loại,
  - `?group=kien-thuc-hoc-thuat`: lọc toàn bộ thể loại thuộc nhóm,
  - `?category=slug`: tương thích link cũ.
- Book detail trả `age_rating`, `categories[].parent_category_id`, `group_name`, `group_slug`, `description`, `icon`.
- Studio:
  - `POST/PUT /studio/books` nhận `ageRating`,
  - `GET /studio/categories` trả 8 nhóm + children,
  - `PUT /studio/books/:uuid/categories` bỏ giới hạn 5; chỉ nhận thể loại con đang active.
- Sở thích đọc:
  - `GET /me/preferences`,
  - `PUT /me/preferences` với `{ categorySlugs }`,
  - lưu JSON trong `user_settings.preferences`.
- Admin:
  - `GET /admin/categories` (kèm `usage_count`, `child_count`),
  - `POST /admin/categories`,
  - `PUT /admin/categories/:id` (sửa, ẩn/hiện, đổi thứ tự),
  - `DELETE /admin/categories/:id` chỉ khi không có sách và không có thể loại con.
  - Quyền: `category.read/create/update/delete`.

### 13.4 UI/UX

- Trang chủ: 8 card nhóm lớn, mỗi card hiển thị mô tả + số thể loại; link `/discover?group=slug`. Không render 64 thể loại trên trang chủ.
- `/categories`: 8 nhóm dạng accordion (`<details>`), tìm kiếm trong 64 thể loại; mỗi thể loại link `/discover?categories=slug`.
- `/discover`:
  - select **Nhóm danh mục** + bộ chọn thể loại nhóm theo 8 nhóm,
  - tìm kiếm thể loại, mô tả, chip đã chọn, xoá từng chip / xoá tất cả,
  - lọc nhiều thể loại qua `?categories=slug1,slug2`,
  - quick menu dùng cùng bộ chọn, giữ nguyên vị trí scroll.
- Studio:
  - form tạo sách có chọn độ tuổi và chọn nhiều thể loại theo nhóm,
  - editor có picker nhóm/thể loại thay cho danh sách phẳng giới hạn 5,
  - metadata có select độ tuổi.
- Book detail: badge độ tuổi + chip thể loại (tooltip tên nhóm).
- `/preferences`: bộ chọn sở thích đọc theo nhóm, lưu vào tài khoản; link xem sách theo sở thích.
- `/admin/categories`: cây 8 nhóm, usage count, thêm/sửa/ẩn/hiện/xoá có kiểm tra ràng buộc.
- Community: select thể loại dùng `<optgroup>` theo 8 nhóm, không xổ 64 option phẳng.

### 13.5 Files

- `database/sql/migrations/015_category_groups_64.sql`
- `database/sql/migrations/016_age_rating.sql`
- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/studio/studio.service.ts`, `studio.controller.ts`
- `apps/api/src/admin/admin.controller.ts`
- `apps/api/src/profile/profile.service.ts`, `profile.controller.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/categories/category-picker.tsx` (new)
- `apps/web/src/components/categories/category-explorer.tsx` (new)
- `apps/web/src/components/categories/category-icon.tsx` (new)
- `apps/web/src/components/home/category-grid.tsx`, `category-card.tsx`
- `apps/web/src/components/discover/discover-explorer.tsx`, `discover-quick-menu.tsx`
- `apps/web/src/components/studio/studio-editor.tsx`
- `apps/web/src/app/write/page.tsx`
- `apps/web/src/app/preferences/page.tsx` (new)
- `apps/web/src/app/admin/categories/page.tsx` (new)
- `apps/web/src/app/categories/page.tsx`, `community/page.tsx`
- `apps/web/src/components/books/book-detail.tsx`
- `apps/web/e2e/flows.spec.ts`
- `FIX.md` (this file)

### 13.6 Verification

- DB test: 72 categories = 8 groups + 64 leaves; 36 `book_categories` links preserved.
- DB production: 72 categories = 8 groups + 64 leaves; backup trước migration tại `/var/backups/bookforfreedom/pre-category-taxonomy-*.sql.gz`.
- `GET /categories`: `data=64`, `groups=8`, first group 10 children.
- `GET /books?categories=van-hoc,khoa-hoc` → 12 sách demo; `?group=kien-thuc-hoc-thuat` → 30 sách demo.
- Admin CRUD smoke test: create → update → hide → delete temp category; 201/200/200.
- Preferences smoke test: empty → save `van-hoc,khoa-hoc` → persist; slug lạ trả 400.
- UI smoke: home 8 group links; `/categories` 8 accordion; discover 8 group controls; book detail age badge + category chip; preference picker 8 groups; admin page 8 nhóm/64 thể loại; 0 console errors.
- Playwright: `catalog filters` desktop + mobile passed.
- `pnpm --filter @bff/api typecheck` — pass.
- `pnpm --filter @bff/web typecheck` — pass.
- ESLint changed files — 0 errors, 0 warnings.

Migration commands (production, đã chạy):
```bash
docker exec -i bookforfreedom-mariadb-1 sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' \
  < database/sql/migrations/015_category_groups_64.sql
docker exec -i bookforfreedom-mariadb-1 sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' \
  < database/sql/migrations/016_age_rating.sql
```

---

## 14. Phase 4 — Author Studio theo bước, khung sách thật, trình đọc và phản hồi

### 14.1 Schema mới

- Migration `017_book_layout_reading_feedback.sql`:
  - `books.trim_size`, `trim_width_mm`, `trim_height_mm`
  - `books.page_style` (`blank`, `lines`, `grid`)
  - `books.page_effect` (`paper`, `flip`, `web`)
  - `books.show_page_numbers`
  - `books.reader_default_mode` (`page`, `flip`, `scroll`)
  - `reading_progress.seconds_read`
  - bảng `user_feedback` (góp ý/báo cáo/ý tưởng một chiều tới admin)
- Migration đã chạy trên test, staging và production:
```bash
docker exec -i bookforfreedom-mariadb-1 sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' \
  < database/sql/migrations/017_book_layout_reading_feedback.sql
```

### 14.2 Author Studio 5 bước

`/write/[bookUuid]` chia thành:

1. **Thông tin** — tên, phụ đề, tác giả, nhà xuất bản, năm xuất bản, ngôn ngữ, độ tuổi, mô tả, thể loại/nhãn.
2. **Giao diện** — ảnh bìa tự nén/cắt đúng tỉ lệ; kích thước A4/A5/B5/13×19/bỏ túi hoặc tự nhập cm; nền trang trắng/dòng kẻ/ô ly; hiệu ứng trang sách/lật/web; số trang; chế độ đọc mặc định.
3. **Nội dung** — chương tự động (5 chương) hoặc tự đặt tên; editor đặt giữa khung trang lớn, có dòng kẻ/ô ly, thống kê từ và số trang ước lượng.
4. **Xem trước** — phân trang HTML theo số từ/trang, khung đúng kích thước, điều hướng trang trước/sau, đánh số trang.
5. **Xuất bản** — checklist tên sách, tác giả, thể loại, chương, nội dung, bìa; mở modal xuất bản hiện có.

Thêm `StudioQuickMenu` (3 chấm) cố định để chuyển bước, xuất bản, lên đầu trang.

### 14.3 Trình đọc

- `BookPage` dùng chung cho writer, preview và reader.
- Ba chế độ:
  - **Trang sách thật**: khung trang theo mm, nền giấy, đánh số trang.
  - **Lật sách**: cùng khung trang + animation `book-page-turn`.
  - **Web đọc thường**: nội dung cuộn tối ưu, không bó khung.
- Phân trang nội dung theo từ, giữ khối HTML cơ bản; tiêu đề chương tự xuất hiện ở trang đầu.
- Điều hướng bàn phím trái/phải, mục lục nhảy đúng trang đầu của chương.
- Heartbeat 30 giây ghi `seconds_read`; tiến độ trang/chương đồng bộ `reading_progress`.
- Reader tự dùng `reader_default_mode` và kích thước người viết đã chọn.

### 14.4 Thư viện, cộng đồng, tài khoản

- Thư viện hiển thị thanh tiến độ %, số trang, số phút đọc; có menu 3 chấm điều hướng nhanh.
- Cộng đồng, hồ sơ cũng có menu 3 chấm điều hướng nhanh; Author Studio và Reader có menu thao tác riêng.
- Hồ sơ có thêm chỉ số **Phút đọc**.
- Cộng đồng có khối “Góc cảm hứng” theo tâm trạng đọc, sách đang chú ý và liên kết đọc thử.
- Widget **Phản hồi** cố định toàn site: góp ý/báo cáo/ý tưởng một chiều tới admin, có thể gửi khi đã đăng nhập.
- Admin có `/admin/feedback`: lọc trạng thái, đánh dấu đã đọc/đã xử lý, ghi chú nội bộ.

### 14.5 Files Phase 4

- `database/sql/migrations/017_book_layout_reading_feedback.sql`
- `apps/api/src/studio/studio.service.ts`, `studio.controller.ts`
- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/social/social.service.ts`, `social.controller.ts`
- `apps/api/src/profile/profile.service.ts`
- `apps/api/src/feedback/` (new)
- `apps/api/src/admin/admin.controller.ts`
- `apps/web/src/lib/book-layout.ts`, `cover-image.ts`, `api.ts`
- `apps/web/src/components/books/book-page.tsx` (new)
- `apps/web/src/components/studio/studio-editor.tsx`, `studio-quick-menu.tsx` (new), `rich-text-editor.tsx`
- `apps/web/src/components/reader/reader.tsx`
- `apps/web/src/components/feedback-widget.tsx` (new)
- `apps/web/src/components/section-quick-menu.tsx` (new)
- `apps/web/src/app/admin/feedback/page.tsx` (new)
- `apps/web/src/app/library`, `community`, `profile`, `admin/categories`
- `apps/web/src/app/globals.css`
- `FIX.md` (this file)

### 14.6 Verification Phase 4

- `pnpm --filter @bff/api typecheck` — pass.
- `pnpm --filter @bff/web typecheck` — pass.
- `pnpm exec eslint apps/api/src apps/web/src --max-warnings=0` — pass.
- `pnpm --filter @bff/api test` — 25/25 pass.
- `pnpm --filter @bff/web test` — 21/21 pass.
- `pnpm --filter @bff/web build` — 26 routes, exit 0.
- API smoke: layout `160×240mm`, `grid`, `flip`, `readerDefaultMode=flip` lưu đúng; feedback tạo/đọc đúng; `secondsRead=90` → profile `readingMinutes=1`.
- UI smoke: writer 5 bước, chọn kích thước/nền trang, preview khung trang, editor page, reader 3 chế độ, community hero, profile phút đọc, 0 console error.

### 14.7 Ghi chú

- `RichTextEditor` tiếp tục là editor dùng chung cho Author Studio và Office Writer; Phase 4 chỉ thêm khung trang tùy chọn, không phá luồng Office hiện có.
- Các hiệu ứng chuyển trang tôn trọng `prefers-reduced-motion`.
- Đồng bộ sâu toàn bộ theme/động tác admin và các màn cộng đồng nâng cao có thể tiếp tục ở Phase 5.

---

## 15. Next phases (append below; do not rewrite Phase 1–4)

- Phase 5: Auth + Library + Reader UI/UX nâng cao (bookmark, highlight, reading goals).
- Phase 6: Author Studio + Storage + Office Writer đồng bộ sâu.
- Phase 7: Community feed, notifications, bookmarks, reading lists.
- Phase 8: Admin UI/UX and moderation toàn diện.
- Technical: index books in Meilisearch immediately after publish (current worker reindex is not running in production because Redis is not in compose).


