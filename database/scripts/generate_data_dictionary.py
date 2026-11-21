#!/usr/bin/env python3
"""Sinh data dictionary Markdown tu information_schema MariaDB."""
import subprocess
from datetime import datetime

SCHEMAS = ("bookuser", "bookadmin")

def q(sql):
    out = subprocess.run(
        ["mysql", "-N", "-B", "--default-character-set=utf8mb4", "-e", sql],
        check=True, capture_output=True, text=True,
    ).stdout
    return [line.split("\t") for line in out.splitlines() if line]

tables = q(
    "SELECT table_schema, table_name, table_comment, engine, table_collation "
    "FROM information_schema.tables WHERE table_schema IN ('bookuser','bookadmin') "
    "AND table_type='BASE TABLE' ORDER BY table_schema, table_name"
)
columns = q(
    "SELECT table_schema, table_name, ordinal_position, column_name, column_type, "
    "is_nullable, IFNULL(column_default,''), column_key, extra, column_comment "
    "FROM information_schema.columns WHERE table_schema IN ('bookuser','bookadmin') "
    "ORDER BY table_schema, table_name, ordinal_position"
)
fks = q(
    "SELECT constraint_schema, table_name, constraint_name, column_name, "
    "referenced_table_name, referenced_column_name, ordinal_position "
    "FROM information_schema.key_column_usage WHERE constraint_schema IN ('bookuser','bookadmin') "
    "AND referenced_table_name IS NOT NULL ORDER BY constraint_schema, table_name, constraint_name, ordinal_position"
)

cols_by_table = {}
for row in columns:
    cols_by_table.setdefault((row[0], row[1]), []).append(row)

fk_by_table = {}
for row in fks:
    fk_by_table.setdefault((row[0], row[1]), {}).setdefault(row[2], []).append(row)

def esc(v):
    return str(v).replace("|", "\\|").replace("\n", " ")

lines = []
lines.append("# Từ điển dữ liệu BOOKFORFREEDOM (bookuser & bookadmin)")
lines.append("")
lines.append("> Tài liệu sinh tự động từ MariaDB 10.11.14 (information_schema).")
lines.append(f"> Thời điểm sinh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (giờ máy chủ).")
lines.append("> Không sửa trực tiếp: chạy lại `python3 database/scripts/generate_data_dictionary.py`.")
lines.append("")
lines.append("## Tổng quan")
lines.append("")
by_schema = {}
for row in tables:
    by_schema.setdefault(row[0], []).append(row)
base_column_total = 0
for schema in SCHEMAS:
    count = len(by_schema.get(schema, []))
    col_count = sum(len(cols_by_table.get((schema, t[1]), [])) for t in by_schema.get(schema, []))
    base_column_total += col_count
    lines.append(f"- `{schema}`: {count} bảng, {col_count} cột.")
view_column_total = len(columns) - base_column_total
lines.append(
    f"- Tổng cộng: {len(tables)} bảng, {base_column_total} cột bảng vật lý "
    f"(+{view_column_total} cột view), {len(fks)} cột khóa ngoại."
)
lines.append("")
lines.append("Quy ước kiểu dữ liệu: xem [data_types.md](data_types.md). Quan hệ khóa ngoại: xem [relationships.md](relationships.md).")
lines.append("")

for schema in SCHEMAS:
    lines.append(f"## Schema `{schema}`")
    lines.append("")
    for t_schema, table, comment, engine, collation in by_schema.get(schema, []):
        lines.append(f"### `{table}`")
        lines.append("")
        lines.append(f"**Mô tả:** {comment}")
        lines.append("")
        lines.append(f"**Engine:** {engine} · **Collation:** {collation}")
        lines.append("")
        lines.append("| # | Cột | Kiểu | NULL | Mặc định | Khóa | Extra | Mô tả |")
        lines.append("|---:|---|---|:--:|---|---|---|---|")
        for c in cols_by_table.get((schema, table), []):
            _, _, pos, name, ctype, nullable, default, key, extra, ccomment = c[:10]
            lines.append(
                f"| {pos} | `{name}` | `{esc(ctype)}` | {nullable} | "
                f"{('`' + esc(default) + '`') if default else '—'} | {key or '—'} | "
                f"{esc(extra) if extra else '—'} | {esc(ccomment)} |"
            )
        lines.append("")
        table_fks = fk_by_table.get((schema, table), {})
        if table_fks:
            lines.append("**Khóa ngoại:**")
            lines.append("")
            for fk_name, rows in table_fks.items():
                local = ", ".join(f"`{r[3]}`" for r in rows)
                ref = f"`{rows[0][4]}`(" + ", ".join(f"`{r[5]}`" for r in rows) + ")"
                lines.append(f"- `{fk_name}`: {local} → {ref}")
            lines.append("")

lines.append("## Truy vấn kiểm tra nhanh")
lines.append("")
lines.append("```sql")
lines.append("-- Liệt kê bảng và số cột")
lines.append("SELECT table_schema, table_name, COUNT(*) AS column_count")
lines.append("FROM information_schema.columns")
lines.append("WHERE table_schema IN ('bookuser','bookadmin')")
lines.append("GROUP BY table_schema, table_name ORDER BY table_schema, table_name;")
lines.append("```")
lines.append("")
lines.append("---")
lines.append("")
lines.append("Hết data_dictionary.md")
lines.append("")

with open("/var/www/BOOKFORFREEDOM/database/docs/data_dictionary.md", "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
print(f"Wrote {len(lines)} lines")
