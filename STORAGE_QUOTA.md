# STORAGE_QUOTA.md — Hạn mức 400 MiB

> Quy tắc hạn mức lưu trữ cá nhân (cố định, không thay đổi).

| Giá trị | Quy ước |
|---|---|
| Quota mỗi người | 400 MiB = **419430400 bytes** |

## Quy tắc tính

- Tính bằng **byte thực tế**: bản thảo, nội dung chương, lịch sử phiên bản, DOCX/EPUB/PDF/TXT/MD, ảnh bìa, ảnh minh họa, tài nguyên đính kèm, file xuất bản được giữ lâu dài.
- Metadata nhỏ và template hệ thống **không** tính quota.
- File tạm/cache có TTL, không giữ lâu dài.
- Bản sửa đổi lưu thành phiên bản thật thì **tính** quota.
- Thùng rác: vẫn tính quota cho tới khi xóa vĩnh viễn.

## Công thức

`used_bytes + reserved_bytes + new_upload_bytes <= 419430400`

- Upload thành công: `reserved → used`.
- Upload thất bại/timeout: giải phóng `reserved`.
- Xóa vĩnh viễn: giải phóng `used`.
- Không cho quota âm/sai lệch; có job đối soát metadata ↔ chunks.

## Khi đạt 100%

- Chặn tạo nội dung/upload/file mới làm tăng dung lượng.
- Vẫn cho đọc, tải xuống, quản lý, xóa, giải phóng.
- Không tự xóa dữ liệu cũ; autosave phải cảnh báo rõ ràng, không làm mất nội dung.

## Ngưỡng cảnh báo

| Mức | Hành vi |
|---|---|
| 70% | Nhắc nhở |
| 85% | Cảnh báo sắp đầy |
| 95% | Cảnh báo quan trọng |
| 100% | Hết dung lượng |
