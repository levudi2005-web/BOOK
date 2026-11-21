# API_DOCUMENTATION.md

> Tài liệu API hiện tại (đã triển khai và chạy). Base URL: `https://freedombook.duckdns.org/api`.

## Authentication

Chưa có (các endpoint catalog hiện public-read).

## Endpoints

### `GET /health`

Kiểm tra trạng thái API + database.

```json
{ "status": "ok", "database": "up" }
```

### `GET /books`

Tham số query (đều tùy chọn):

- `q` — tìm theo title/subtitle/description.
- `category` — slug danh mục.
- `author` — slug tác giả.
- `publisher` — slug nhà xuất bản.
- `year` — năm xuất bản.
- `sort` — `newest` (mặc định), `popular`, `rating`, `title`.
- `page` — mặc định 1.
- `limit` — mặc định 20, tối đa 50.

Response:

```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
```

### `GET /books/:slug`

Response là đối tượng sách + `authors[]` + `categories[]`. Nếu không có → `404`.

### `GET /categories`

```json
{ "data": [ { "category_id": 1, "name": "...", "slug": "...", "description": "..." } ] }
```

### `GET /authors`

```json
{ "data": [ { "author_id": 1, "name": "...", "slug": "...", "bio": "..." } ] }
```

### `GET /publishers`

```json
{ "data": [ { "publisher_id": 1, "name": "...", "slug": "...", "description": "..." } ] }
```

## Bảo mật truy vấn

Tất cả truy vấn dùng prepared statements (`pool.execute`). Service account: `app_bookuser` (chỉ `bookuser` + `SELECT bookadmin.admin_announcements`).
