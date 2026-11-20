# Deployment

Cấu hình Nginx cho `freedombook.duckdns.org` nằm trong `nginx/`; ứng dụng chạy bằng Docker Compose.
TLS được cấp và tự gia hạn bằng Certbot; cần đặt email liên hệ của chủ domain để nhận thông báo hết hạn.
Giai đoạn 0; phụ thuộc Docker Compose, Nginx và Certbot.
