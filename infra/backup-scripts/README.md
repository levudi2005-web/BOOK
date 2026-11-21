# Backup Scripts

Không gian cho script sao lưu và phục hồi dữ liệu.
Dự kiến Giai đoạn 0; phụ thuộc cấu hình `@bff/db` và Docker.

## MariaDB trong Docker

```bash
# Backup hai schema (consistent snapshot InnoDB)
docker compose exec -T mariadb sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --events --databases bookuser bookadmin' > backup-$(date +%F).sql

# Restore
docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4' < backup-YYYY-MM-DD.sql
```

Lưu file backup ngoài volume `mariadb_data`; kiểm tra định kỳ bằng cách restore vào database tạm.
