# API_CONTRACT.md

> Hợp đồng API — kiểu dữ liệu cho các endpoint catalog.

## Book (từ `GET /books`)

```ts
type Book = {
  book_uuid: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  language: string;
  publication_date: string | null;
  page_count: number | null;
  word_count: number | null;
  cover_storage_key: string | null;
  average_rating: number; // decimal trả về string trong MySQL -> frontend Number()
  rating_count: number;
  review_count: number;
  view_count: number;
  download_count: number;
  published_at: string | null;
};
```

## Book detail (`GET /books/:slug`)

`Book` + `authors: Author[]` + `categories: Category[]`.

## Category / Author / Publisher

```ts
type Category = { category_id: number; name: string; slug: string; description: string | null };
type Author = { author_id: number; name: string; slug: string; bio: string | null };
type Publisher = { publisher_id: number; name: string; slug: string; description: string | null };
```

## Lưu ý

- Trường `average_rating` khai báo `DECIMAL` → `mysql2` trả về chuỗi; frontend chuyển `Number()`.
- `cover_storage_key` hiện là string (sẽ trỏ tới `storage_objects` khi SQL Storage được triển khai), chưa phải URL công khai.
