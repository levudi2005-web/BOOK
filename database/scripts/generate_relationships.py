#!/usr/bin/env python3
"""Sinh relationships.md tu information_schema (FK vat ly) + mo ta lien ket logic."""
import subprocess
from datetime import datetime

SCHEMAS = ("bookuser", "bookadmin")

def q(sql):
    out = subprocess.run(
        ["mysql", "-N", "-B", "--default-character-set=utf8mb4", "-e", sql],
        check=True, capture_output=True, text=True,
    ).stdout
    return [line.split("\t") for line in out.splitlines() if line]

rows = q(
    "SELECT k.constraint_schema, k.table_name, k.constraint_name, "
    "k.column_name, k.referenced_table_name, k.referenced_column_name, k.ordinal_position, "
    "rc.update_rule, rc.delete_rule "
    "FROM information_schema.key_column_usage k "
    "JOIN information_schema.referential_constraints rc "
    "  ON rc.constraint_schema=k.constraint_schema AND rc.constraint_name=k.constraint_name "
    "WHERE k.constraint_schema IN ('bookuser','bookadmin') AND k.referenced_table_name IS NOT NULL "
    "ORDER BY k.constraint_schema, k.table_name, k.constraint_name, k.ordinal_position"
)

grouped = {}
for schema, table, fk, col, ref_table, ref_col, pos, upd, dele in rows:
    grouped.setdefault((schema, table, fk, ref_table, upd, dele), []).append((col, ref_col))

lines = []
lines.append("# Quan hệ dữ liệu BOOKFORFREEDOM")
lines.append("")
lines.append("> Sinh tự động từ MariaDB 10.11.14 (information_schema).")
lines.append(f"> Thời điểm sinh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (giờ máy chủ).")
lines.append(f"> Tổng số khóa ngoại vật lý: **{len(grouped)}**; tổng cột tham gia: **{len(rows)}**.")
lines.append("")

for schema in SCHEMAS:
    items = {k: v for k, v in grouped.items() if k[0] == schema}
    lines.append(f"## Schema `{schema}` — {len(items)} khóa ngoại")
    lines.append("")
    lines.append("| Bảng con | Khóa ngoại | Cột | Bảng cha | ON UPDATE | ON DELETE |")
    lines.append("|---|---|---|---|---|---|")
    for (s, table, fk, ref_table, upd, dele), cols in items.items():
        local = ", ".join(f"`{c}`" for c, _ in cols)
        remote = ", ".join(f"`{r}`" for _, r in cols)
        lines.append(f"| `{table}` | `{fk}` | {local} | `{ref_table}` ({remote}) | {upd} | {dele} |")
    lines.append("")

lines.append("## Liên kết logic xuyên schema (không có FK vật lý)")
lines.append("")
lines.append("MariaDB không hỗ trợ FK xuyên database một cách an toàn khi backup/restore độc lập,")
lines.append("nên mọi liên kết dưới đây được kiểm soát ở tầng dịch vụ và đối soát định kỳ.")
lines.append("")
lines.append("| Nguồn | Đích | Khóa logic | Chiều | Ghi chú |")
lines.append("|---|---|---|---|---|")
logical = [
    ("bookuser.users", "bookadmin.admin_user_notes / user_restrictions / user_verification_reviews", "user_id + user_uuid", "bookadmin → bookuser", "UUID là bản sao để tra cứu khi bookuser không sẵn sàng"),
    ("bookuser.books", "bookadmin.book_rights_reviews", "book_id + book_uuid", "bookadmin → bookuser", "Hồ sơ xét duyệt quyền phân phối"),
    ("bookuser.book_rights", "bookadmin.book_rights_reviews", "rights_uuid / book_uuid", "hai chiều", "Trạng thái duyệt đồng bộ qua sự kiện rights.*"),
    ("bookuser.user_reports", "bookadmin.content_reports", "report_uuid + source_user_report_id", "bookuser → bookadmin", "source_user_report_id UNIQUE chống nhận trùng"),
    ("bookuser.reviews / comments", "bookadmin.content_reports", "target_type + target_id + target_uuid", "bookuser → bookadmin", "target_type ∈ (book, review, comment, user)"),
    ("bookuser.reviews / comments", "bookadmin.moderation_actions", "moderated_by_admin_uuid", "bookadmin → bookuser", "Lưu UUID admin đã kiểm duyệt"),
    ("bookuser.book_rights", "bookadmin.admin_accounts", "verified_by_admin_uuid", "bookadmin → bookuser", "Admin thẩm định quyền"),
    ("bookuser.integration_outbox", "bookadmin.integration_inbox", "event_id (UUID)", "bookuser → bookadmin", "Ít nhất một lần; UNIQUE event_id hai phía"),
    ("bookadmin.integration_outbox", "bookuser.integration_inbox", "event_id (UUID)", "bookadmin → bookuser", "Sự kiện admin → người dùng"),
    ("bookadmin.user_restrictions", "bookadmin.integration_inbox", "source_event_id", "nội bộ bookadmin", "Idempotency khi tiêu thụ sự kiện"),
    ("bookuser.v_public_announcements", "bookadmin.admin_announcements", "announcement_uuid", "view → bảng", "SQL SECURITY INVOKER; cần GRANT SELECT"),
]
for src, dst, key, direction, note in logical:
    lines.append(f"| `{src}` | `{dst}` | {key} | {direction} | {note} |")
lines.append("")
lines.append("## Quy tắc toàn vẹn")
lines.append("")
lines.append("1. Mọi FK vật lý dùng cùng kiểu và cùng collation với khóa cha (đã kiểm tra tự động, xem `verification_report.md`).")
lines.append("2. Bảng con dùng `ON DELETE CASCADE` khi bản ghi con không có ý nghĩa độc lập (token, session, liên kết N-N).")
lines.append("3. Dùng `ON DELETE SET NULL` cho tham chiếu mềm (admin tạo thông báo, người tạo sách) để bảo toàn lịch sử.")
lines.append("4. Dùng `ON DELETE RESTRICT` cho dữ liệu nghiệp vụ cốt lõi (sách, người dùng, đơn vay) — ưu tiên xóa mềm.")
lines.append("5. Liên kết xuyên schema chỉ dùng UUID/ID sao chép; job đối soát định kỳ phát hiện bản ghi mồ côi.")
lines.append("")
lines.append("---")
lines.append("")
lines.append("Hết relationships.md")
lines.append("")

with open("/var/www/BOOKFORFREEDOM/database/docs/relationships.md", "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
print(f"Wrote {len(grouped)} FKs, {len(lines)} lines")
