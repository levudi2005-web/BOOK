import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: number,
    input: { kind?: string; subject?: string; message?: string; pagePath?: string },
  ) {
    const kind = ['feedback', 'report', 'idea'].includes(input.kind ?? '')
      ? (input.kind as string)
      : 'feedback';
    const subject = (input.subject ?? '').trim();
    const message = (input.message ?? '').trim();
    if (subject.length < 3 || subject.length > 200) {
      throw new BadRequestException('Tiêu đề phản hồi phải từ 3 đến 200 ký tự.');
    }
    if (message.length < 10 || message.length > 8000) {
      throw new BadRequestException('Nội dung phản hồi phải từ 10 đến 8000 ký tự.');
    }
    const feedbackUuid = randomUUID();
    await this.db.query(
      `INSERT INTO user_feedback (feedback_uuid, user_id, kind, subject, message, page_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [feedbackUuid, userId, kind, subject, message, (input.pagePath ?? '').trim().slice(0, 500) || null],
    );
    return { feedbackUuid, status: 'new' };
  }

  async listMine(userId: number) {
    const rows = await this.db.query<
      {
        feedback_uuid: string;
        kind: string;
        subject: string;
        status: string;
        created_at: Date | string;
      }[]
    >(
      `SELECT feedback_uuid, kind, subject, status, created_at
       FROM user_feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return { data: rows };
  }
}
