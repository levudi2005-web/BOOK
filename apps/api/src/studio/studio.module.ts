import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityModule } from '../security/security.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { StudioService } from './studio.service.js';
import { StudioController } from './studio.controller.js';

@Module({
  imports: [DatabaseModule, SecurityModule, StorageModule],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
