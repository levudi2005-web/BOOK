# DATABASE_BACKUP_RESTORE.md

> Backup/restore MariaDB (2 schema).

## Backup

```bash
cd /var/www/BOOKFORFREEDOM
docker compose exec -T mariadb sh -c \
  'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb-dump -uroot --single-transaction --routines --events --databases bookuser bookadmin' \
  | gzip -9 > /var/backups/bookforfreedom/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

## Restore (vào DB tạm để kiểm tra)

```bash
gunzip -c backup.sql.gz | \
  docker compose exec -T mariadb sh -c \
  'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb -uroot --default-character-set=utf8mb4'
```

## Nguyên tắc

- Backup trước mọi migration/deploy lớn.
- Không `DROP DATABASE` để restore.
- Định kỳ thử restore vào DB tạm.
- Migration an toàn: idempotent, có rollback, verify trước/sau.
