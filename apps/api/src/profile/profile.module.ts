import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityModule } from '../security/security.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
