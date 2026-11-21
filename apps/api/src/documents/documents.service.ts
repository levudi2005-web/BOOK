import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

type DocumentRow = {
  document_id: number;
  document_uuid: string;
  owner_user_id: number;
  title: string;
  kind: string;
  content_json: unknown;
  word_count: number;
  created_at: Date | string;
  updated_at: Date | string;
};

function plainText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  return '';
}

function countWords(input: string): number {
  const trimmed = input.replace(/<[^>]*>/g, ' ').trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly db: DatabaseService) {}

  async listDocuments(userId: number) {
    const rows = await this.db.query<DocumentRow[]>(
      `SELECT document_id, document_uuid, owner_user_id, title, kind, word_count, created_at, updated_at
       FROM office_documents
       WHERE owner_user_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId],
    );
    return { data: rows.map((row) => this.toDto(row)) };
  }

  async getDocument(userId: number, documentUuid: string) {
    const row = await this.requireOwned(userId, documentUuid);
    const rows = await this.db.query<{ content_json: unknown }[]>(
      `SELECT content_json FROM office_documents WHERE document_id = ? LIMIT 1`,
      [row.document_id],
    );
    return { ...this.toDto(row), content: rows[0]?.content_json ?? null };
  }

  async createDocument(userId: number, title: string, kind = 'writer') {
    const t = title.trim();
    if (!t || t.length > 500) {
      throw new ForbiddenException('Tiêu đề tài liệu không hợp lệ.');
    }
    const documentUuid = randomUUID();
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO office_documents (document_uuid, owner_user_id, title, kind, content_json, word_count)
       VALUES (?, ?, ?, ?, JSON_OBJECT('text', ''), 0)`,
      [documentUuid, userId, t, kind],
    );
    return { documentUuid, documentId: result.insertId, title: t, kind };
  }

  async updateDocument(userId: number, documentUuid: string, input: { title?: string; content?: unknown }) {
    const row = await this.requireOwned(userId, documentUuid);
    const title = input.title !== undefined ? input.title.trim() : row.title;
    if (!title || title.length > 500) {
      throw new ForbiddenException('Tiêu đề tài liệu không hợp lệ.');
    }
    const content = input.content ?? row.content_json;
    const text = plainText(content);
    await this.db.query(
      `UPDATE office_documents SET title = ?, content_json = ?, word_count = ? WHERE document_id = ?`,
      [title, JSON.stringify(content), countWords(text), row.document_id],
    );
    return { documentUuid, wordCount: countWords(text) };
  }

  async deleteDocument(userId: number, documentUuid: string) {
    const row = await this.requireOwned(userId, documentUuid);
    await this.db.query(`UPDATE office_documents SET deleted_at = NOW(3) WHERE document_id = ?`, [row.document_id]);
    return { status: 'ok' };
  }

  private async requireOwned(userId: number, documentUuid: string): Promise<DocumentRow> {
    const rows = await this.db.query<DocumentRow[]>(
      `SELECT document_id, document_uuid, owner_user_id, title, kind, content_json, word_count, created_at, updated_at
       FROM office_documents
       WHERE document_uuid = ? AND deleted_at IS NULL LIMIT 1`,
      [documentUuid],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }
    if (rows[0].owner_user_id !== userId) {
      throw new ForbiddenException('Không có quyền với tài liệu này.');
    }
    return rows[0];
  }

  private toDto(row: DocumentRow) {
    return {
      documentUuid: row.document_uuid,
      title: row.title,
      kind: row.kind,
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
