import { Injectable } from '@nestjs/common';

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
  reason: 'smtp_not_configured' | 'smtp_transport_not_implemented' | 'sent';
};

@Injectable()
export class EmailService {
  async send(_template: EmailTemplate, _params: EmailParams): Promise<EmailResult> {
    const host = process.env.SMTP_HOST ?? '';
    if (!host) {
      return { delivered: false, reason: 'smtp_not_configured' };
    }
    // Transport (nodemailer) sẽ được bổ sung khi SMTP được cấu hình thật.
    // Không lưu raw token vào log; email chỉ gửi qua transport bảo mật.
    return { delivered: false, reason: 'smtp_transport_not_implemented' };
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
