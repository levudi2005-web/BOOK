import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SecurityModule } from '../security/security.module.js';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
