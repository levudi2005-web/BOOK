import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MailModule } from '../mail/mail.module.js';
import { SecurityModule } from '../security/security.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [DatabaseModule, SecurityModule, MailModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
