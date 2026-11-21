import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityModule } from '../security/security.module.js';
import { SocialService } from './social.service.js';
import { SocialController } from './social.controller.js';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
