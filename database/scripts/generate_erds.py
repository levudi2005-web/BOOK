#!/usr/bin/env python3
"""Sinh ERD Mermaid cho tung schema tu information_schema."""
import re
import subprocess
from datetime import datetime

SCHEMAS = ("bookuser", "bookadmin")

def q(sql):
    out = subprocess.run(
        ["mysql", "-N", "-B", "--default-character-set=utf8mb4", "-e", sql],
        check=True, capture_output=True, text=True,
    ).stdout
    return [line.split("\t") for line in out.splitlines() if line]

def mtype(t):
    base = re.sub(r"\(.*", "", t)
    return re.sub(r"[^a-zA-Z0-9_]", "_", base)

for schema in SCHEMAS:
    tables = q(
        "SELECT table_name, table_comment FROM information_schema.tables "
        f"WHERE table_schema='{schema}' AND table_type='BASE TABLE' ORDER BY table_name"
    )
    cols = q(
        "SELECT table_name, column_name, column_type, column_key "
        "FROM information_schema.columns "
        f"WHERE table_schema='{schema}' ORDER BY table_name, ordinal_position"
    )
    fks = q(
        "SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name "
        "FROM information_schema.key_column_usage "
        f"WHERE constraint_schema='{schema}' AND referenced_table_name IS NOT NULL "
        "ORDER BY table_name, constraint_name, ordinal_position"
    )

    by_table = {}
    for t, c, ctype, key in cols:
        by_table.setdefault(t, []).append((c, ctype, key))
    fk_cols = {(t, c) for t, _, c, _, _ in fks}

    lines = [f"%% ERD schema {schema} - BOOKFORFREEDOM (MariaDB 10.11)",
             f"%% Sinh tu dong: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
             "erDiagram"]
    for table, comment in tables:
        label = comment.replace('"', "'")
        lines.append(f'  {table}["{table}<br/>{label}"] {{')
        shown = 0
        for c, ctype, key in by_table.get(table, []):
            marker = ""
            if key == "PRI":
                marker = "PK"
            elif (table, c) in fk_cols:
                marker = "FK"
            elif key == "UNI":
                marker = "UK"
            if marker or c in ("status", "created_at"):
                lines.append(f"    {mtype(ctype)} {c} {marker}".rstrip())
                shown += 1
        if shown == 0:
            lines.append("    bigint placeholder")
        lines.append("  }")
    for table, fk, col, ref_table, ref_col in fks:
        lines.append(f"  {ref_table} ||--o{{ {table} : \"{fk}\"")
    lines.append("")
    out = f"/var/www/BOOKFORFREEDOM/database/diagrams/erd_{schema}.mmd"
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"{out}: {len(tables)} entities, {len(fks)} relationships")
