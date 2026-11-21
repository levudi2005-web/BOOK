import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';

export type MailMessage = { to: string; subject: string; text: string };

export type MailDelivery = {
  delivered: boolean;
  reason?: 'smtp-not-configured' | 'transport-unavailable' | 'send-failed';
};

type Transport = {
  sendMail(message: Record<string, unknown>): Promise<unknown>;
};

type NodemailerModule = {
  createTransport(options: Record<string, unknown>): Transport;
};

/**
 * Adapter gửi email duy nhất của hệ thống.
 *
 * - `MAIL_TRANSPORT=memory` (chỉ dùng trong test): ghi vào `outbox`, KHÔNG gửi thật.
 * - Mặc định: SMTP qua env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
 *   `SMTP_FROM`, `SMTP_SECURE`). Không hardcode credential, không log credential.
 * - SMTP chưa cấu hình / thiếu transport => trả `delivered: false`; caller KHÔNG
 *   được báo cho người dùng là đã gửi.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Test-only outbox (chỉ hoạt động khi MAIL_TRANSPORT=memory). */
  readonly outbox: MailMessage[] = [];

  isMemoryTransport(): boolean {
    return (process.env.MAIL_TRANSPORT ?? '').toLowerCase() === 'memory';
  }

  async send(message: MailMessage): Promise<MailDelivery> {
    if (this.isMemoryTransport()) {
      this.outbox.push(message);
      return { delivered: true };
    }

    const host = process.env.SMTP_HOST ?? '';
    const from = process.env.SMTP_FROM ?? '';
    if (!host || !from) {
      this.logger.warn('SMTP chưa cấu hình (SMTP_HOST/SMTP_FROM) — email không được gửi.');
      return { delivered: false, reason: 'smtp-not-configured' };
    }

    let nodemailer: NodemailerModule;
    try {
      // Build này là CommonJS: dùng __filename thay cho import.meta.
      const requireFromApp = createRequire(__filename);
      nodemailer = requireFromApp('nodemailer') as NodemailerModule;
    } catch {
      this.logger.warn('Không có module nodemailer — email không được gửi.');
      return { delivered: false, reason: 'transport-unavailable' };
    }

    const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10) || 587;
    const secure = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS ?? '';

    try {
      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
      });
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return { delivered: true };
    } catch {
      // Không log nội dung lỗi SMTP chi tiết để tránh lộ thông tin xác thực.
      this.logger.error('Gửi email thất bại.');
      return { delivered: false, reason: 'send-failed' };
    }
  }
}
