import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { EmailService } from './email.service.js';

@Module({
  imports: [MailModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
