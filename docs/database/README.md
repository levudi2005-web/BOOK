# Cơ sở dữ liệu

Hai schema MariaDB 10.11: `bookuser` (35 bảng, 1 view) và `bookadmin` (28 bảng, 2 view), 88 khóa ngoại, không FK xuyên database.

Tài liệu đầy đủ nằm trong [`database/docs/README.md`](../../database/docs/README.md):

- [Từ điển dữ liệu](../../database/docs/data_dictionary.md)
- [Quan hệ và ERD](../../database/docs/relationships.md)
- [Tích hợp outbox/inbox](../../database/docs/cross_database_integration.md)
- [Hợp đồng API](../../database/docs/api_contract.md)
- [Bảo mật](../../database/docs/security.md)
- [Cài đặt và vận hành](../../database/docs/installation.md)
- [Hướng dẫn PowerDesigner](../../database/docs/powerdesigner_guide.md)
- [Báo cáo kiểm chứng](../../database/docs/verification_report.md)
- [Báo cáo tổng kết](../../database/docs/final_report.md)

Cài đặt trực tiếp: `cd database/sql && sudo mysql --default-character-set=utf8mb4 < install_all.sql`.

Hoặc chạy bằng Docker: `docker compose up -d mariadb` (MariaDB 10.11 tại `127.0.0.1:3307`, tự cài schema khi volume mới). Chi tiết: [`infra/docker/README.md`](../../infra/docker/README.md).
