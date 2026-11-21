import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service.js';

export type EmailTemplate =
  | 'registration_verification'
  | 'password_reset'
  | 'password_change_notification'
  | 'email_change_confirmation'
  | 'security_alert';

export type EmailParams = {
  to: string;
  subject: string;
  text: string;
};

export type EmailResult = {
  delivered: boolean;
  reason: 'sent' | 'smtp-not-configured' | 'transport-unavailable' | 'send-failed';
};

/**
 * Template helper trên **một** transport duy nhất là `MailService`.
 *
 * Trước đây lớp này giả lập kết quả gửi mà không có transport; nay nó chuyển
 * tiếp sang SMTP adapter (hoặc memory adapter trong test) và trả về đúng
 * trạng thái giao nhận. Không có credential nào bị hardcode.
 */
@Injectable()
export class EmailService {
  constructor(private readonly mail: MailService) {}

  async send(_template: EmailTemplate, params: EmailParams): Promise<EmailResult> {
    const delivery = await this.mail.send({ to: params.to, subject: params.subject, text: params.text });
    if (delivery.delivered) return { delivered: true, reason: 'sent' };
    return { delivered: false, reason: delivery.reason ?? 'send-failed' };
  }

  buildVerificationEmail(to: string, link: string): EmailParams {
    return {
      to,
      subject: 'Xác minh tài khoản BOOKFORFREEDOM',
      text: `Vui lòng mở liên kết sau để xác minh email của bạn:\n${link}\n\nLiên kết có hiệu lực trong 24 giờ.`,
    };
  }

  buildPasswordResetEmail(to: string, link: string): EmailParams {
    return {
      to,
      subject: 'Đặt lại mật khẩu BOOKFORFREEDOM',
      text: `Vui lòng mở liên kết sau để đặt lại mật khẩu:\n${link}\n\nLiên kết có hiệu lực trong 15 phút.`,
    };
  }
}
